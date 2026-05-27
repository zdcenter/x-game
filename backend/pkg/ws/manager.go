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
	ID   string
	Conn *websocket.Conn
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
			status = string(r.Engine.GetStatus())
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

func GetOrCreateRoom(roomID, gameId, mode, difficulty, hostId string) *Room {
	mu.Lock()
	if r, exists := Rooms[roomID]; exists {
		mu.Unlock()
		return r
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
	
	// Fetch game config to get penalty seconds
	penaltySeconds := 3
	var gameConfig domain.GameConfig
	if err := db.DB.First(&gameConfig, "id = ?", "minesweeper").Error; err == nil {
		if gameConfig.Config != "" {
			var configData map[string]interface{}
			if err := json.Unmarshal([]byte(gameConfig.Config), &configData); err == nil {
				if penalty, ok := configData["penaltySeconds"].(float64); ok {
					penaltySeconds = int(penalty)
				}
			}
		}
	}

	r.Engine.InitGame(map[string]interface{}{"mode": mode, "difficulty": difficulty, "penaltySeconds": penaltySeconds})
	
	// Inject broadcaster so engine can asynchronously trigger state updates to clients
	if asyncEng, ok := r.Engine.(interface{ SetBroadcaster(func()) }); ok {
		asyncEng.SetBroadcaster(r.BroadcastState)
	}

	Rooms[roomID] = r
	mu.Unlock()
	return r
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
	
	go r.BroadcastStateLocked()
	go Lobby.BroadcastLobbyUpdate() // Notify lobby player count changed
	return nil
}

func (r *Room) RemoveClient(clientID string) {
	r.mu.Lock()
	delete(r.Clients, clientID)
	r.Engine.RemovePlayer(clientID)
	
	// Destroy room if empty
	isEmpty := len(r.Clients) == 0
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
					// Delete the room globally
					mu.Lock()
					delete(Rooms, r.ID)
					mu.Unlock()
					go Lobby.BroadcastLobbyUpdate()

					// Disconnect all clients in this room gracefully
					msg := []byte(`{"type": "room_dismissed"}`)
					for _, c := range r.Clients {
						c.Conn.WriteMessage(websocket.TextMessage, msg)
						// Frontend will handle disconnection
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
	r.mu.Lock()
	defer r.mu.Unlock()
	r.BroadcastStateLocked()
}

func (r *Room) BroadcastStateLocked() {
	state := r.Engine.GetState()
	data, err := json.Marshal(map[string]interface{}{
		"type":  "gameState",
		"state": state,
		"host":  r.Host,
	})
	if err != nil {
		log.Printf("Failed to marshal state: %v", err)
		return
	}

	for _, client := range r.Clients {
		err := client.Conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			log.Printf("Failed to send message to %s: %v", client.ID, err)
		}
	}
}
