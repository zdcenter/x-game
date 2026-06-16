package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/middleware"
	wsManager "github.com/x-game/backend/pkg/ws"
)

func Register(router fiber.Router) {
	// Middleware to upgrade connection for all ws routes
	router.Use("/", func(c fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	adminGroup := router.Group("/admin")
	adminGroup.Use(middleware.Protected())
	adminGroup.Use(middleware.AdminProtected())

	adminGroup.Get("/", websocket.New(func(c *websocket.Conn) {
		client := &wsManager.AdminClient{
			ID:   fmt.Sprintf("admin-%d", time.Now().UnixNano()),
			Conn: c,
		}
		wsManager.AdminLobby.AddClient(client)

		// Trigger initial state send by doing a broadcast
		go wsManager.Lobby.BroadcastLobbyUpdate()

		defer func() {
			wsManager.AdminLobby.RemoveClient(client.ID)
			c.Close()
		}()

		c.SetPingHandler(func(appData string) error {
			return c.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(5*time.Second))
		})

		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				break
			}
		}
	}))

	router.Get("/join/:roomId", websocket.New(func(c *websocket.Conn) {
		var setting domain.SystemSetting
		if err := db.DB.Where("key = ?", "multiplayer_enabled").First(&setting).Error; err == nil {
			if setting.Value == "false" {
				c.WriteMessage(websocket.TextMessage, []byte(`{"type": "error", "message": "multiplayer_disabled"}`))
				c.Close()
				return
			}
		}

		rawRoomID := c.Params("roomId")
		roomID, err := url.PathUnescape(rawRoomID)
		if err != nil {
			roomID = rawRoomID
		}
		gameId := c.Query("game", "")                 // "minesweeper", "sudoku", etc.
		mode := c.Query("mode", string(domain.ModeSingle))             // string(domain.ModeSingle), string(domain.ModeSteal), string(domain.ModeSpeed)
		difficulty := c.Query("difficulty", string(domain.DiffMedium)) // string(domain.DiffEasy), string(domain.DiffMedium), string(domain.DiffHard)
		hostId := c.Query("hostId", "")               // Used to preserve host on reconnect
		action := c.Query("action", "")               // "create" or "join"
		password := c.Query("password", "")           // Optional 4-digit room password
		playerID := c.Query("playerId", "anonymous")
		var room *wsManager.Room

		if action == "create" {
			// Explicit create: only create, fail if exists
			room, err = wsManager.CreateRoom(roomID, gameId, mode, difficulty, hostId, password)
			if err != nil {
				// Room might already exist (e.g. reconnect after page refresh), try to join
				room, err = wsManager.JoinRoom(roomID)
			}
		} else if action == "join" {
			// Explicit join: only join, fail if not exists
			room, err = wsManager.JoinRoom(roomID)
		} else {
			// Backward compatible: use GetOrCreateRoom
			room, err = wsManager.GetOrCreateRoom(roomID, gameId, mode, difficulty, hostId)
		}

		if err != nil {
			log.Printf("Player %s rejected from room %s: %v", playerID, roomID, err)
			msg := fmt.Sprintf(`{"type": "error", "message": "%s"}`, err.Error())
			c.WriteMessage(websocket.TextMessage, []byte(msg))
			c.Close()
			return
		}

		client := &wsManager.Client{
			ID:   playerID,
			Conn: c,
		}

		log.Printf("Player %s attempting to join room %s", playerID, roomID)
		if err := room.AddClient(client, password); err != nil {
			log.Printf("Player %s rejected from room %s: %v", playerID, roomID, err)
			msg := fmt.Sprintf(`{"type": "error", "message": "%s"}`, err.Error())
			c.WriteMessage(websocket.TextMessage, []byte(msg))
			c.Close()
			return
		}

		defer func() {
			room.RemoveClient(client)
			c.Close()
		}()

		pingDone := startHeartbeat(c, "Game WS "+playerID)

		for {
			mt, msg, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Read error: %v", err)
				}
				break
			}

			// Reset read deadline on any message
			c.SetReadDeadline(time.Now().Add(90 * time.Second))

			if mt == websocket.TextMessage {
				room.HandleMessage(client.ID, msg)
			}
		}

		close(pingDone)
	}))

	// Lobby WebSocket endpoint
	// We already apply upgrade middleware globally above, so we don't need this specific one.

	router.Get("/lobby", websocket.New(func(c *websocket.Conn) {
		var setting domain.SystemSetting
		if err := db.DB.Where("key = ?", "multiplayer_enabled").First(&setting).Error; err == nil {
			if setting.Value == "false" {
				c.WriteMessage(websocket.TextMessage, []byte(`{"type": "error", "message": "multiplayer_disabled"}`))
				c.Close()
				return
			}
		}

		playerID := c.Query("playerId", "anonymous")
		username := c.Query("username", "Anonymous")

		player := &wsManager.LobbyPlayer{
			ID:          fmt.Sprintf("%s-%d", playerID, time.Now().UnixNano()),
			PlayerID:    playerID,
			Username:    username,
			IP:          c.IP(),
			ConnectedAt: time.Now().Unix(),
			Conn:        c,
			Status:      "idle",
		}

		wsManager.Lobby.AddPlayer(player)

		defer func() {
			wsManager.Lobby.RemovePlayer(player.ID)
			c.Close()
		}()

		pingDone := startHeartbeat(c, "Lobby WS "+playerID)

		for {
			mt, msg, err := c.ReadMessage()
			if err != nil || mt == websocket.CloseMessage {
				break
			}

			// Reset read deadline on any message
			c.SetReadDeadline(time.Now().Add(90 * time.Second))

			if mt == websocket.TextMessage {
				var action map[string]interface{}
				if err := json.Unmarshal(msg, &action); err == nil {
					if action["type"] == "ping" {
						// Application-level ping: respond with pong
						player.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
					} else if action["type"] == "dismiss_room" {
						if roomID, ok := action["roomId"].(string); ok && roomID != "" {
							wsManager.DismissRoom(roomID, playerID)
						}
					} else if action["type"] == "broadcast" {
						action["senderId"] = playerID
						action["senderName"] = username
						action["timestamp"] = time.Now().UnixMilli()
						wsManager.Lobby.BroadcastMessage(action)
					}
				}
			}
		}

		close(pingDone)
	}))
}
