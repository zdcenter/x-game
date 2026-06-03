package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
)

// LobbyPlayer represents a player connected to the global lobby
type LobbyPlayer struct {
	ID       string // This is the unique connection ID (e.g. remote address)
	PlayerID string // The actual user ID
	Username string
	Conn     *websocket.Conn
	Status   string // "idle", "playing", "spectating"
	mu       sync.Mutex
}

// GlobalLobby manages all online players and available rooms
type GlobalLobby struct {
	Players map[string]*LobbyPlayer
	mu      sync.RWMutex
}

var Lobby = &GlobalLobby{
	Players: make(map[string]*LobbyPlayer),
}

// AddPlayer adds a player to the lobby and broadcasts the update
func (l *GlobalLobby) AddPlayer(player *LobbyPlayer) {
	l.mu.Lock()
	l.Players[player.ID] = player
	l.mu.Unlock()
	l.BroadcastLobbyUpdate()
}

// RemovePlayer removes a player from the lobby and broadcasts the update
func (l *GlobalLobby) RemovePlayer(playerID string) {
	l.mu.Lock()
	delete(l.Players, playerID)
	l.mu.Unlock()
	l.BroadcastLobbyUpdate()
}

// UpdatePlayerStatus updates a player's status
func (l *GlobalLobby) UpdatePlayerStatus(playerID string, status string) {
	l.mu.Lock()
	if p, exists := l.Players[playerID]; exists {
		p.Status = status
	}
	l.mu.Unlock()
	l.BroadcastLobbyUpdate()
}

// BroadcastLobbyUpdate sends the current lobby state to all connected lobby players
func (l *GlobalLobby) BroadcastLobbyUpdate() {
	l.mu.RLock()
	defer l.mu.RUnlock()

	// Build players list
	var players []map[string]interface{}
	for _, p := range l.Players {
		players = append(players, map[string]interface{}{
			"id":       p.PlayerID,
			"username": p.Username,
			"status":   p.Status,
		})
	}

	// Build active rooms list
	var activeRooms []map[string]interface{}
	safeRooms := GetActiveRooms()
	for _, r := range safeRooms {
		activeRooms = append(activeRooms, map[string]interface{}{
			"id":         r.ID,
			"game":       r.Game,
			"host":       r.Host,
			"players":    r.PlayerCount,
			"mode":       r.Mode,
			"difficulty": r.Difficulty,
			"status":     r.Status,
			"createdAt":  r.CreatedAt,
		})
	}

	log.Printf("Broadcasting %d active rooms", len(activeRooms))
	payload, err := json.Marshal(map[string]interface{}{
		"type":    "lobby_update",
		"players": players,
		"rooms":   activeRooms,
	})
	if err != nil {
		log.Printf("Failed to marshal lobby update: %v", err)
		return
	}

	for _, p := range l.Players {
		if p.Conn != nil {
			p.mu.Lock()
			p.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
			err := p.Conn.WriteMessage(websocket.TextMessage, payload)
			p.mu.Unlock()
			if err != nil {
				log.Printf("Failed to write to lobby WS: %v", err)
			}
		}
	}
}

// BroadcastMessage sends an arbitrary JSON message to all connected lobby players
func (l *GlobalLobby) BroadcastMessage(msg interface{}) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal lobby broadcast message: %v", err)
		return
	}

	for _, p := range l.Players {
		if p.Conn != nil {
			p.mu.Lock()
			p.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
			err := p.Conn.WriteMessage(websocket.TextMessage, payload)
			p.mu.Unlock()
			if err != nil {
				log.Printf("Failed to write broadcast to lobby WS: %v", err)
			}
		}
	}
}
