package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/pkg/db"
)

type Client struct {
	ID      string
	Conn    *websocket.Conn
	WriteMu sync.Mutex
}

// WriteMessage securely writes to the websocket connection
func (c *Client) WriteMessage(messageType int, data []byte) error {
	c.WriteMu.Lock()
	defer c.WriteMu.Unlock()
	c.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
	return c.Conn.WriteMessage(messageType, data)
}

type Room struct {
	ID         string
	Game       string // "minesweeper" or "sudoku"
	Host       string // Player ID who created the room
	Mode       string // "single", "pk_steal", "pk_speed"
	Difficulty string // "easy", "medium", "hard"
	CreatedAt  int64  // Unix timestamp of creation
	Clients    map[string]*Client
	Engine     engine.GameEngine
	mu         sync.Mutex
}

var (
	Rooms = make(map[string]*Room)
	DismissedRooms = make(map[string]time.Time)
	mu    sync.Mutex
)

type RoomSnapshot struct {
	ID          string `json:"id"`
	Game        string `json:"game"`
	Host        string `json:"host"`
	Mode        string `json:"mode"`
	Difficulty  string `json:"difficulty"`
	Status      string `json:"status"`
	CreatedAt   int64  `json:"createdAt"`
	PlayerCount int    `json:"players"`
}

func GetActiveRooms() []RoomSnapshot {
	mu.Lock()
	defer mu.Unlock()
	
	snapshots := make([]RoomSnapshot, 0, len(Rooms))
	for _, r := range Rooms {
		r.mu.Lock() // Safely get fields
		count := len(r.Clients)
		game := r.Game
		host := r.Host
		mode := r.Mode
		diff := r.Difficulty
		var status string
		if r.Engine != nil {
			st := r.Engine.GetStatus()
			if st == engine.StateWaiting {
				status = "waiting"
			} else if st == engine.StateStarting {
				status = "starting"
			} else if st == engine.StatePlaying {
				status = "playing"
			} else {
				status = "finished"
			}
		} else {
			status = "waiting"
		}
		createdAt := r.CreatedAt
		r.mu.Unlock()
		
		snapshots = append(snapshots, RoomSnapshot{
			ID:          r.ID,
			Game:        game,
			Host:        host,
			Mode:        mode,
			Difficulty:  diff,
			Status:      status,
			CreatedAt:   createdAt,
			PlayerCount: count,
		})
	}
	return snapshots
}

func GetOrCreateRoom(roomID, gameId, mode, difficulty, hostId string) (*Room, error) {
	mu.Lock()
	
	// Clean up old dismissed rooms periodically
	now := time.Now()
	for id, t := range DismissedRooms {
		if now.Sub(t) > 5*time.Minute {
			delete(DismissedRooms, id)
		}
	}

	if _, dismissed := DismissedRooms[roomID]; dismissed {
		mu.Unlock()
		return nil, fmt.Errorf("room has been dismissed")
	}

	if r, exists := Rooms[roomID]; exists {
		mu.Unlock()
		return r, nil
	}

	if mode == "" {
		mode = "single" // default
	}

	engineKey := gameId + "_" + mode
	if mode == "single" {
		engineKey = gameId + "_single"
	}

	eng, err := engine.CreateEngine(engineKey)
	if err != nil {
		log.Printf("Failed to create engine for %s: %v", engineKey, err)
		// fallback to single mode if engine not found
		eng, _ = engine.CreateEngine(gameId + "_single")
	}

	r := &Room{
		ID:         roomID,
		Game:       gameId,
		Host:       hostId, // Explicitly set host here, crucial for preserving host on backend restarts
		Mode:       mode,
		Difficulty: difficulty,
		CreatedAt:  time.Now().Unix(),
		Clients:    make(map[string]*Client),
		Engine:     eng,
	}
	
	options := getGameOptions(gameId, mode, difficulty)

	r.Engine.InitGame(options)
	
	// Inject broadcaster so engine can asynchronously trigger state updates to clients
	if asyncEng, ok := r.Engine.(interface{ SetBroadcaster(func()) }); ok {
		asyncEng.SetBroadcaster(r.BroadcastState)
	}

	Rooms[roomID] = r
	mu.Unlock()
	return r, nil
}

// getGameOptions fetches the database config and merges it with standard options
func getGameOptions(gameId, mode, difficulty string) map[string]interface{} {
	options := map[string]interface{}{
		"mode":       mode,
		"difficulty": difficulty,
	}
	var gameConfig domain.GameConfig
	if err := db.DB.First(&gameConfig, "id = ?", gameId).Error; err == nil {
		if gameConfig.Config != "" {
			var configData map[string]interface{}
			if err := json.Unmarshal([]byte(gameConfig.Config), &configData); err == nil {
				for k, v := range configData {
					options[k] = v // Merge DB config into options
				}
			}
		}
	}
	return options
}

func (r *Room) AddClient(client *Client) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Reject if game started and player is new
	if r.Engine.GetStatus() != engine.StateWaiting && !r.Engine.HasPlayer(client.ID) {
		return fmt.Errorf("game already started")
	}
	
	if r.Host == "" {
		r.Host = client.ID // Fallback if hostId was not provided
	}
	
	r.Clients[client.ID] = client
	r.Engine.AddPlayer(client.ID)
	
	// Do not auto-start here. Host must click start.
	
	go r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate() // Notify lobby player count changed
	return nil
}

func (r *Room) RemoveClient(client *Client) {
	r.mu.Lock()
	
	// Only remove if this exact client connection is still the active one
	if existing, ok := r.Clients[client.ID]; ok && existing == client {
		delete(r.Clients, client.ID)
		
		// If game hasn't started, completely remove them so the slot frees up
		// If game has started, do NOT remove them from engine so they can reconnect!
		if r.Engine.GetStatus() == engine.StateWaiting {
			r.Engine.RemovePlayer(client.ID)
		}
	} else {
		// This was an old connection closing after a new one already took its place
		r.mu.Unlock()
		return
	}
	
	// Destroy room if empty
	isEmpty := len(r.Clients) == 0
	
	// Host migration with delay
	if !isEmpty && r.Host == client.ID {
		go func(roomID, oldHost string) {
			time.Sleep(15 * time.Second)
			mu.Lock()
			if room, exists := Rooms[roomID]; exists {
				room.mu.Lock()
				if room.Host == oldHost {
					if _, stillHere := room.Clients[oldHost]; !stillHere {
						for id := range room.Clients {
							room.Host = id
							break
						}
						room.BroadcastStateLocked()
					}
				}
				room.mu.Unlock()
			}
			mu.Unlock()
		}(r.ID, client.ID)
	}

	mode := r.Mode
	roomID := r.ID
	r.mu.Unlock()

	if isEmpty {
		if mode == "single" {
			mu.Lock()
			delete(Rooms, roomID)
			mu.Unlock()
			go Lobby.BroadcastLobbyUpdate()
		} else {
			// Delay destruction for PK rooms to allow reconnecting after refresh
			go Lobby.BroadcastLobbyUpdate() // broadcast 0 players
			go func() {
				time.Sleep(60 * time.Second)
				mu.Lock()
				if room, exists := Rooms[roomID]; exists {
					room.mu.Lock()
					if len(room.Clients) == 0 {
						room.mu.Unlock()
						delete(Rooms, roomID)
						go Lobby.BroadcastLobbyUpdate()
					} else {
						room.mu.Unlock()
					}
				}
				mu.Unlock()
			}()
		}
	} else {
		r.BroadcastState()
		go Lobby.BroadcastLobbyUpdate() // Notify lobby player count changed
	}
}

func (r *Room) HandleMessage(clientID string, payload []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var baseMsg map[string]interface{}
	if err := json.Unmarshal(payload, &baseMsg); err == nil {
		if msgType, ok := baseMsg["type"].(string); ok {
			if msgType == "restart_game" {
				log.Printf("Received restart_game from %s, Room Host is %s", clientID, r.Host)
				if clientID == r.Host {
					log.Printf("Restarting room %s", r.ID)
					engineKey := r.Game + "_" + r.Mode
					if r.Mode == "single" {
						engineKey = r.Game + "_single"
					}
					
					eng, err := engine.CreateEngine(engineKey)
					if err != nil {
						log.Printf("Failed to create engine for restart: %v", err)
						return
					}
					eng.InitGame(map[string]interface{}{"mode": r.Mode, "difficulty": r.Difficulty})
					for id := range r.Clients {
						eng.AddPlayer(id)
					}
					
					if asyncEng, ok := eng.(interface{ SetBroadcaster(func()) }); ok {
						asyncEng.SetBroadcaster(r.BroadcastState)
					}
					
					r.Engine = eng
					r.BroadcastStateLocked()
					log.Printf("Room %s restarted successfully", r.ID)
				}
				return
			} else if msgType == "dismiss_room" {
				if clientID == r.Host {
					go DismissRoom(r.ID, clientID)
				}
				return
			} else if msgType == "leave_game" {
				if r.Engine.GetStatus() == engine.StateWaiting {
					r.Engine.RemovePlayer(clientID)
				} else {
					r.Engine.HandleAction(clientID, "forfeit", []byte(`{"action":"forfeit"}`))
				}
				r.BroadcastStateLocked()
				return
			} else if msgType == "change_game" {
				if clientID == r.Host {
					gameId, _ := baseMsg["game"].(string)
					mode, _ := baseMsg["mode"].(string)
					diff, _ := baseMsg["difficulty"].(string)

					if gameId != "" {
						log.Printf("Host %s changing game in room %s to %s (mode: %s, diff: %s)", clientID, r.ID, gameId, mode, diff)
						
						// Create new engine
						engineKey := gameId + "_" + mode
						if mode == "single" {
							engineKey = gameId + "_single"
						}
						
						eng, err := engine.CreateEngine(engineKey)
						if err != nil {
							log.Printf("Failed to create engine %s: %v", engineKey, err)
							return
						}
						
						// Update room state
						r.Game = gameId
						r.Mode = mode
						r.Difficulty = diff
						
						eng.InitGame(getGameOptions(gameId, mode, diff))
						
						for id := range r.Clients {
							eng.AddPlayer(id)
						}
						
						if asyncEng, ok := eng.(interface{ SetBroadcaster(func()) }); ok {
							asyncEng.SetBroadcaster(r.BroadcastState)
						}
						
						r.Engine = eng
						
						// Broadcast room_game_changed so frontend can route
						msg := []byte(fmt.Sprintf(`{"type": "room_game_changed", "game": "%s", "mode": "%s", "difficulty": "%s", "roomId": "%s", "host": "%s"}`, gameId, mode, diff, r.ID, r.Host))
						for _, c := range r.Clients {
							c.WriteMessage(websocket.TextMessage, msg)
						}
						
						go Lobby.BroadcastLobbyUpdate()
					}
				}
				return
			}
		}
	}

	// Handle game action
	_, err := r.Engine.HandleAction(clientID, "", payload) // Action type is inside payload
	if err != nil {
		log.Printf("Action Error from %s: %v", clientID, err)
		// Optionally send error to specific client
		return
	}

	r.BroadcastStateLocked()
}

func (r *Room) BroadcastState() {
	go func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.BroadcastStateLocked()
	}()
}

func (r *Room) BroadcastStateLocked() {
	state := r.Engine.GetState()
	log.Printf("[DEBUG] Room %s broadcasting state: %+v to %d clients. Host: %s", r.ID, state, len(r.Clients), r.Host)
	data, err := json.Marshal(map[string]interface{}{
		"type":  "gameState",
		"state": state,
		"host":  r.Host,
	})
	if err != nil {
		log.Printf("Failed to marshal state: %v", err)
		return
	}

	for id, client := range r.Clients {
		err := client.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			log.Printf("Failed to send message to %s: %v", client.ID, err)
		} else {
			log.Printf("[DEBUG] Successfully sent state to client %s", id)
		}
	}
}

func DismissRoom(roomID string, clientID string) {
	mu.Lock()
	r, exists := Rooms[roomID]
	mu.Unlock()

	if !exists {
		return
	}

	r.mu.Lock()
	isHost := r.Host == clientID
	r.mu.Unlock()

	if isHost {
		mu.Lock()
		delete(Rooms, roomID)
		DismissedRooms[roomID] = time.Now()
		mu.Unlock()
		
		go Lobby.BroadcastLobbyUpdate()

		// Disconnect all clients in this room gracefully
		msg := []byte(`{"type": "room_dismissed"}`)
		r.mu.Lock()
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, msg)
		}
		r.mu.Unlock()
	}
}
