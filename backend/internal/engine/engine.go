package engine

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

	// AddPlayer is called when a player connects to the room
	AddPlayer(playerID string)

	// RemovePlayer is called when a player disconnects from the room
	RemovePlayer(playerID string)
}
