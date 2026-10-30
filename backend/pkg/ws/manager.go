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
	ID          string
	Conn        *websocket.Conn
	IsReady     bool
	IsSpectator bool
	WriteMu     sync.Mutex
}

// WriteMessage securely writes to the websocket connection
func (c *Client) WriteMessage(messageType int, data []byte) error {
	c.WriteMu.Lock()
	defer c.WriteMu.Unlock()
	if c.Conn == nil {
		return nil
	}
	c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return c.Conn.WriteMessage(messageType, data)
}

// Close safely closes the client websocket connection if not nil
func (c *Client) Close() error {
	if c == nil || c.Conn == nil {
		return nil
	}
	return c.Conn.Close()
}

type Room struct {
	ID            string
	Game          domain.GameId         // "minesweeper" or "sudoku"
	Host          string                // Player ID who created the room
	Mode          domain.GameMode       // "single", "pk_steal", "pk_speed"
	Difficulty    domain.GameDifficulty // "easy", "medium", "hard"
	Target        int                   // PK rounds target (e.g. 1/3/5/10), default 1
	Password      string                // Optional 4-digit password (empty = public room)
	BountyCoins   int                   // Bounty stake per player (e.g. 0, 50, 100, 200)
	CreatedAt     int64                 // Unix timestamp of creation
	LastActivity  int64                 // Unix timestamp of last client action or join
	GameChangedAt int64                 // Unix timestamp of last game change to prevent disconnect races
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
	ID             string                `json:"id"`
	Game           domain.GameId         `json:"game"`
	Host           string                `json:"host"`
	Mode           domain.GameMode       `json:"mode"`
	Difficulty     domain.GameDifficulty `json:"difficulty"`
	Status         domain.GameStatus     `json:"status"`
	CreatedAt      int64                 `json:"createdAt"`
	PlayerCount    int                   `json:"players"`
	SpectatorCount int                   `json:"spectators,omitempty"`
	HasPassword    bool                  `json:"hasPassword"`
	BountyCoins    int                   `json:"bountyCoins,omitempty"`
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
		playerCount := 0
		spectatorCount := 0
		for _, c := range r.Clients {
			if c.IsSpectator {
				spectatorCount++
			} else {
				playerCount++
			}
		}
		game := r.Game
		host := r.Host
		mode := r.Mode
		diff := r.Difficulty
		hasPassword := r.Password != ""
		var status domain.GameStatus

		if r.Engine != nil {
			st := r.Engine.GetStatus()
			if st == engine.StateWaiting {
				status = domain.StatusWaiting
			} else if st == engine.StateStarting {
				status = domain.StatusStarting
			} else if st == engine.StatePlaying {
				status = domain.StatusPlaying
			} else {
				status = domain.StatusFinished
			}
		} else {
			status = domain.StatusWaiting
		}
		bounty := r.BountyCoins
		createdAt := r.CreatedAt
		r.mu.Unlock()

		snapshots = append(snapshots, RoomSnapshot{
			ID:             r.ID,
			Game:           game,
			Host:           host,
			Mode:           mode,
			Difficulty:     diff,
			Status:         status,
			CreatedAt:      createdAt,
			PlayerCount:    playerCount,
			SpectatorCount: spectatorCount,
			HasPassword:    hasPassword,
			BountyCoins:    bounty,
		})
	}
	return snapshots
}

func GetRoomPassword(roomID string) string {
	mu.Lock()
	defer mu.Unlock()
	if room, ok := Rooms[roomID]; ok {
		return room.Password
	}
	return ""
}

// CreateRoom creates a new room. Returns error if the room already exists or was recently dismissed.
func CreateRoom(roomID, gameId, mode, difficulty, hostId, password string, target, bountyCoins int) (*Room, error) {
	mu.Lock()
	defer mu.Unlock()

	// Clean up old dismissed rooms periodically
	cleanDismissedRooms()

	if _, dismissed := DismissedRooms[roomID]; dismissed {
		delete(DismissedRooms, roomID)
	}

	if _, exists := Rooms[roomID]; exists {
		return nil, fmt.Errorf(string(domain.ErrRoomAlreadyExists))
	}

	for id, existing := range Rooms {
		if existing.Host == hostId {
			existing.mu.Lock()
			_, hostStillConnected := existing.Clients[hostId]
			remainingClients := len(existing.Clients)
			if hostStillConnected {
				remainingClients--
			}
			existing.mu.Unlock()

			if remainingClients <= 0 {
				log.Printf("Host %s creating new room %s, auto-dismissing empty/stale room %s", hostId, roomID, id)
				delete(Rooms, id)
				DismissedRooms[id] = time.Now()
			} else {
				// Other players are still in the room! Transfer host immediately so they can keep playing,
				// and free this host to create their new room.
				log.Printf("Host %s creating new room %s, transferring host of active room %s to remaining player", hostId, roomID, id)
				existing.transferHost(hostId)
			}
		}
	}

	if mode == "" {
		mode = "speed"
	}

	if target <= 0 {
		target = 1
	}

	eng, actualMode, err := engine.ResolveEngine(gameId, mode)
	if err != nil {
		log.Printf("Failed to resolve engine for %s (mode %s): %v", gameId, mode, err)
		return nil, fmt.Errorf("failed to create engine: %v", err)
	}
	mode = actualMode

	now := time.Now().Unix()
	r := &Room{
		ID:            roomID,
		Game:          domain.GameId(gameId),
		Host:          hostId,
		Mode:          domain.GameMode(mode),
		Difficulty:    domain.GameDifficulty(difficulty),
		Target:        target,
		Password:      password,
		BountyCoins:   bountyCoins,
		CreatedAt:     now,
		LastActivity:  now,
		Clients:       make(map[string]*Client),
		Engine:        eng,
		KickedPlayers: make(map[string]time.Time),
	}

	options := getGameOptions(gameId, mode, difficulty, target)
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
		return nil, fmt.Errorf(string(domain.ErrRoomDismissed))
	}

	r, exists := Rooms[roomID]
	if !exists {
		return nil, fmt.Errorf(string(domain.ErrRoomNotFound))
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
	
	if err.Error() == string(domain.ErrRoomDismissed) && hostId == "" {
		return nil, err
	}

	// If room doesn't exist AND hostId matches (meaning the caller is the creator), create it
	if hostId != "" {
		return CreateRoom(roomID, gameId, mode, difficulty, hostId, "", 1, 0)
	}

	return nil, fmt.Errorf(string(domain.ErrRoomNotFound))
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

func init() {
	go janitor()
}

// janitor runs every 5 minutes to evict rooms that slipped through normal cleanup
// (e.g. all connections dropped simultaneously, engine goroutines outlived clients).
// Cleanup thresholds (measured from LastActivity):
//   - empty room (0 clients)  → 10 minutes
//   - finished game           → 30 minutes
//   - any other state         → 2 hours (safety net for frozen rooms)
func janitor() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cleanupStaleRooms()
	}
}

func cleanupStaleRooms() {
	const (
		emptyTTL    = int64(10 * 60)      // 10 min
		finishedTTL = int64(30 * 60)      // 30 min
		staleTTL    = int64(2 * 60 * 60)  // 2 h
	)
	now := time.Now().Unix()

	// Step 1: snapshot room pointers without holding mu (same pattern as GetActiveRooms)
	mu.Lock()
	snapshot := make([]*Room, 0, len(Rooms))
	for _, r := range Rooms {
		snapshot = append(snapshot, r)
	}
	mu.Unlock()

	type staleRoom struct {
		room    *Room
		clients []*Client
	}
	var candidates []staleRoom

	// Step 2: inspect each room under its own lock (no global lock held)
	for _, r := range snapshot {
		r.mu.Lock()
		idle := now - r.LastActivity
		clientCount := len(r.Clients)
		status := r.Engine.GetStatus()

		stale := (clientCount == 0 && idle > emptyTTL) ||
			(status == engine.StateFinished && idle > finishedTTL) ||
			idle > staleTTL

		var clients []*Client
		if stale {
			for _, c := range r.Clients {
				clients = append(clients, c)
			}
		}
		r.mu.Unlock()

		if stale {
			candidates = append(candidates, staleRoom{r, clients})
		}
	}

	if len(candidates) == 0 {
		return
	}

	// Step 3: remove from global map (re-check existence to avoid double-delete)
	mu.Lock()
	for _, s := range candidates {
		if _, exists := Rooms[s.room.ID]; exists {
			delete(Rooms, s.room.ID)
			log.Printf("Janitor: evicted stale room %s (game=%s, clients=%d)", s.room.ID, s.room.Game, len(s.clients))
		}
	}
	mu.Unlock()

	// Step 4: notify any lingering clients outside all locks
	dismissed := []byte(`{"type":"` + string(domain.EventRoomDismissed) + `"}`)
	for _, s := range candidates {
		for _, c := range s.clients {
			c.WriteMessage(websocket.TextMessage, dismissed)
		}
	}

	go Lobby.BroadcastLobbyUpdate()
}

// getGameOptions fetches the database config and merges it with standard options
func getGameOptions(gameId, mode, difficulty string, target int) map[string]interface{} {
	options := map[string]interface{}{
		"mode":       mode,
		"difficulty": difficulty,
		"target":     target,
	}
	var gameConfig domain.GameConfig
	if db.DB != nil {
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
	}
	return options
}

func (r *Room) AddClient(client *Client, password string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.LastActivity = time.Now().Unix()

	// Check password (host always skips password check)
	if r.Password != "" && client.ID != r.Host && password != r.Password {
		return fmt.Errorf(string(domain.ErrWrongPassword))
	}

	// Check kick cooldown (30 seconds)
	if kickTime, kicked := r.KickedPlayers[client.ID]; kicked {
		if time.Since(kickTime) < 30*time.Second {
			remaining := 30 - int(time.Since(kickTime).Seconds())
			return fmt.Errorf("%s:%d", domain.ErrKickCooldown, remaining)
		}
		delete(r.KickedPlayers, client.ID)
	}

	// Reject if game actively in progress and player is new (allow host and spectators to bypass)
	st := r.Engine.GetStatus()
	if !client.IsSpectator && st != engine.StateWaiting && st != engine.StateFinished && !r.Engine.HasPlayer(client.ID) && r.Host != client.ID {
		return fmt.Errorf("game already started")
	}

	if r.Host == "" && !client.IsSpectator {
		r.Host = client.ID
	}

	// Preserve IsReady state on reconnect
	if old, exists := r.Clients[client.ID]; exists {
		client.IsReady = old.IsReady
	}

	r.Clients[client.ID] = client

	if !client.IsSpectator && (st == engine.StateWaiting || st == engine.StateFinished || r.Engine.HasPlayer(client.ID)) {
		r.Engine.AddPlayer(client.ID)
	}

	go r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate()
	return nil
}

func (r *Room) RemoveClient(client *Client) {
	r.mu.Lock()

	isSwitchingGame := time.Now().Unix()-r.GameChangedAt < 30

	// Only remove if this exact client connection is still the active one
	if existing, ok := r.Clients[client.ID]; ok && existing == client {
		delete(r.Clients, client.ID)

		// If game hasn't started and client wasn't spectator, completely remove them so the slot frees up
		// BUT do NOT remove from engine if the room is currently transitioning between games
		if !client.IsSpectator && r.Engine.GetStatus() == engine.StateWaiting && !isSwitchingGame {
			r.Engine.RemovePlayer(client.ID)
		}
	} else {
		// This was an old connection closing after a new one already took its place
		r.mu.Unlock()
		return
	}

	activeContestants := 0
	for _, c := range r.Clients {
		if !c.IsSpectator {
			activeContestants++
		}
	}
	isEmpty := activeContestants == 0
	isHostLeaving := r.Host == client.ID && !isSwitchingGame
	gameStatus := r.Engine.GetStatus()

	// Clean up ready state
	client.IsReady = false

	roomID := r.ID
	r.mu.Unlock()

	if isHostLeaving && gameStatus == engine.StatePlaying {
		// Game in progress: give host 30 seconds to reconnect, then transfer or delete
		log.Printf("Host %s disconnected from active game in room %s, starting 30s grace period", client.ID, roomID)
		go func(rID string, hID string) {
			time.Sleep(30 * time.Second)

			mu.Lock()
			room, exists := Rooms[rID]
			mu.Unlock()

			if !exists {
				return
			}
			room.transferHost(hID)
		}(roomID, client.ID)
	} else if isEmpty && !isSwitchingGame {
		// Room has no active contestants: destroy immediately and notify remaining spectators
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
		go Lobby.BroadcastLobbyUpdate()

		r.mu.Lock()
		msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, msg)
			c.Close()
		}
		r.Clients = make(map[string]*Client)
		r.mu.Unlock()
		return
	} else if isEmpty && isSwitchingGame {
		// All contestants temporarily disconnected to load the new game page.
		// Start a 30s grace timer to clean up only if nobody reconnects.
		go func(rID string, changedAt int64) {
			time.Sleep(30 * time.Second)
			mu.Lock()
			room, exists := Rooms[rID]
			mu.Unlock()
			if !exists {
				return
			}
			room.mu.Lock()
			defer room.mu.Unlock()
			if room.GameChangedAt == changedAt {
				active := 0
				for _, c := range room.Clients {
					if !c.IsSpectator {
						active++
					}
				}
				if active == 0 {
					mu.Lock()
					delete(Rooms, rID)
					mu.Unlock()
					go Lobby.BroadcastLobbyUpdate()
				}
			}
		}(roomID, r.GameChangedAt)
	} else if isHostLeaving {
		// Not in active game: transfer host immediately
		r.transferHost(client.ID)
	}

	go r.BroadcastState()
	go Lobby.BroadcastLobbyUpdate()
}

// transferHost picks the next available client as host. If no clients remain, dismisses the room.
func (r *Room) transferHost(oldHostID string) {
	r.mu.Lock()
	roomID := r.ID

	// Pick the first connected non-spectator client as new host
	var newHost string
	for id, c := range r.Clients {
		if !c.IsSpectator {
			newHost = id
			break
		}
	}

	if newHost == "" {
		isSwitchingGame := time.Now().Unix()-r.GameChangedAt < 30
		if isSwitchingGame {
			r.mu.Unlock()
			return
		}

		r.mu.Unlock()
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
		go Lobby.BroadcastLobbyUpdate()

		r.mu.Lock()
		msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, msg)
			c.Close()
		}
		r.Clients = make(map[string]*Client)
		r.mu.Unlock()
		return
	}

	r.Host = newHost
	log.Printf("Room %s: host transferred from %s to %s", roomID, oldHostID, newHost)

	// Notify others about host change
	msg := []byte(fmt.Sprintf(`{"type": "%s", "newHost": "%s", "oldHost": "%s"}`, domain.EventHostChanged, newHost, oldHostID))
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

	r.LastActivity = time.Now().Unix()

	senderClient, clientExists := r.Clients[clientID]
	if !clientExists {
		return
	}

	var baseMsg map[string]interface{}
	if err := json.Unmarshal(payload, &baseMsg); err != nil {
		log.Printf("Invalid JSON payload from %s: %v", clientID, err)
		return
	}

	// 统一协议标准：所有客户端上行指令必须严格使用 action 字段
	action, _ := baseMsg["action"].(string)
	if action == "" {
		log.Printf("Ignored non-compliant message without action field from %s", clientID)
		return
	}

	if senderClient.IsSpectator {
		if action == string(domain.ActionPing) {
			senderClient.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
			return
		}
		if action == string(domain.ActionLeaveRoom) {
			delete(r.Clients, clientID)
			senderClient.Close()
			r.BroadcastStateLocked()
			go Lobby.BroadcastLobbyUpdate()
			return
		}
		if action == string(domain.ActionEmoji) {
			var emojiMsg struct {
				Payload struct {
					Emoji string `json:"emoji"`
				} `json:"payload"`
			}
			if err := json.Unmarshal(payload, &emojiMsg); err == nil {
				broadcastMsg := []byte(fmt.Sprintf(`{"type": "%s", "payload": {"senderId": "%s", "emoji": "%s"}}`,
					domain.EventEmoji, clientID, emojiMsg.Payload.Emoji))
				for _, c := range r.Clients {
					c.WriteMessage(websocket.TextMessage, broadcastMsg)
				}
			}
			return
		}
		if action == string(domain.ActionChat) {
			var chatMsg struct {
				Payload struct {
					Text string `json:"text"`
				} `json:"payload"`
			}
			if err := json.Unmarshal(payload, &chatMsg); err == nil {
				broadcastMsg := []byte(fmt.Sprintf(`{"type": "%s", "payload": {"senderId": "%s", "text": "%s"}}`,
					domain.EventChat, clientID, chatMsg.Payload.Text))
				for _, c := range r.Clients {
					c.WriteMessage(websocket.TextMessage, broadcastMsg)
				}
			}
			return
		}
		log.Printf("Spectator %s attempted restricted action in room %s: %s", clientID, r.ID, action)
		return
	}

	oldStatus := r.Engine.GetStatus()
	defer func() {
		if r.Engine != nil {
			newStatus := r.Engine.GetStatus()
			if oldStatus != newStatus {
				go Lobby.BroadcastLobbyUpdate()
			}
		}
	}()

	// 1. 处理房间级公共指令 (均基于统一的 action 驱动)
	if action == string(domain.ActionPing) {
		senderClient.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
		return
	}

	if action == string(domain.ActionRestartGame) {
		log.Printf("Restarting room %s via engine (triggered by %s)", r.ID, clientID)
		r.Engine.HandleAction(clientID, string(domain.ActionRestartGame), payload)

		activePlayers := 0
		for _, c := range r.Clients {
			if !c.IsSpectator {
				activePlayers++
			}
		}
		if activePlayers >= 2 && r.Mode != "single" {
			for _, c := range r.Clients {
				if !c.IsSpectator {
					c.IsReady = true
				}
			}
			r.Engine.HandleAction(r.Host, string(domain.ActionStartGame), []byte(`{"action":"start"}`))
		} else {
			for _, c := range r.Clients {
				c.IsReady = false
			}
		}
		r.BroadcastStateLocked()
		return
	}

	if action == string(domain.ActionDismissRoom) {
		if clientID == r.Host {
			go DismissRoom(r.ID, clientID)
		}
		return
	}

	if action == string(domain.ActionLeaveRoom) {
		isSwitching := time.Now().Unix()-r.GameChangedAt < 30
		if isSwitching {
			return
		}

		leavingClient, exists := r.Clients[clientID]
		if exists {
			delete(r.Clients, clientID)
			if r.Engine != nil {
				r.Engine.RemovePlayer(clientID)
			}
			leavingClient.Close()
		}

		activeCount := 0
		for _, c := range r.Clients {
			if !c.IsSpectator {
				activeCount++
			}
		}

		if activeCount == 0 {
			roomID := r.ID
			mu.Lock()
			delete(Rooms, roomID)
			mu.Unlock()
			go Lobby.BroadcastLobbyUpdate()

			msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
			for _, c := range r.Clients {
				c.WriteMessage(websocket.TextMessage, msg)
				c.Close()
			}
			r.Clients = make(map[string]*Client)
			return
		}

		if clientID == r.Host {
			var newHost string
			for id, c := range r.Clients {
				if !c.IsSpectator {
					newHost = id
					break
				}
			}
			if newHost != "" {
				r.Host = newHost
				log.Printf("Room %s: host transferred from %s to %s on leave", r.ID, clientID, newHost)
				msg := []byte(fmt.Sprintf(`{"type": "%s", "newHost": "%s", "oldHost": "%s"}`, domain.EventHostChanged, newHost, clientID))
				for _, c := range r.Clients {
					c.WriteMessage(websocket.TextMessage, msg)
				}
			}
		}

		r.BroadcastStateLocked()
		go Lobby.BroadcastLobbyUpdate()
		return
	}

	if action == string(domain.ActionChangeGame) {
		c, ok := r.Clients[clientID]
		if ok && !c.IsSpectator && clientID == r.Host {
			gameId, _ := baseMsg["game"].(string)
			mode, _ := baseMsg["mode"].(string)
			diff, _ := baseMsg["difficulty"].(string)
			if mode == "" {
				mode = "speed"
			}
			if diff == "" {
				diff = "medium"
			}

			if gameId != "" {
				log.Printf("Host %s changing game in room %s to %s (mode: %s, diff: %s)", clientID, r.ID, gameId, mode, diff)

				eng, resolvedMode, err := engine.ResolveEngine(gameId, mode)
				if err != nil {
					log.Printf("Failed to resolve engine for %s (mode: %s): %v", gameId, mode, err)
					return
				}
				mode = resolvedMode

				r.Game = domain.GameId(gameId)
				r.Mode = domain.GameMode(mode)
				r.Difficulty = domain.GameDifficulty(diff)
				if bountyVal, ok := baseMsg["bountyCoins"].(float64); ok && bountyVal >= 0 {
					r.BountyCoins = int(bountyVal)
				}
				r.GameChangedAt = time.Now().Unix()

				eng.InitGame(getGameOptions(gameId, mode, diff, r.Target))

				for id, client := range r.Clients {
					if !client.IsSpectator {
						eng.AddPlayer(id)
					}
				}

				if asyncEng, ok := eng.(interface{ SetBroadcaster(func()) }); ok {
					asyncEng.SetBroadcaster(r.BroadcastState)
				}

				r.Engine = eng

				for _, c := range r.Clients {
					c.IsReady = false
				}

				msg := []byte(fmt.Sprintf(`{"type": "%s", "game": "%s", "mode": "%s", "difficulty": "%s", "roomId": "%s", "host": "%s"}`, domain.EventRoomGameChanged, gameId, mode, diff, r.ID, r.Host))
				for _, c := range r.Clients {
					c.WriteMessage(websocket.TextMessage, msg)
				}

				r.BroadcastStateLocked()
				go Lobby.BroadcastLobbyUpdate()
			}
		}
		return
	}

	if action == string(domain.ActionReady) {
		log.Printf("Received ready from %s in room %s", clientID, r.ID)
		if c, ok := r.Clients[clientID]; ok {
			c.IsReady = true
			r.BroadcastStateLocked()
		}
		return
	}

	if action == string(domain.ActionCancelReady) {
		if c, ok := r.Clients[clientID]; ok {
			c.IsReady = false
			r.BroadcastStateLocked()
		}
		return
	}

	if action == string(domain.ActionKickPlayer) {
		if clientID == r.Host {
			if targetID, ok := baseMsg["target"].(string); ok && targetID != "" && targetID != r.Host {
				if targetClient, exists := r.Clients[targetID]; exists {
					r.KickedPlayers[targetID] = time.Now()
					targetClient.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventKicked)))
					delete(r.Clients, targetID)
					if r.Engine != nil {
						r.Engine.RemovePlayer(targetID)
					}
					targetClient.Close()
					r.BroadcastStateLocked()
					go Lobby.BroadcastLobbyUpdate()
				}
			}
		}
		return
	}

	if action == string(domain.ActionEmoji) {
		var emojiMsg struct {
			Payload struct {
				Emoji string `json:"emoji"`
			} `json:"payload"`
		}
		if err := json.Unmarshal(payload, &emojiMsg); err == nil {
			broadcastMsg := []byte(fmt.Sprintf(`{"type": "%s", "payload": {"senderId": "%s", "emoji": "%s"}}`,
				domain.EventEmoji, clientID, emojiMsg.Payload.Emoji))
			for _, c := range r.Clients {
				c.WriteMessage(websocket.TextMessage, broadcastMsg)
			}
		}
		return
	}

	if action == string(domain.ActionChat) {
		var chatMsg struct {
			Payload struct {
				Text string `json:"text"`
			} `json:"payload"`
		}
		if err := json.Unmarshal(payload, &chatMsg); err == nil {
			broadcastMsg := []byte(fmt.Sprintf(`{"type": "%s", "payload": {"senderId": "%s", "text": "%s"}}`,
				domain.EventChat, clientID, chatMsg.Payload.Text))
			for _, c := range r.Clients {
				c.WriteMessage(websocket.TextMessage, broadcastMsg)
			}
		}
		return
	}

	if action == string(domain.ActionStartGame) {
		if clientID != r.Host {
			log.Printf("Non-host %s tried to start the game", clientID)
			return
		}
		if r.Mode != "single" {
			activePlayers := 0
			for _, c := range r.Clients {
				if !c.IsSpectator {
					activePlayers++
				}
			}
			if activePlayers < 2 {
				log.Printf("Cannot start multiplayer game with fewer than 2 players in room %s", r.ID)
				if hostClient, ok := r.Clients[clientID]; ok {
					hostClient.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"type":"error","message":"%s"}`, domain.ErrNotEnoughPlayers)))
				}
				return
			}
			for _, c := range r.Clients {
				if !c.IsSpectator && c.ID != r.Host && !c.IsReady {
					log.Printf("Cannot start game: player %s is not ready", c.ID)
					if hostClient, ok := r.Clients[clientID]; ok {
						hostClient.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"type":"start_rejected","reason":"player_not_ready","player":"%s"}`, c.ID)))
					}
					return
				}
			}
		}
	}

	// 2. 将对局动作分发给游戏引擎
	_, err := r.Engine.HandleAction(clientID, action, payload)
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

	// Generic extraction of engine players map (supporting map[string]struct, map[string]*Player, struct, etc.)
	enginePlayers := make(map[string]map[string]interface{})
	if state != nil {
		if stMap, ok := state.(map[string]interface{}); ok {
			if rawP, ok := stMap["players"]; ok && rawP != nil {
				if b, err := json.Marshal(rawP); err == nil {
					_ = json.Unmarshal(b, &enginePlayers)
				}
			}
		} else if b, err := json.Marshal(state); err == nil {
			var stMap map[string]interface{}
			if err := json.Unmarshal(b, &stMap); err == nil {
				if rawP, ok := stMap["players"]; ok && rawP != nil {
					if bP, err := json.Marshal(rawP); err == nil {
						_ = json.Unmarshal(bP, &enginePlayers)
					}
				}
			}
		}
	}

	readyPlayers := make(map[string]bool)
	playersList := make([]map[string]interface{}, 0, len(r.Clients))
	spectatorsList := make([]string, 0)
	for id, client := range r.Clients {
		if client.IsSpectator {
			spectatorsList = append(spectatorsList, id)
			continue
		}
		readyPlayers[id] = client.IsReady
		pData := map[string]interface{}{
			"id":      id,
			"isHost":  id == r.Host,
			"isReady": client.IsReady,
		}
		if ep, exists := enginePlayers[id]; exists {
			for k, v := range ep {
				if k != "id" && k != "isHost" && k != "isReady" {
					pData[k] = v
				}
			}
		}
		playersList = append(playersList, pData)
	}

	data, err := json.Marshal(map[string]interface{}{
		"type":         string(domain.EventGameState),
		"state":        state,
		"host":         r.Host,
		"readyPlayers": readyPlayers,
		"players":      playersList,
		"spectators":   spectatorsList,
		"bountyCoins":  r.BountyCoins,
		"difficulty":   r.Difficulty,
		"game":         r.Game,
		"mode":         r.Mode,
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

	r.Engine.HandleAction(clientID, string(domain.ActionDismissRoom), nil)

	msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
	r.mu.Lock()
	for _, c := range r.Clients {
		c.WriteMessage(websocket.TextMessage, msg)
		c.Close()
	}
	r.Clients = make(map[string]*Client)
	r.mu.Unlock()
}
