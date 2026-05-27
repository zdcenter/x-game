package engine

import "fmt"

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

// CreateEngine instantiates a new game engine based on the mode using the registry
func CreateEngine(mode string) (GameEngine, error) {
	if factory, exists := registry[mode]; exists {
		return factory(), nil
	}
	return nil, fmt.Errorf("unknown game mode: %s", mode)
}
