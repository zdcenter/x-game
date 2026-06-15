package engine

import "sync"

// BaseEngine provides a boilerplate implementation for generic GameEngine methods
// to reduce duplication across different game modes.
type BaseEngine struct {
	Mu        sync.RWMutex
	State     GameState
	broadcast func()
}

// GetStatus returns the true current status of the game
func (b *BaseEngine) GetStatus() GameState {
	b.Mu.RLock()
	defer b.Mu.RUnlock()
	return b.State
}

// SetBroadcaster allows the engine to trigger a websocket broadcast asynchronously
func (b *BaseEngine) SetBroadcaster(broadcaster func()) {
	b.broadcast = broadcaster
}

// Broadcast safely invokes the broadcast callback if it is set
func (b *BaseEngine) Broadcast() {
	if b.broadcast != nil {
		b.broadcast()
	}
}

// HandleLifecycle processes standard start and restart actions.
// It returns true if the action was handled (so the caller can return early).
func HandleLifecycle(state *GameState, action string, onStart func(), onRestart func()) bool {
	if action == "start" && *state == StateWaiting {
		if onStart != nil {
			onStart()
		} else {
			*state = StatePlaying
		}
		return true
	}
	if action == "restart_game" && *state == StateFinished {
		*state = StateWaiting
		if onRestart != nil {
			onRestart()
		}
		return true
	}
	return false
}

// HandleLifecycle (method) is kept for backwards compatibility with BaseEngine.
func (b *BaseEngine) HandleLifecycle(action string, onStart func(), onRestart func()) bool {
	return HandleLifecycle(&b.State, action, onStart, onRestart)
}
