package drop2048

type PlayerInfo struct {
	ID       string `json:"id"`
	Score    int    `json:"score"`
	Finished bool   `json:"finished"`
}

type GameState struct {
	Status        string                 `json:"status"`
	GlobalStartAt int64                  `json:"globalStartAt,omitempty"`
	Players       map[string]*PlayerInfo `json:"players"`
	Winners       []string               `json:"winners"`
}

type ActionPayload struct {
	Action string `json:"action"`
	Score  int    `json:"score,omitempty"`
}
