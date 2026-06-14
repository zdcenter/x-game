package ws

import (
	"github.com/x-game/backend/internal/domain"
) // MessageType defines the broad category of the message
type MessageType string

const (
	MessageTypeRoom   MessageType = "room"
	MessageTypeGame   MessageType = "game"
	MessageTypeSystem MessageType = "system"
)

// C2SMessage is the standard structure for all incoming websocket messages
type C2SMessage struct {
	Type    MessageType      `json:"type"`
	Action  domain.C2SAction `json:"action"`
	Payload interface{}      `json:"payload,omitempty"` // Can be unmarshalled further depending on Action
}

// S2CMessage is the standard structure for all outgoing websocket messages
type S2CMessage struct {
	Type    MessageType     `json:"type"`
	Event   domain.S2CEvent `json:"event"`
	Payload interface{}     `json:"payload,omitempty"`
}

// UnifiedStatePayload is the standard payload structure for S2CEventRoomStateUpdate
type UnifiedStatePayload struct {
	Room      RoomInfo     `json:"room"`
	Players   []PlayerInfo `json:"players"`
	GameState interface{}  `json:"gameState"`
}

// RoomInfo represents the metadata of a room
type RoomInfo struct {
	ID         string                `json:"id"`
	GameID     domain.GameId         `json:"gameId"`
	Mode       domain.GameMode       `json:"mode"`
	Difficulty domain.GameDifficulty `json:"difficulty"`
	Status     domain.GameStatus     `json:"status"` // waiting, starting, playing, finished
	HostID     string                `json:"hostId"`
	CreatedAt  int64                 `json:"createdAt"`
}

// PlayerInfo represents a participant in a room
type PlayerInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
	IsHost      bool   `json:"isHost"`
	IsReady     bool   `json:"isReady"`
	IsConnected bool   `json:"isConnected"`
}
