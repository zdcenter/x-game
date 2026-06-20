package block

type PlayerInfo struct {
	ID       string  `json:"id"`
	Score    int     `json:"score"`
	Matrix   [][]int `json:"matrix"`
	Finished bool    `json:"finished"`
	Hand     []int   `json:"hand"` // Indices of currently held shapes
}

type GameState struct {
	Status        string                 `json:"status"`
	GlobalStartAt int64                  `json:"globalStartAt,omitempty"`
	Players       map[string]*PlayerInfo `json:"players"`
	Winners       []string               `json:"winners"`
	Seed          int64                  `json:"seed"`
}

type ActionPayload struct {
	Action string  `json:"action"`
	Score  int     `json:"score,omitempty"`
	Matrix [][]int `json:"matrix,omitempty"`
	Hand   []int   `json:"hand,omitempty"`
}
