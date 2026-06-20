package tetris

type PlayerInfo struct {
	ID              string  `json:"id"`
	Score           int     `json:"score"`
	Lines           int     `json:"lines"`
	GarbageReceived int     `json:"garbageReceived"`
	Matrix          [][]int `json:"matrix"`
	Finished        bool    `json:"finished"`
}

type GameState struct {
	Status        string                 `json:"status"`
	Players       map[string]*PlayerInfo `json:"players"`
	Seed          int64                  `json:"seed"`
	GlobalStartAt int64                  `json:"globalStartAt"`
	Winners       []string               `json:"winners"`
}

type ActionPayload struct {
	Action string  `json:"action"` // start, update, attack, game_over
	Score  int     `json:"score,omitempty"`
	Lines  int     `json:"lines,omitempty"` // For 'update' or 'attack'
	Matrix [][]int `json:"matrix,omitempty"`
}
