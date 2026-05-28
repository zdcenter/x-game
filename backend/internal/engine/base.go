package engine

import "sync"

// BaseEngine provides a boilerplate implementation for generic GameEngine methods
// to reduce duplication across different game modes.
type BaseEngine struct {
	Mu        sync.RWMutex
	State     GameState
	Broadcast func()
}

// GetStatus returns the true current status of the game
func (b *BaseEngine) GetStatus() GameState {
	b.Mu.RLock()
	defer b.Mu.RUnlock()
	return b.State
}

// SetBroadcaster allows the engine to trigger a websocket broadcast asynchronously
func (b *BaseEngine) SetBroadcaster(broadcaster func()) {
	b.Broadcast = broadcaster
}
