package engine

import (
	"fmt"
	"sync"
	"time"
)

// GameState represents the current state of a game
type GameState string

const (
	StateWaiting  GameState = "waiting"
	StateStarting GameState = "starting"
	StatePlaying  GameState = "playing"
	StateFinished GameState = "finished"
)

// GameEngine is the unified interface that all games must implement
type GameEngine interface {
	// InitGame initializes the game state with given options
	InitGame(options interface{}) error

	// HandleAction processes a player's action and returns the new GameState
	HandleAction(playerID string, action string, payload []byte) (GameState, error)

	// CheckGameOver returns whether the game is over, and a list of winner IDs
	CheckGameOver() (bool, []string)

	// GetState returns the current game state to be broadcasted to clients
	GetState() interface{}

	// GetStatus returns the true current status of the game (waiting, starting, playing, finished)
	GetStatus() GameState

	// SetBroadcaster allows the engine to trigger a websocket broadcast asynchronously
	SetBroadcaster(func())

	// AddPlayer is called when a player connects to the room
	AddPlayer(playerID string)

	// RemovePlayer is called when a player disconnects from the room
	RemovePlayer(playerID string)

	// HasPlayer checks if a player is already part of the game session
	HasPlayer(playerID string) bool
}

// EngineFactory is a function that creates a new instance of a GameEngine
type EngineFactory func() GameEngine

var registry = make(map[string]EngineFactory)

// Register adds an engine factory to the global registry for a specific game mode
func Register(mode string, factory EngineFactory) {
	registry[mode] = factory
}

// GetAllRegisteredGames returns a list of all game modes currently registered
func GetAllRegisteredGames() []string {
	var games []string
	for k := range registry {
		games = append(games, k)
	}
	return games
}

// CreateEngine instantiates a new game engine based on the mode using the registry
func CreateEngine(mode string) (GameEngine, error) {
	if factory, exists := registry[mode]; exists {
		return factory(), nil
	}
	return nil, fmt.Errorf("unknown game mode: %s", mode)
}

// StartWithCountdown is a shared utility to handle the standard 3-second
// countdown before a multiplayer game transitions to StatePlaying.
// It sets the state to starting, broadcasts, waits 3 seconds, sets state to playing,
// executes any optional onStartPlaying callback, and broadcasts again.
func StartWithCountdown(mu sync.Locker, state *GameState, broadcast func(), onStartPlaying func()) {
	*state = StateStarting
	// Synchronous broadcast is omitted here because HandleMessage already broadcasts
	// after HandleAction returns. The goroutine below will broadcast the 'playing' state.

	go func() {
		time.Sleep(3 * time.Second)
		if mu != nil {
			mu.Lock()
		}
		if *state == StateStarting {
			*state = StatePlaying
			if onStartPlaying != nil {
				onStartPlaying()
			}
		}
		if mu != nil {
			mu.Unlock()
		}
		if broadcast != nil {
			broadcast()
		}
	}()
}
