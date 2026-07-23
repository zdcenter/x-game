package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/google/uuid"
)

type MatchRequest struct {
	PlayerID   string
	Username   string
	GameID     string
	Mode       string
	Difficulty string
	Target     int
	Client     *LobbyPlayer // Reference to the lobby connection
}

type Matchmaker struct {
	mu     sync.Mutex
	// Key: gameId:mode:difficulty:target
	queues map[string][]*MatchRequest
}

var GlobalMatchmaker = &Matchmaker{
	queues: make(map[string][]*MatchRequest),
}

func (m *Matchmaker) AddRequest(req *MatchRequest) {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%s:%s:%d", req.GameID, req.Mode, req.Difficulty, req.Target)

	// Remove if already in queue to prevent duplicates
	queue := m.queues[key]
	for i, r := range queue {
		if r.PlayerID == req.PlayerID {
			queue = append(queue[:i], queue[i+1:]...)
			break
		}
	}

	queue = append(queue, req)
	m.queues[key] = queue
	log.Printf("Player %s added to match queue %s (Length: %d)", req.PlayerID, key, len(queue))

	m.checkMatch(key)
}

func (m *Matchmaker) RemoveRequest(playerID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for key, queue := range m.queues {
		for i, r := range queue {
			if r.PlayerID == playerID {
				m.queues[key] = append(queue[:i], queue[i+1:]...)
				log.Printf("Player %s removed from match queue %s", playerID, key)
				return
			}
		}
	}
}

func (m *Matchmaker) checkMatch(key string) {
	queue := m.queues[key]
	if len(queue) >= 2 {
		p1 := queue[0]
		p2 := queue[1]
		m.queues[key] = queue[2:]

		// Match found! Create a room ID
		roomID := "pk-" + uuid.New().String()[:8]
		
		// We make player1 the host
		_, err := CreateRoom(roomID, p1.GameID, p1.Mode, p1.Difficulty, p1.PlayerID, "", p1.Target)
		if err != nil {
			log.Printf("Matchmaking error creating room: %v", err)
			// Put them back in queue? Nah just fail silently or tell them error.
			return
		}

		log.Printf("Match found for %s! Players: %s vs %s. Room: %s", key, p1.PlayerID, p2.PlayerID, roomID)

		// Notify both players
		notifyMatch := func(req *MatchRequest) {
			msg := map[string]interface{}{
				"type":       "match_success",
				"roomId":     roomID,
				"game":       p1.GameID,
				"mode":       p1.Mode,
				"difficulty": p1.Difficulty,
				"host":       p1.PlayerID,
			}
			b, _ := json.Marshal(msg)
			req.Client.WriteMessage(websocket.TextMessage, b)
		}

		notifyMatch(p1)
		notifyMatch(p2)
	}
}
