package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
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
	Contestants   map[string]bool      // playerID -> true for all registered contestants (persists across disconnects)
	Winner        string               // Sole winner (walkover or decided by room)
	Winners       []string             // Array of winners for current round
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
	Opponent       string                `json:"opponent,omitempty"`
	Contestants    []string              `json:"contestants,omitempty"`
	Mode           domain.GameMode       `json:"mode"`
	Difficulty     domain.GameDifficulty `json:"difficulty"`
	Status         domain.GameStatus     `json:"status"`
	CreatedAt      int64                 `json:"createdAt"`
	PlayerCount    int                   `json:"players"`
	MaxPlayers     int                   `json:"maxPlayers"`
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
		opponent := ""
		for pid, c := range r.Clients {
			if c.IsSpectator {
				spectatorCount++
			} else {
				playerCount++
				if pid != r.Host && opponent == "" {
					opponent = pid
				}
			}
		}

		// Fallback for opponent from contestants if opponent is temporarily reconnecting
		if opponent == "" && len(r.Contestants) > 0 {
			for cid := range r.Contestants {
				if cid != r.Host {
					opponent = cid
					break
				}
			}
		}

		var contestants []string
		for cid := range r.Contestants {
			contestants = append(contestants, cid)
		}
		if len(contestants) > playerCount {
			playerCount = len(contestants)
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

		maxPlayers := 8
		if game == "gomoku" || game == "idiom" {
			maxPlayers = 2
		}

		snapshots = append(snapshots, RoomSnapshot{
			ID:             r.ID,
			Game:           game,
			Host:           host,
			Opponent:       opponent,
			Contestants:    contestants,
			Mode:           mode,
			Difficulty:     diff,
			Status:         status,
			CreatedAt:      createdAt,
			PlayerCount:    playerCount,
			MaxPlayers:     maxPlayers,
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

	// Clean up old dismissed rooms periodically
	cleanDismissedRooms()

	if _, dismissed := DismissedRooms[roomID]; dismissed {
		delete(DismissedRooms, roomID)
	}

	if _, exists := Rooms[roomID]; exists {
		mu.Unlock()
		return nil, fmt.Errorf(string(domain.ErrRoomAlreadyExists))
	}

	var staleToDismiss []*Room
	var staleToTransfer []*Room

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
				staleToDismiss = append(staleToDismiss, existing)
			} else {
				staleToTransfer = append(staleToTransfer, existing)
			}
		}
	}
	mu.Unlock()

	// Perform stale cleanup outside of global mu.Lock to prevent lock inversion/deadlock
	for _, old := range staleToDismiss {
		old.mu.Lock()
		msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
		for _, c := range old.Clients {
			c.WriteMessage(websocket.TextMessage, msg)
			c.Close()
		}
		old.Clients = make(map[string]*Client)
		old.mu.Unlock()
	}
	for _, old := range staleToTransfer {
		log.Printf("Host %s creating new room %s, transferring host of active room %s to remaining player", hostId, roomID, old.ID)
		old.transferHost(hostId)
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
		Contestants:   make(map[string]bool),
	}
	if hostId != "" {
		r.Contestants[hostId] = true
	}

	options := getGameOptions(gameId, mode, difficulty, target)
	r.Engine.InitGame(options)

	if asyncEng, ok := r.Engine.(interface{ SetBroadcaster(func()) }); ok {
		asyncEng.SetBroadcaster(r.BroadcastState)
	}

	mu.Lock()
	Rooms[roomID] = r
	mu.Unlock()
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

	if r.Contestants == nil {
		r.Contestants = make(map[string]bool)
	}
	if r.Host != "" {
		r.Contestants[r.Host] = true
	}

	isReturningContestant := client.ID == r.Host || (r.Engine != nil && r.Engine.HasPlayer(client.ID)) || r.Contestants[client.ID]

	// Check password (host and returning contestants skip password check)
	if !isReturningContestant && r.Password != "" && client.ID != r.Host && password != r.Password {
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

	// If player was a contestant in this room, automatically restore their contestant status
	// (protects against accidentally connecting with spectate flag when returning from lobby)
	if isReturningContestant && client.IsSpectator {
		log.Printf("Restoring returning player %s in room %s to contestant seat", client.ID, r.ID)
		client.IsSpectator = false
	}

	// Reject if room reached max player capacity (spectators can always join)
	if !client.IsSpectator && !isReturningContestant {
		currentContestants := 0
		for pid, c := range r.Clients {
			if !c.IsSpectator && pid != client.ID {
				currentContestants++
			}
		}
		maxCapacity := 8
		if r.Game == "gomoku" || r.Game == "idiom" {
			maxCapacity = 2
		}
		if currentContestants >= maxCapacity {
			return fmt.Errorf("room is full (max %d players)", maxCapacity)
		}
	}

	// Reject if game actively in progress and player is new (allow host, returning contestants, and spectators to bypass)
	st := r.Engine.GetStatus()
	if !client.IsSpectator && st != engine.StateWaiting && st != engine.StateFinished && !isReturningContestant {
		return fmt.Errorf("game already started")
	}

	if r.Host == "" && !client.IsSpectator {
		r.Host = client.ID
	}

	if !client.IsSpectator {
		r.Contestants[client.ID] = true
	}

	// Preserve IsReady state on reconnect
	if old, exists := r.Clients[client.ID]; exists {
		client.IsReady = old.IsReady
	}

	r.Clients[client.ID] = client

	if !client.IsSpectator && (st == engine.StateWaiting || st == engine.StateFinished || r.Engine.HasPlayer(client.ID) || isReturningContestant) {
		r.Engine.AddPlayer(client.ID)
	}

	// If returning contestant reconnected, broadcast reconnected notification to room
	if isReturningContestant {
		recMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s"}`, domain.EventPlayerReconnected, client.ID))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, recMsg)
		}
	}

	// Update lobby presence
	opponent := ""
	for pid, c := range r.Clients {
		if !c.IsSpectator && pid != client.ID {
			opponent = pid
			break
		}
	}
	if client.IsSpectator {
		go Lobby.UpdatePlayerPresence(client.ID, "spectating", string(r.Game), string(r.Mode), string(r.Difficulty), opponent, r.ID)
	} else {
		status := "pk"
		if st == engine.StateWaiting {
			status = "waiting"
		}
		go Lobby.UpdatePlayerPresence(client.ID, status, string(r.Game), string(r.Mode), string(r.Difficulty), opponent, r.ID)
		if opponent != "" {
			go Lobby.UpdatePlayerPresence(opponent, status, string(r.Game), string(r.Mode), string(r.Difficulty), client.ID, r.ID)
		}
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
	clientID := client.ID
	r.mu.Unlock()

	// Update lobby presence to idle
	go Lobby.UpdatePlayerPresence(clientID, "idle", "", "", "", "", "")

	// In-game disconnect broadcast & timeout handling
	if gameStatus == engine.StatePlaying && !client.IsSpectator {
		disMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "gracePeriod": 30}`, domain.EventPlayerDisconnected, clientID))
		r.mu.Lock()
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, disMsg)
		}
		r.mu.Unlock()

		if isHostLeaving {
			// Game in progress: give host 30 seconds to reconnect, then transfer or delete
			log.Printf("Host %s disconnected from active game in room %s, starting 30s grace period", clientID, roomID)
			go func(rID string, hID string) {
				time.Sleep(30 * time.Second)

				mu.Lock()
				room, exists := Rooms[rID]
				mu.Unlock()

				if !exists {
					return
				}
				room.transferHost(hID)
			}(roomID, clientID)
		} else {
			// Opponent disconnected from active game: grant 30s grace period. If not reconnected, forfeit!
			log.Printf("Contestant %s disconnected from active game in room %s, starting 30s grace period before forfeit", clientID, roomID)
			go func(rID string, pID string) {
				time.Sleep(30 * time.Second)

				mu.Lock()
				room, exists := Rooms[rID]
				mu.Unlock()

				if !exists {
					return
				}

				room.mu.Lock()
				defer room.mu.Unlock()

				// If contestant reconnected within 30s, do not forfeit
				if c, reconnected := room.Clients[pID]; reconnected && !c.IsSpectator {
					return
				}

				// Player did not return: forfeit!
				if room.Engine != nil && room.Engine.GetStatus() == engine.StatePlaying {
					log.Printf("Contestant %s forfeited by disconnect timeout in room %s", pID, rID)
					room.Engine.HandleAction(pID, string(domain.ActionForfeit), []byte(`{"action":"forfeit"}`))
					delete(room.Contestants, pID)
					leftMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "reason": "timeout"}`, domain.EventPlayerLeft, pID))
					for _, c := range room.Clients {
						c.WriteMessage(websocket.TextMessage, leftMsg)
					}
					room.BroadcastStateLocked()
					go Lobby.BroadcastLobbyUpdate()
					room.checkWalkoverVictoryLocked(true)
				}
			}(roomID, clientID)
		}
	} else if isEmpty && !isSwitchingGame {
		// Room temporarily has no active contestants (e.g. mobile screen lock or network switch):
		// Grant 25s grace period for client reconnection before destroying the room
		go func(rID string) {
			time.Sleep(25 * time.Second)
			mu.Lock()
			room, exists := Rooms[rID]
			mu.Unlock()
			if !exists {
				return
			}

			room.mu.Lock()
			hasContestant := false
			for _, c := range room.Clients {
				if !c.IsSpectator {
					hasContestant = true
					break
				}
			}
			var clientsToClose []*Client
			if !hasContestant {
				for _, c := range room.Clients {
					clientsToClose = append(clientsToClose, c)
				}
				room.Clients = make(map[string]*Client)
			}
			room.mu.Unlock()

			if !hasContestant {
				mu.Lock()
				delete(Rooms, rID)
				mu.Unlock()
				go Lobby.BroadcastLobbyUpdate()

				msg := []byte(fmt.Sprintf(`{"type": "%s"}`, domain.EventRoomDismissed))
				for _, c := range clientsToClose {
					c.WriteMessage(websocket.TextMessage, msg)
					c.Close()
				}
			}
		}(roomID)
		return
	} else if !client.IsSpectator && gameStatus == engine.StateWaiting && !isSwitchingGame {
		// In waiting room, give 25s grace period before freeing up the player slot
		go func(rID string, pID string) {
			time.Sleep(25 * time.Second)
			mu.Lock()
			room, exists := Rooms[rID]
			mu.Unlock()
			if !exists {
				return
			}

			room.mu.Lock()
			defer room.mu.Unlock()

			if _, reconnected := room.Clients[pID]; !reconnected {
				if room.Engine != nil && room.Engine.GetStatus() == engine.StateWaiting {
					room.Engine.RemovePlayer(pID)
					leftMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "reason": "leave"}`, domain.EventPlayerLeft, pID))
					for _, c := range room.Clients {
						c.WriteMessage(websocket.TextMessage, leftMsg)
					}
					room.BroadcastStateLocked()
					go Lobby.BroadcastLobbyUpdate()
				}
			}
		}(roomID, clientID)
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
			shouldDelete := false
			if room.GameChangedAt == changedAt {
				active := 0
				for _, c := range room.Clients {
					if !c.IsSpectator {
						active++
					}
				}
				if active == 0 {
					shouldDelete = true
				}
			}
			room.mu.Unlock()

			if shouldDelete {
				mu.Lock()
				delete(Rooms, rID)
				mu.Unlock()
				go Lobby.BroadcastLobbyUpdate()
			}
		}(roomID, r.GameChangedAt)
	} else if isHostLeaving && gameStatus == engine.StateWaiting && !isSwitchingGame {
		// Host disconnected from waiting room: give 15s grace period before transferring host (F5 refresh protection)
		go func(rID string, hID string) {
			time.Sleep(15 * time.Second)

			mu.Lock()
			room, exists := Rooms[rID]
			mu.Unlock()

			if !exists {
				return
			}
			room.transferHost(hID)
		}(roomID, clientID)
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
	// If the original host has already reconnected as a contestant, cancel transfer
	if c, reconnected := r.Clients[oldHostID]; reconnected && !c.IsSpectator {
		r.mu.Unlock()
		return
	}
	delete(r.Contestants, oldHostID)
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

// transferHostToLocked manually transfers host to a target connected contestant (called with r.mu held)
func (r *Room) transferHostToLocked(oldHostID, newHostID string) {
	targetClient, exists := r.Clients[newHostID]
	if !exists || targetClient.IsSpectator {
		return
	}
	r.Host = newHostID
	log.Printf("Room %s: host transferred manually from %s to %s", r.ID, oldHostID, newHostID)
	msg := []byte(fmt.Sprintf(`{"type": "%s", "newHost": "%s", "oldHost": "%s"}`, domain.EventHostChanged, newHostID, oldHostID))
	for _, c := range r.Clients {
		c.WriteMessage(websocket.TextMessage, msg)
	}
	r.BroadcastStateLocked()
	go Lobby.BroadcastLobbyUpdate()
}

// checkWalkoverVictoryLocked checks if only 1 active contestant remains in an ongoing game.
// If so, awards walkover victory to the sole remaining contestant and finalizes the game.
func (r *Room) checkWalkoverVictoryLocked(allowIfFinished bool) {
	if r.Engine == nil {
		return
	}
	currentStatus := r.Engine.GetStatus()
	if !allowIfFinished && currentStatus != engine.StatePlaying {
		return
	}
	if currentStatus == engine.StateWaiting || currentStatus == engine.StateStarting {
		return
	}

	activeContestants := make([]string, 0)
	for pid, c := range r.Clients {
		if !c.IsSpectator {
			activeContestants = append(activeContestants, pid)
		}
	}

	if len(activeContestants) == 1 {
		winnerID := activeContestants[0]
		log.Printf("Room %s: walkover victory awarded to %s (all other opponents left or forfeited)", r.ID, winnerID)

		r.Winner = winnerID
		r.Winners = []string{winnerID}

		// Terminate engine with game_over / forfeit and ensure StateFinished
		r.Engine.HandleAction(winnerID, "game_over", []byte(`{"action":"game_over"}`))
		r.Engine.ForceFinish()

		// Broadcast walkover victory event to clients
		walkoverMsg := []byte(fmt.Sprintf(`{"type": "%s", "winnerId": "%s", "reason": "all_opponents_left"}`, domain.EventWalkoverVictory, winnerID))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, walkoverMsg)
		}

		r.BroadcastStateLocked()
		go Lobby.BroadcastLobbyUpdate()
	} else if len(activeContestants) == 0 {
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
	}
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
		if action == string(domain.ActionJoinContestant) || action == "join_contestant" || action == "take_seat" {
			st := r.Engine.GetStatus()
			if st != engine.StateWaiting {
				senderClient.WriteMessage(websocket.TextMessage, []byte(`{"type":"error","payload":"对战已在进行中，无法参战"}`))
				return
			}
			currentContestants := 0
			for pid, c := range r.Clients {
				if !c.IsSpectator && pid != clientID {
					currentContestants++
				}
			}
			maxCapacity := 8
			if r.Game == "gomoku" || r.Game == "idiom" {
				maxCapacity = 2
			}
			if currentContestants >= maxCapacity {
				senderClient.WriteMessage(websocket.TextMessage, []byte(`{"type":"error","payload":"席位已满"}`))
				return
			}
			senderClient.IsSpectator = false
			senderClient.IsReady = false
			if r.Host == "" {
				r.Host = clientID
			}
			r.Engine.AddPlayer(clientID)
			r.BroadcastStateLocked()
			go Lobby.BroadcastLobbyUpdate()
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
		r.Winner = ""
		r.Winners = nil
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

	if action == string(domain.ActionForfeit) || action == "forfeit" {
		log.Printf("Contestant %s explicitly forfeited in room %s", clientID, r.ID)
		wasPlaying := r.Engine != nil && r.Engine.GetStatus() == engine.StatePlaying

		// 1. Pass forfeit to engine
		if r.Engine != nil {
			r.Engine.HandleAction(clientID, string(domain.ActionForfeit), payload)
		}

		// 2. Broadcast forfeit event to all clients in the room
		forfeitMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "reason": "forfeit"}`, domain.EventPlayerLeft, clientID))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, forfeitMsg)
		}

		// 3. Mark client as spectator and remove from active contestants
		delete(r.Contestants, clientID)
		if c, exists := r.Clients[clientID]; exists {
			c.IsSpectator = true
		}

		// 4. Award walkover victory if match was in progress
		if wasPlaying {
			r.checkWalkoverVictoryLocked(true)
		}

		r.BroadcastStateLocked()
		go Lobby.BroadcastLobbyUpdate()
		return
	}

	if action == string(domain.ActionDismissRoom) {
		if clientID == r.Host {
			go DismissRoom(r.ID, clientID)
		}
		return
	}

	if action == string(domain.ActionTransferHost) {
		if clientID == r.Host {
			if targetID, ok := baseMsg["targetId"].(string); ok && targetID != "" && targetID != r.Host {
				r.transferHostToLocked(clientID, targetID)
			}
		}
		return
	}

	if action == string(domain.ActionChangeTarget) {
		if clientID == r.Host && r.Engine != nil && r.Engine.GetStatus() == engine.StateWaiting {
			if targetVal, ok := baseMsg["target"].(float64); ok && int(targetVal) > 0 {
				r.Target = int(targetVal)
				r.Engine.InitGame(getGameOptions(string(r.Game), string(r.Mode), string(r.Difficulty), r.Target))
				for id, client := range r.Clients {
					if !client.IsSpectator {
						r.Engine.AddPlayer(id)
					}
				}
				r.BroadcastStateLocked()
				go Lobby.BroadcastLobbyUpdate()
			}
		}
		return
	}

	if action == string(domain.ActionSetPassword) {
		if clientID == r.Host && r.Engine != nil && r.Engine.GetStatus() == engine.StateWaiting {
			if pw, ok := baseMsg["password"].(string); ok {
				r.Password = strings.TrimSpace(pw)
				r.BroadcastStateLocked()
				go Lobby.BroadcastLobbyUpdate()
			}
		}
		return
	}

	if action == string(domain.ActionLeaveRoom) {
		isSwitching := time.Now().Unix()-r.GameChangedAt < 30
		if isSwitching {
			return
		}

		leavingClient, exists := r.Clients[clientID]
		if !exists {
			return
		}

		isForfeit := false
		if fVal, ok := baseMsg["forfeit"].(bool); ok && fVal {
			isForfeit = true
		}

		gameStatus := engine.StateWaiting
		if r.Engine != nil {
			gameStatus = r.Engine.GetStatus()
		}

		// In-game temporary leave (player did NOT explicitly forfeit): hold contestant seat for 30s
		if gameStatus == engine.StatePlaying && !leavingClient.IsSpectator && !isForfeit {
			log.Printf("Contestant %s temporarily left active game in room %s, holding seat for 30s", clientID, r.ID)
			delete(r.Clients, clientID)
			leavingClient.Close()

			// Broadcast disconnection event to remaining players
			disMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "gracePeriod": 30}`, domain.EventPlayerDisconnected, clientID))
			for _, c := range r.Clients {
				c.WriteMessage(websocket.TextMessage, disMsg)
			}

			r.BroadcastStateLocked()
			go Lobby.BroadcastLobbyUpdate()

			// Start 30s forfeit timer if player does not return
			go func(rID string, pID string) {
				time.Sleep(30 * time.Second)
				mu.Lock()
				room, exists := Rooms[rID]
				mu.Unlock()
				if !exists {
					return
				}
				room.mu.Lock()
				defer room.mu.Unlock()
				if c, reconnected := room.Clients[pID]; reconnected && !c.IsSpectator {
					return
				}
				if room.Engine != nil && room.Engine.GetStatus() == engine.StatePlaying {
					log.Printf("Contestant %s forfeited by temporary leave timeout in room %s", pID, rID)
					room.Engine.HandleAction(pID, string(domain.ActionForfeit), []byte(`{"action":"forfeit"}`))
					delete(room.Contestants, pID)
					leftMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "reason": "timeout"}`, domain.EventPlayerLeft, pID))
					for _, c := range room.Clients {
						c.WriteMessage(websocket.TextMessage, leftMsg)
					}
					room.BroadcastStateLocked()
					go Lobby.BroadcastLobbyUpdate()
					room.checkWalkoverVictoryLocked(true)
				}
			}(r.ID, clientID)
			return
		}

		// Permanent leave (waiting room, finished, spectator, or explicit forfeit)
		reason := "leave"
		if isForfeit {
			reason = "forfeit"
		}
		if isForfeit && r.Engine != nil && gameStatus == engine.StatePlaying {
			r.Engine.HandleAction(clientID, string(domain.ActionForfeit), []byte(`{"action":"forfeit"}`))
			// Guarantee match concludes if only 0 or 1 active contestant remains after forfeit
			activeRemaining := 0
			var winnerID string
			for pid, c := range r.Clients {
				if !c.IsSpectator && pid != clientID {
					activeRemaining++
					winnerID = pid
				}
			}
			if activeRemaining <= 1 && r.Engine.GetStatus() == engine.StatePlaying {
				r.Engine.HandleAction(clientID, "game_over", []byte(`{"action":"game_over"}`))
				log.Printf("Room %s: game concluded by forfeit of %s, remaining contestant: %s", r.ID, clientID, winnerID)
			}
		}
		delete(r.Clients, clientID)
		delete(r.Contestants, clientID)
		if r.Engine != nil {
			r.Engine.RemovePlayer(clientID)
		}
		leavingClient.Close()

		// Broadcast player_left event to remaining clients
		leftMsg := []byte(fmt.Sprintf(`{"type": "%s", "playerId": "%s", "reason": "%s"}`, domain.EventPlayerLeft, clientID, reason))
		for _, c := range r.Clients {
			c.WriteMessage(websocket.TextMessage, leftMsg)
		}

		if gameStatus == engine.StatePlaying {
			r.checkWalkoverVictoryLocked(true)
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
			} else {
				// No other active contestants available: dismiss room directly!
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
					delete(r.Contestants, targetID)
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

	stateMap := make(map[string]interface{})
	if state != nil {
		if stMap, ok := state.(map[string]interface{}); ok {
			for k, v := range stMap {
				stateMap[k] = v
			}
		} else if b, err := json.Marshal(state); err == nil {
			_ = json.Unmarshal(b, &stateMap)
		}
	}

	if len(r.Winners) > 0 {
		stateMap["winners"] = r.Winners
		stateMap["winner"] = r.Winner
		stateMap["status"] = "finished"
	}

	// Generic extraction of engine players map (supporting map[string]struct, map[string]*Player, struct, etc.)
	enginePlayers := make(map[string]map[string]interface{})
	if rawP, ok := stateMap["players"]; ok && rawP != nil {
		if b, err := json.Marshal(rawP); err == nil {
			_ = json.Unmarshal(b, &enginePlayers)
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

	payloadMap := map[string]interface{}{
		"type":         string(domain.EventGameState),
		"state":        stateMap,
		"host":         r.Host,
		"readyPlayers": readyPlayers,
		"players":      playersList,
		"spectators":   spectatorsList,
		"bountyCoins":  r.BountyCoins,
		"difficulty":   r.Difficulty,
		"game":         r.Game,
		"mode":         r.Mode,
		"target":       r.Target,
		"hasPassword":  r.Password != "",
	}
	if len(r.Winners) > 0 {
		payloadMap["winners"] = r.Winners
		payloadMap["winner"] = r.Winner
		payloadMap["status"] = "finished"
	}

	data, err := json.Marshal(payloadMap)
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
