package ws

import (
	"log"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
)

// startHeartbeat sets up WebSocket ping/pong on conn and starts a server-side
// ping goroutine. Close the returned channel when the connection ends to stop it.
//
// What it does:
//   - Responds to client pings with pong (SetPingHandler)
//   - Resets the 90s read deadline on every received pong (SetPongHandler)
//   - Sets an initial 90s read deadline
//   - Sends a server-side ping every 30s to detect dead connections
func startHeartbeat(conn *websocket.Conn, label string) chan struct{} {
	conn.SetPingHandler(func(appData string) error {
		return conn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(5*time.Second))
	})

	conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(_ string) error {
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
					log.Printf("%s ping failed: %v", label, err)
					return
				}
			case <-done:
				return
			}
		}
	}()
	return done
}
