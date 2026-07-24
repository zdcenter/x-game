package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/simulator"
)

// LobbyPlayer represents a player connected to the global lobby
type LobbyPlayer struct {
	ID          string // This is the unique connection ID (e.g. remote address)
	PlayerID    string // The actual user ID
	Username    string
	IP          string
	ConnectedAt int64
	Conn        *websocket.Conn
	Status      string // "idle", "playing", "spectating"
	mu          sync.Mutex
}

// WriteMessage securely writes to the lobby player's websocket connection
func (p *LobbyPlayer) WriteMessage(messageType int, data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return p.Conn.WriteMessage(messageType, data)
}

// GlobalLobby manages all online players and available rooms
type GlobalLobby struct {
	Players map[string]*LobbyPlayer
	mu      sync.RWMutex
}

var Lobby = &GlobalLobby{
	Players: make(map[string]*LobbyPlayer),
}

// AddPlayer adds a player to the lobby and immediately sends them the current state
func (l *GlobalLobby) AddPlayer(player *LobbyPlayer) {
	l.mu.Lock()
	l.Players[player.ID] = player
	l.mu.Unlock()

	// Send current lobby state directly to the new player (guaranteed delivery)
	l.SendLobbyStateTo(player)

	// Also broadcast to everyone so existing clients see the updated player list
	l.BroadcastLobbyUpdate()
	
	// Notify friends
	l.NotifyFriendsOfStatusChange(player.PlayerID, player.Status)
}

// RemovePlayer removes a player from the lobby and broadcasts the update
func (l *GlobalLobby) RemovePlayer(playerID string) {
	l.mu.Lock()
	var actualPlayerID string
	if p, ok := l.Players[playerID]; ok {
		actualPlayerID = p.PlayerID
	}
	delete(l.Players, playerID)
	l.mu.Unlock()
	l.BroadcastLobbyUpdate()
	
	if actualPlayerID != "" {
		l.NotifyFriendsOfStatusChange(actualPlayerID, "offline")
	}
}

// UpdatePlayerStatus updates a player's status
func (l *GlobalLobby) UpdatePlayerStatus(playerID string, status string) {
	l.mu.Lock()
	var actualPlayerID string
	if p, exists := l.Players[playerID]; exists {
		p.Status = status
		actualPlayerID = p.PlayerID
	}
	l.mu.Unlock()
	l.BroadcastLobbyUpdate()
	
	if actualPlayerID != "" {
		l.NotifyFriendsOfStatusChange(actualPlayerID, status)
	}
}

// NotifyFriendsOfStatusChange sends a targeted status update to online friends
func (l *GlobalLobby) NotifyFriendsOfStatusChange(userID string, status string) {
	// Guests and anonymous users have non-numeric IDs. Only query DB for valid numeric IDs.
	if _, err := strconv.ParseUint(userID, 10, 64); err != nil {
		return
	}

	var friendships []domain.Friendship
	if err := db.DB.Preload("User").Preload("Friend").Where("(user_id = ? OR friend_id = ?) AND status = ?", userID, userID, domain.FriendshipAccepted).Find(&friendships).Error; err != nil {
		log.Printf("Error fetching friends for status update: %v", err)
		return
	}

	payload := map[string]interface{}{
		"friend_id": userID,
		"status":    status,
	}
	msgData, _ := json.Marshal(S2CMessage{
		Type:    MessageTypeSystem,
		Event:   domain.EventFriendStatus,
		Payload: payload,
	})

	l.mu.RLock()
	defer l.mu.RUnlock()

	for _, f := range friendships {
		var targetID string
		// The target to notify is the OTHER person in the friendship
		if fmt.Sprintf("%v", f.UserID) == userID {
			targetID = fmt.Sprintf("%v", f.FriendID)
		} else {
			targetID = fmt.Sprintf("%v", f.UserID)
		}

		// Find if target is online. Since Lobby.Players key is connection ID, we have to search by PlayerID
		for _, p := range l.Players {
			if p.PlayerID == targetID {
				p.WriteMessage(websocket.TextMessage, msgData)
			}
		}
	}
}

// SendInviteToPlayer sends a game invitation to a specific player
func (l *GlobalLobby) SendInviteToPlayer(senderID, senderName, targetID string, roomInfo map[string]interface{}) {
	payload := map[string]interface{}{
		"sender_id":   senderID,
		"sender_name": senderName,
		"room":        roomInfo,
	}
	msgData, _ := json.Marshal(S2CMessage{
		Type:    MessageTypeSystem,
		Event:   domain.EventFriendInvite,
		Payload: payload,
	})

	l.mu.RLock()
	defer l.mu.RUnlock()

	found := false
	for _, p := range l.Players {
		if p.PlayerID == targetID || p.Username == targetID {
			found = true
			log.Printf("[INVITE] Sending invite WS message to player %s (PlayerID=%s, Username=%s)", p.ID, p.PlayerID, p.Username)
			err := p.WriteMessage(websocket.TextMessage, msgData)
			if err != nil {
				log.Printf("[INVITE] Failed to send invite to %s: %v", p.Username, err)
			}
		}
	}
	if !found {
		log.Printf("[INVITE] Target %s NOT found in lobby! Lobby has %d players", targetID, len(l.Players))
		for _, p := range l.Players {
			log.Printf("[INVITE]   - PlayerID=%s Username=%s", p.PlayerID, p.Username)
		}
	}
}

// buildLobbyPayload constructs the lobby_update JSON payload (no locks held)
func (l *GlobalLobby) buildLobbyPayload() ([]byte, error) {
	// Snapshot players
	l.mu.RLock()
	var players []map[string]interface{}
	for _, p := range l.Players {
		players = append(players, map[string]interface{}{
			"id":       p.PlayerID,
			"username": p.Username,
			"status":   p.Status,
		})
	}
	l.mu.RUnlock()

	// Inject fake players
	if fakePlayers := simulator.GetFakePlayers(); fakePlayers != nil {
		players = append(players, fakePlayers...)
	}

	// Build rooms list
	var activeRooms []map[string]interface{}
	safeRooms := GetActiveRooms()
	for _, r := range safeRooms {
		activeRooms = append(activeRooms, map[string]interface{}{
			"id":          r.ID,
			"game":        r.Game,
			"host":        r.Host,
			"players":     r.PlayerCount,
			"mode":        r.Mode,
			"difficulty":  r.Difficulty,
			"status":      r.Status,
			"createdAt":   r.CreatedAt,
			"hasPassword": r.HasPassword,
		})
	}

	// Inject fake rooms
	if fakeRooms := simulator.GetFakeRooms(); fakeRooms != nil {
		activeRooms = append(activeRooms, fakeRooms...)
	}

	return json.Marshal(map[string]interface{}{
		"type":    "lobby_update",
		"players": players,
		"rooms":   activeRooms,
	})
}

// SendLobbyStateTo sends the current lobby state to a single player
func (l *GlobalLobby) SendLobbyStateTo(player *LobbyPlayer) {
	payload, err := l.buildLobbyPayload()
	if err != nil {
		log.Printf("Failed to marshal lobby state for new player: %v", err)
		return
	}
	player.mu.Lock()
	player.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
	err = player.Conn.WriteMessage(websocket.TextMessage, payload)
	player.mu.Unlock()
	if err != nil {
		log.Printf("Failed to send initial lobby state to %s: %v", player.PlayerID, err)
	}
}

// BroadcastLobbyUpdate sends the current lobby state to all connected lobby players
func (l *GlobalLobby) BroadcastLobbyUpdate() {
	payload, err := l.buildLobbyPayload()
	if err != nil {
		log.Printf("Failed to marshal lobby update: %v", err)
		return
	}

	// Snapshot player pointers
	l.mu.RLock()
	playersCopy := make([]*LobbyPlayer, 0, len(l.Players))
	var adminPlayersData []map[string]interface{}
	for _, p := range l.Players {
		playersCopy = append(playersCopy, p)
		adminPlayersData = append(adminPlayersData, map[string]interface{}{
			"id":          p.PlayerID,
			"username":    p.Username,
			"ip":          p.IP,
			"connectedAt": p.ConnectedAt,
			"status":      p.Status,
		})
	}
	l.mu.RUnlock()

	// Send to all players (no lobby lock held)
	var deadPlayers []string
	for _, p := range playersCopy {
		p.mu.Lock()
		p.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
		err := p.Conn.WriteMessage(websocket.TextMessage, payload)
		p.mu.Unlock()
		if err != nil {
			deadPlayers = append(deadPlayers, p.ID)
		}
	}

	// Clean up dead connections
	if len(deadPlayers) > 0 {
		l.mu.Lock()
		for _, id := range deadPlayers {
			delete(l.Players, id)
		}
		l.mu.Unlock()
	}

	// Broadcast to admins (rich payload)
	go func() {
		AdminLobby.mu.RLock()
		hasAdmins := len(AdminLobby.Clients) > 0
		AdminLobby.mu.RUnlock()

		if hasAdmins {
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
			adminPayload, _ := json.Marshal(map[string]interface{}{
				"type":    "admin_realtime_update",
				"players": adminPlayersData,
				"rooms":   activeRooms,
			})
			AdminLobby.Broadcast(adminPayload)
		}
	}()
}

// BroadcastMessage sends an arbitrary JSON message to all connected lobby players
func (l *GlobalLobby) BroadcastMessage(msg interface{}) {
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal lobby broadcast message: %v", err)
		return
	}

	l.mu.RLock()
	playersCopy := make([]*LobbyPlayer, 0, len(l.Players))
	for _, p := range l.Players {
		playersCopy = append(playersCopy, p)
	}
	l.mu.RUnlock()

	var deadPlayers []string
	for _, p := range playersCopy {
		p.mu.Lock()
		p.Conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
		err := p.Conn.WriteMessage(websocket.TextMessage, payload)
		p.mu.Unlock()
		if err != nil {
			deadPlayers = append(deadPlayers, p.ID)
		}
	}

	if len(deadPlayers) > 0 {
		l.mu.Lock()
		for _, id := range deadPlayers {
			delete(l.Players, id)
		}
		l.mu.Unlock()
	}
}
