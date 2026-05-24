package ws

import (
	"log"

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
		roomID := c.Params("roomId")
		mode := c.Query("mode", "single") // "single", "pk_steal", "pk_speed"
		difficulty := c.Query("difficulty", "medium") // "easy", "medium", "hard"
		// For MVP, using a query parameter for playerId, usually this would come from JWT
		playerID := c.Query("playerId", "anonymous")

		room := wsManager.GetOrCreateRoom(roomID, mode, difficulty)
		client := &wsManager.Client{
			ID:   playerID,
			Conn: c,
		}

		log.Printf("Player %s joined room %s", playerID, roomID)
		room.AddClient(client)

		defer func() {
			room.RemoveClient(client.ID)
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
			ID:       playerID,
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
			mt, _, err := c.ReadMessage()
			if err != nil || mt == websocket.CloseMessage {
				break
			}
		}
	}))
}
