package hexa

const (
	StateWaiting  = "waiting"
	StateStarting = "starting"
	StatePlaying  = "playing"
	StateFinished = "finished"

	// Game duration in seconds for PK Mode
	GameDurationSeconds = 180
)

type PlayerInfo struct {
	ID           string `json:"id"`
	Score        int    `json:string(domain.ModeScore)`
	PiecesPlaced int    `json:"piecesPlaced"`
	Finished     bool   `json:"finished"`
}

type GameState struct {
	Status        string                 `json:"status"`
	Players       map[string]*PlayerInfo `json:"players"`
	Seed          int64                  `json:"seed"`          // Shared PRNG seed
	GlobalStartAt int64                  `json:"globalStartAt"` // Time when starting
	Winners       []string               `json:"winners"`
}

type ActionPayload struct {
	Action       string `json:"action"`
	Score        int    `json:"score,omitempty"`
	PiecesPlaced int    `json:"piecesPlaced,omitempty"`
	Finished     bool   `json:"finished,omitempty"`
}
