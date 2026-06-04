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
	IsReady bool
	WriteMu sync.Mutex
}

// WriteMessage securely writes to the websocket connection
func (c *Client) WriteMessage(messageType int, data []byte) error {
	c.WriteMu.Lock()
	defer c.WriteMu.Unlock()
	c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return c.Conn.WriteMessage(messageType, data)
}

type Room struct {
	ID            string
	Game          string // "minesweeper" or "sudoku"
	Host          string // Player ID who created the room
	Mode          string // "single", "pk_steal", "pk_speed"
	Difficulty    string // "easy", "medium", "hard"
	Password      string // Optional 4-digit password (empty = public room)
	CreatedAt     int64  // Unix timestamp of creation
	GameChangedAt int64  // Unix timestamp of last game change to prevent disconnect races
	Clients       map[string]*Client
	Engine        engine.GameEngine
	KickedPlayers map[string]time.Time // playerID -> kick timestamp for cooldown
	mu            sync.Mutex
}

var (
	Rooms          = make(map[string]*Room)
	DismissedRooms = make(map[string]time.Time)
	mu             sync.Mutex
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
	HasPassword bool   `json:"hasPassword"`
}

func GetActiveRooms() []RoomSnapshot {
	// Step 1: Copy room pointers under global lock (fast)
	mu.Lock()
	roomsCopy := make([]*Room, 0, len(Rooms))
	for _, r := range Rooms {
		roomsCopy = append(roomsCopy, r)
	}
	mu.Unlock()

	// Step 2: Read each room's state under its own lock (no global lock held)
	snapshots := make([]RoomSnapshot, 0, len(roomsCopy))
	for _, r := range roomsCopy {
		r.mu.Lock()
		count := len(r.Clients)
		game := r.Game
		host := r.Host
		mode := r.Mode
		diff := r.Difficulty
		hasPassword := r.Password != ""
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
			HasPassword: hasPassword,
		})
	}
	return snapshots
}

// CreateRoom creates a new room. Returns error if the room already exists or was recently dismissed.
func CreateRoom(roomID, gameId, mode, difficulty, hostId, password string) (*Room, error) {
	mu.Lock()
	defer mu.Unlock()

	// Clean up old dismissed rooms periodically
	cleanDismissedRooms()

	if _, dismissed := DismissedRooms[roomID]; dismissed {
		return nil, fmt.Errorf("room has been dismissed")
	}

	if _, exists := Rooms[roomID]; exists {
		return nil, fmt.Errorf("room already exists")
	}

	if mode == "" {
		mode = "single"
	}

	engineKey := gameId + "_" + mode
	if mode == "single" {
		engineKey = gameId + "_single"
	}

	eng, err := engine.CreateEngine(engineKey)
	if err != nil {
		log.Printf("Failed to create engine for %s: %v", engineKey, err)
		eng, _ = engine.CreateEngine(gameId + "_single")
	}

	r := &Room{
		ID:            roomID,
		Game:          gameId,
		Host:          hostId,
		Mode:          mode,
		Difficulty:    difficulty,
		Password:      password,
		CreatedAt:     time.Now().Unix(),
		Clients:       make(map[string]*Client),
		Engine:        eng,
		KickedPlayers: make(map[string]time.Time),
	}

	options := getGameOptions(gameId, mode, difficulty)
	r.Engine.InitGame(options)

	if asyncEng, ok := r.Engine.(interface{ SetBroadcaster(func()) }); ok {
		asyncEng.SetBroadcaster(r.BroadcastState)
	}

	Rooms[roomID] = r
	return r, nil
}

// JoinRoom returns an existing room. Returns error if the room does not exist.
func JoinRoom(roomID string) (*Room, error) {
	mu.Lock()
	defer mu.Unlock()

	if _, dismissed := DismissedRooms[roomID]; dismissed {
		return nil, fmt.Errorf("room has been dismissed")
	}

	r, exists := Rooms[roomID]
	if !exists {
		return nil, fmt.Errorf("room not found")
	}

	return r, nil
}

// GetOrCreateRoom is a backward-compatible wrapper. Prefer CreateRoom/JoinRoom.
func GetOrCreateRoom(roomID, gameId, mode, difficulty, hostId string) (*Room, error) {
	// Try to join first
	r, err := JoinRoom(roomID)
	if err == nil {
		return r, nil
	}

	// If room doesn't exist AND hostId matches (meaning the caller is the creator), create it
	if hostId != "" {
		return CreateRoom(roomID, gameId, mode, difficulty, hostId, "")
	}

	return nil, fmt.Errorf("room not found")
}

// cleanDismissedRooms removes entries older than 5 minutes. Must be called with mu held.
func cleanDismissedRooms() {
	now := time.Now()
	for id, t := range DismissedRooms {
		if now.Sub(t) > 5*time.Minute {
			delete(DismissedRooms, id)
		}
	}
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
					options[k] = v
				}
			}
		}
	}
	return options
}

func (r *Room) AddClient(client *Client, password string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check password (host always skips password check)
	if r.Password != "" && client.ID != r.Host && password != r.Password {
		return fmt.Errorf("wrong_password")
	}

	// Check kick cooldown (30 seconds)
	if kickTime, kicked := r.KickedPlayers[client.ID]; kicked {
		if time.Since(kickTime) < 30*time.Second {
			remaining := 30 - int(time.Since(kickTime).Seconds())
			return fmt.Errorf("kick_cooldown:%d", remaining)
		}
		delete(r.KickedPlayers, client.ID)
	}

	// Reject if game started and player is new
	if r.Engine.GetStatus() != engine.StateWaiting && !r.Engine.HasPlayer(client.ID) {
		return fmt.Errorf("game already started")
	}

	if r.Host == "" {
		r.Host = client.ID
	}

	// Preserve IsReady state on reconnect
	if old, exists := r.Clients[client.ID]; exists {
		client.IsReady = old.IsReady
	}

	r.Clients[client.ID] = client
	r.Engine.AddPlayer(client.ID)

	go r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate()
	return nil
}

func (r *Room) RemoveClient(client *Client) {
	r.mu.Lock()

	// Only remove if this exact client connection is still the active one
	if existing, ok := r.Clients[client.ID]; ok && existing == client {
		delete(r.Clients, client.ID)

		// If game hasn't started, completely remove them so the slot frees up
		if r.Engine.GetStatus() == engine.StateWaiting {
			r.Engine.RemovePlayer(client.ID)
		}
	} else {
		// This was an old connection closing after a new one already took its place
		r.mu.Unlock()
		return
	}

	isEmpty := len(r.Clients) == 0
	isSwitchingGame := time.Now().Unix()-r.GameChangedAt < 5
	isHostLeaving := r.Host == client.ID && !isSwitchingGame
	gameStatus := r.Engine.GetStatus()

	// Clean up ready state
	client.IsReady = false

	roomID := r.ID
	r.mu.Unlock()

	if isEmpty && !isSwitchingGame {
		// Room is empty: destroy immediately
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
		go Lobby.BroadcastLobbyUpdate()
	} else if isHostLeaving {
		if gameStatus == engine.StateWaiting || gameStatus == engine.StateFinished {
			// Not in active game: transfer host immediately
			r.transferHost(client.ID)
		} else {
			// Game in progress: give host 30 seconds to reconnect, then transfer
			log.Printf("Host %s disconnected from active game in room %s, starting 30s grace period", client.ID, roomID)
			go func(rID string, hID string) {
				time.Sleep(30 * time.Second)

				mu.Lock()
				room, exists := Rooms[rID]
				mu.Unlock()

				if !exists {
					return
				}

				room.mu.Lock()
				_, hostConnected := room.Clients[hID]
				isStillHost := room.Host == hID
				room.mu.Unlock()

				if isStillHost && !hostConnected {
					log.Printf("Host %s failed to reconnect to room %s within 30 seconds. Transferring host.", hID, rID)
					room.transferHost(hID)
				}
			}(roomID, client.ID)

			r.BroadcastState()
			go Lobby.BroadcastLobbyUpdate()
		}
	} else if !isEmpty {
		r.BroadcastState()
		go Lobby.BroadcastLobbyUpdate()
	}
}

// transferHost picks the next available client as host. If no clients remain, dismisses the room.
func (r *Room) transferHost(oldHostID string) {
	r.mu.Lock()
	roomID := r.ID

	if len(r.Clients) == 0 {
		r.mu.Unlock()
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
		go Lobby.BroadcastLobbyUpdate()
		return
	}

	// Pick the first connected client as new host
	var newHost string
	for id := range r.Clients {
		newHost = id
		break
	}

	r.Host = newHost
	log.Printf("Room %s: host transferred from %s to %s", roomID, oldHostID, newHost)

	// Notify all clients about host change
	msg := []byte(fmt.Sprintf(`{"type": "host_changed", "newHost": "%s", "oldHost": "%s"}`, newHost, oldHostID))
	for _, c := range r.Clients {
		c.WriteMessage(websocket.TextMessage, msg)
	}

	r.mu.Unlock()

	r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate()
}

func (r *Room) HandleMessage(clientID string, payload []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var baseMsg map[string]interface{}
	if err := json.Unmarshal(payload, &baseMsg); err == nil {
		if msgType, ok := baseMsg["type"].(string); ok {
			// Respond to application-level ping with pong
			if msgType == "ping" {
				if c, ok := r.Clients[clientID]; ok {
					c.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
				}
				return
			}

			if msgType == "restart_game" {
				if clientID == r.Host {
					log.Printf("Restarting room %s via engine", r.ID)
					r.Engine.HandleAction(clientID, "restart_game", payload)
					for _, c := range r.Clients {
						c.IsReady = false
					}
					r.BroadcastStateLocked()
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

						engineKey := gameId + "_" + mode
						if mode == "single" {
							engineKey = gameId + "_single"
						}

						eng, err := engine.CreateEngine(engineKey)
						if err != nil {
							log.Printf("Failed to create engine %s: %v", engineKey, err)
							return
						}

						r.Game = gameId
						r.Mode = mode
						r.Difficulty = diff
						r.GameChangedAt = time.Now().Unix()

						eng.InitGame(getGameOptions(gameId, mode, diff))

						for id := range r.Clients {
							eng.AddPlayer(id)
						}

						if asyncEng, ok := eng.(interface{ SetBroadcaster(func()) }); ok {
							asyncEng.SetBroadcaster(r.BroadcastState)
						}

						r.Engine = eng

						// Reset all ready states on game change
						for _, c := range r.Clients {
							c.IsReady = false
						}

						msg := []byte(fmt.Sprintf(`{"type": "room_game_changed", "game": "%s", "mode": "%s", "difficulty": "%s", "roomId": "%s", "host": "%s"}`, gameId, mode, diff, r.ID, r.Host))
						for _, c := range r.Clients {
							c.WriteMessage(websocket.TextMessage, msg)
						}

						go Lobby.BroadcastLobbyUpdate()
					}
				}
				return
			} else if msgType == "ready" {
				log.Printf("Received ready from %s in room %s", clientID, r.ID)
				if c, ok := r.Clients[clientID]; ok {
					c.IsReady = true
					r.BroadcastStateLocked()
				}
				return
			} else if msgType == "cancel_ready" {
				if c, ok := r.Clients[clientID]; ok {
					c.IsReady = false
					r.BroadcastStateLocked()
				}
				return
			} else if msgType == "kick_player" {
				if clientID == r.Host {
					if targetID, ok := baseMsg["target"].(string); ok && targetID != "" && targetID != r.Host {
						if targetClient, exists := r.Clients[targetID]; exists {
							// Record kick timestamp for cooldown
							r.KickedPlayers[targetID] = time.Now()
							targetClient.WriteMessage(websocket.TextMessage, []byte(`{"type": "kicked"}`))
							targetClient.Conn.Close()
						}
					}
				}
				return
			}
		}
	}

	// Intercept "start" action to enforce readiness in PK modes
	var actionMsg struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &actionMsg); err == nil && actionMsg.Action == "start" {

		if clientID != r.Host {
			log.Printf("Non-host %s tried to start the game", clientID)
			return
		}
		if r.Mode != "single" {
			for _, c := range r.Clients {
				if c.ID != r.Host && !c.IsReady {
					log.Printf("Cannot start game: player %s is not ready", c.ID)
					return
				}
			}
		}
	}

	// Handle game action
	_, err := r.Engine.HandleAction(clientID, actionMsg.Action, payload)
	if err != nil {
		log.Printf("Action Error from %s: %v", clientID, err)
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

	readyPlayers := make(map[string]bool)
	for id, client := range r.Clients {
		readyPlayers[id] = client.IsReady
	}

	data, err := json.Marshal(map[string]interface{}{
		"type":         "gameState",
		"state":        state,
		"host":         r.Host,
		"readyPlayers": readyPlayers,
	})
	if err != nil {
		log.Printf("Failed to marshal state: %v", err)
		return
	}

	for _, client := range r.Clients {
		if err := client.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("Failed to send message to %s: %v", client.ID, err)
		}
	}
}

func DismissRoom(roomID string, clientID string) {
	mu.Lock()
	r, exists := Rooms[roomID]
	if !exists {
		mu.Unlock()
		return
	}
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
