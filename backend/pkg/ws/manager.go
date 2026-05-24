package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/internal/engine/minesweeper"
)

type Client struct {
	ID   string
	Conn *websocket.Conn
}

type Room struct {
	ID         string
	Host       string // Player ID who created the room
	Mode       string // "single", "pk_steal", "pk_speed"
	Difficulty string // "easy", "medium", "hard"
	Status     string // "waiting", "playing", "finished"
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
	Host        string `json:"host"`
	Mode        string `json:"mode"`
	Difficulty  string `json:"difficulty"`
	Status      string `json:"status"`
	PlayerCount int    `json:"players"`
}

func GetActiveRooms() []RoomSnapshot {
	mu.Lock()
	defer mu.Unlock()
	
	snapshots := make([]RoomSnapshot, 0, len(Rooms))
	for _, r := range Rooms {
		r.mu.Lock() // Safely get player count
		count := len(r.Clients)
		r.mu.Unlock()
		
		snapshots = append(snapshots, RoomSnapshot{
			ID:          r.ID,
			Host:        r.Host,
			Mode:        r.Mode,
			Difficulty:  r.Difficulty,
			Status:      r.Status,
			PlayerCount: count,
		})
	}
	return snapshots
}

func GetOrCreateRoom(roomID string, mode string, difficulty string) *Room {
	mu.Lock()
	
	if room, exists := Rooms[roomID]; exists {
		mu.Unlock()
		return room
	}

	if mode == "" {
		mode = "single" // default
	}

	var eng engine.GameEngine
	if mode == "pk_speed" {
		eng = &minesweeper.SpeedEngine{}
	} else {
		eng = &minesweeper.MinesweeperEngine{}
	}

	r := &Room{
		ID:         roomID,
		Host:       "", // Will be set by the first client who joins
		Mode:       mode,
		Difficulty: difficulty,
		Status:     "waiting",
		Clients:    make(map[string]*Client),
		Engine:     eng,
	}
	r.Engine.InitGame(map[string]interface{}{"mode": mode, "difficulty": difficulty})
	Rooms[roomID] = r
	mu.Unlock() // Unlock before broadcasting
	
	Lobby.BroadcastLobbyUpdate() // Notify lobby of new room
	return r
}

func (r *Room) AddClient(client *Client) {
	r.mu.Lock()
	
	if len(r.Clients) == 0 {
		r.Host = client.ID // First player becomes the host
	}
	
	r.Clients[client.ID] = client
	r.Engine.AddPlayer(client.ID)
	
	// Do not auto-start here. Host must click start.
	
	r.mu.Unlock()
	r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate() // Notify lobby player count changed
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
				if clientID == r.Host && (r.Status == "finished" || r.Mode == "single") {
					var eng engine.GameEngine
					if r.Mode == "pk_speed" {
						eng = &minesweeper.SpeedEngine{}
					} else {
						eng = &minesweeper.MinesweeperEngine{}
					}
					eng.InitGame(map[string]interface{}{"mode": r.Mode, "difficulty": r.Difficulty})
					for id := range r.Clients {
						eng.AddPlayer(id)
					}
					r.Engine = eng

					if r.Mode != "single" {
						r.Status = "waiting"
					}
					r.BroadcastState()
				}
			} else if msgType == "start_game" {
				if clientID == r.Host && r.Status == "waiting" && len(r.Clients) >= 2 {
					r.Status = "starting"
					// Common interface for both engines
					type startableEngine interface {
						SetStarting()
						StartPlayingAndRevealSafe()
					}
					
					if eng, ok := r.Engine.(startableEngine); ok {
						eng.SetStarting()
						go func() {
							time.Sleep(3 * time.Second)
							r.mu.Lock()
							if r.Status == "starting" {
								r.Status = "playing"
								eng.StartPlayingAndRevealSafe()
							}
							r.mu.Unlock()
							r.BroadcastState()
						}()
					}
					r.BroadcastStateLocked()
				}
				return
			} else if msgType == "dismiss_room" {
				if clientID == r.Host {
					// Delete the room globally
					mu.Lock()
					delete(Rooms, r.ID)
					mu.Unlock()
					go Lobby.BroadcastLobbyUpdate()

					// Disconnect all clients in this room
					for _, c := range r.Clients {
						c.Conn.Close()
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
