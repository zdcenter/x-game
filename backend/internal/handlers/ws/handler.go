package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	wsManager "github.com/x-game/backend/pkg/ws"
)

func Register(router fiber.Router) {
	// Middleware to upgrade connection
	router.Use("/join/:roomId", func(c fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	router.Get("/join/:roomId", websocket.New(func(c *websocket.Conn) {
		rawRoomID := c.Params("roomId")
		roomID, err := url.PathUnescape(rawRoomID)
		if err != nil {
			roomID = rawRoomID
		}
		gameId := c.Query("game", "")              // "minesweeper", "sudoku", etc.
		mode := c.Query("mode", "single")           // "single", "pk_steal", "pk_speed"
		difficulty := c.Query("difficulty", "medium") // "easy", "medium", "hard"
		hostId := c.Query("hostId", "")             // Used to preserve host on reconnect
		action := c.Query("action", "")             // "create" or "join"
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

		// Configure Ping/Pong heartbeat for Game WS
		c.SetPingHandler(func(appData string) error {
			return c.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(5*time.Second))
		})

		// Start server-side ping ticker
		pingTicker := time.NewTicker(30 * time.Second)
		pingDone := make(chan struct{})
		go func() {
			defer pingTicker.Stop()
			for {
				select {
				case <-pingTicker.C:
					if err := c.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
						log.Printf("Game WS ping failed for %s: %v", playerID, err)
						return
					}
				case <-pingDone:
					return
				}
			}
		}()

		// Set read deadline — if no message (including pong) received in 90s, close
		c.SetReadDeadline(time.Now().Add(90 * time.Second))
		c.SetPongHandler(func(appData string) error {
			c.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

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
	router.Use("/lobby", func(c fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	router.Get("/lobby", websocket.New(func(c *websocket.Conn) {
		playerID := c.Query("playerId", "anonymous")
		username := c.Query("username", "Anonymous")

		player := &wsManager.LobbyPlayer{
			ID:       fmt.Sprintf("%s-%d", playerID, time.Now().UnixNano()),
			PlayerID: playerID,
			Username: username,
			Conn:     c,
			Status:   "idle",
		}

		wsManager.Lobby.AddPlayer(player)

		defer func() {
			wsManager.Lobby.RemovePlayer(player.ID)
			c.Close()
		}()

		// Configure Ping/Pong heartbeat for Lobby WS
		c.SetPingHandler(func(appData string) error {
			return c.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(5*time.Second))
		})

		// Start server-side ping ticker
		pingTicker := time.NewTicker(30 * time.Second)
		pingDone := make(chan struct{})
		go func() {
			defer pingTicker.Stop()
			for {
				select {
				case <-pingTicker.C:
					if err := c.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
						log.Printf("Lobby WS ping failed for %s: %v", playerID, err)
						return
					}
				case <-pingDone:
					return
				}
			}
		}()

		// Set read deadline — if no message (including pong) received in 90s, close
		c.SetReadDeadline(time.Now().Add(90 * time.Second))
		c.SetPongHandler(func(appData string) error {
			c.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

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
