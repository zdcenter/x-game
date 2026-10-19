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
var gameRegistry = make(map[string]bool)

// RegisterGame explicitly registers a base game ID
func RegisterGame(gameID string) {
	gameRegistry[gameID] = true
}

// Register adds an engine factory to the global registry for a specific game mode
func Register(mode string, factory EngineFactory) {
	registry[mode] = factory
}

// GetAllRegisteredGames returns a list of all unique base game IDs currently registered
func GetAllRegisteredGames() []string {
	var games []string
	for game := range gameRegistry {
		games = append(games, game)
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

// ResolveEngine finds the best matching game engine for a gameID and requested mode.
// If the exact gameID_mode is not registered, it intelligently falls back to compatible modes
// or any registered engine for that game, ensuring rooms can always be initialized smoothly.
func ResolveEngine(gameID, mode string) (GameEngine, string, error) {
	// 1. Direct match: gameID_mode
	exactKey := gameID + "_" + mode
	if factory, exists := registry[exactKey]; exists {
		return factory(), mode, nil
	}

	// 2. Intelligent mode fallback list based on common PK conventions
	var fallbackModes []string
	switch mode {
	case "speed", "battle":
		fallbackModes = []string{"speed", "battle", "score", "same_score", "steal", "single"}
	case "score", "same_score":
		fallbackModes = []string{"score", "same_score", "speed", "battle", "single"}
	case "steal":
		fallbackModes = []string{"speed", "score", "battle", "single", "steal"}
	default:
		fallbackModes = []string{"speed", "score", "battle", "same_score", "steal", "single"}
	}

	for _, m := range fallbackModes {
		candidateKey := gameID + "_" + m
		if factory, exists := registry[candidateKey]; exists {
			return factory(), m, nil
		}
	}

	// 3. Prefix search: any engine registered for this gameID
	prefix := gameID + "_"
	for key, factory := range registry {
		if len(key) > len(prefix) && key[:len(prefix)] == prefix {
			actualMode := key[len(prefix):]
			return factory(), actualMode, nil
		}
	}

	return nil, "", fmt.Errorf("no engine registered for game: %s (requested mode: %s)", gameID, mode)
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
