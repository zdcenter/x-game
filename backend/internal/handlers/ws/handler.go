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
		gameId := c.Query("game", "") // "minesweeper", "sudoku", etc.
		mode := c.Query("mode", "single") // "single", "pk_steal", "pk_speed"
		difficulty := c.Query("difficulty", "medium") // "easy", "medium", "hard"
		hostId := c.Query("hostId", "") // Used to preserve host on reconnect
		// For MVP, using a query parameter for playerId, usually this would come from JWT
		playerID := c.Query("playerId", "anonymous")

		room, err := wsManager.GetOrCreateRoom(roomID, gameId, mode, difficulty, hostId)
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
		if err := room.AddClient(client); err != nil {
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

		for {
			mt, msg, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Read error: %v", err)
				}
				break
			}

			if mt == websocket.TextMessage {
				room.HandleMessage(client.ID, msg)
			}
		}
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

		// Keep connection alive
		for {
			mt, msg, err := c.ReadMessage()
			if err != nil || mt == websocket.CloseMessage {
				break
			}
			if mt == websocket.TextMessage {
				var action map[string]interface{}
				if err := json.Unmarshal(msg, &action); err == nil {
					if action["type"] == "dismiss_room" {
						if roomID, ok := action["roomId"].(string); ok && roomID != "" {
							wsManager.DismissRoom(roomID, playerID)
						}
					}
				}
			}
		}
	}))
}
