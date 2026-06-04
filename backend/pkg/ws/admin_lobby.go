package ws

import (
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
)

type AdminClient struct {
	ID   string
	Conn *websocket.Conn
	mu   sync.Mutex
}

func (c *AdminClient) WriteMessage(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return c.Conn.WriteMessage(messageType, data)
}

type AdminGlobalLobby struct {
	Clients map[string]*AdminClient
	mu      sync.RWMutex
}

var AdminLobby = &AdminGlobalLobby{
	Clients: make(map[string]*AdminClient),
}

func (a *AdminGlobalLobby) AddClient(client *AdminClient) {
	a.mu.Lock()
	a.Clients[client.ID] = client
	a.mu.Unlock()
}

func (a *AdminGlobalLobby) RemoveClient(id string) {
	a.mu.Lock()
	delete(a.Clients, id)
	a.mu.Unlock()
}

// Broadcast sends the payload to all connected admin clients
func (a *AdminGlobalLobby) Broadcast(payload []byte) {
	a.mu.RLock()
	clientsCopy := make([]*AdminClient, 0, len(a.Clients))
	for _, c := range a.Clients {
		clientsCopy = append(clientsCopy, c)
	}
	a.mu.RUnlock()

	var deadClients []string
	for _, c := range clientsCopy {
		err := c.WriteMessage(websocket.TextMessage, payload)
		if err != nil {
			deadClients = append(deadClients, c.ID)
		}
	}

	if len(deadClients) > 0 {
		a.mu.Lock()
		for _, id := range deadClients {
			delete(a.Clients, id)
		}
		a.mu.Unlock()
		log.Printf("Cleaned up %d dead admin connections", len(deadClients))
	}
}
