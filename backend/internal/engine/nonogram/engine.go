package nonogram

import (
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type Player struct {
	ID          string  `json:"id"`
	Score       int     `json:"score"`
	Progress    float64 `json:"progress"`
	Errors      int     `json:"errors"`
	FreezeUntil int64   `json:"freeze_until,omitempty"`
}

type NonogramEngine struct {
	engine.BaseEngine
	Players     map[string]*Player `json:"players"`
	Wins        map[string]int     `json:"wins"`
	Target      int                `json:"target"`
	Mode        string             `json:"mode"`
	Difficulty  string             `json:"difficulty"`
	Width       int                `json:"width"`
	Height      int                `json:"height"`
	RowHints    [][]int            `json:"row_hints"`
	ColHints    [][]int            `json:"col_hints"`
	AnswerBoard [][]int            `json:"-"`
	Board       [][]int            `json:"board,omitempty"` // Used in Steal mode
	TotalFilled int                `json:"total_filled"`
}

func init() {
	engine.RegisterGame("nonogram")
	// Register engine for different modes
	engine.Register("nonogram_speed", func() engine.GameEngine { return newEngine("speed") })
	engine.Register("nonogram_steal", func() engine.GameEngine { return newEngine("steal") })
}

func newEngine(mode string) *NonogramEngine {
	return &NonogramEngine{
		Players: make(map[string]*Player),
		Wins:    make(map[string]int),
		Mode:    mode,
	}
}

func (e *NonogramEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*Player)
	
	opts, ok := options.(map[string]interface{})
	if ok {
		if t, ok := opts["target"].(float64); ok && int(t) > 0 {
			e.Target = int(t)
		}
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
		}
	}
	if e.Target <= 0 {
		e.Target = 1
	}

	e.setupBoard()
	return nil
}

func (e *NonogramEngine) setupBoard() {
	e.Width = 10
	e.Height = 10
	switch e.Difficulty {
	case "easy":
		e.Width, e.Height = 5, 5
	case "medium":
		e.Width, e.Height = 10, 10
	case "hard":
		e.Width, e.Height = 15, 15
	}

	gen := NewGenerator()
	e.AnswerBoard, e.RowHints, e.ColHints = gen.Generate(e.Width, e.Height)
	
	e.TotalFilled = 0
	for y := 0; y < e.Height; y++ {
		for x := 0; x < e.Width; x++ {
			if e.AnswerBoard[y][x] == 1 {
				e.TotalFilled++
			}
		}
	}

	if e.Mode == "steal" {
		e.Board = make([][]int, e.Height)
		for y := 0; y < e.Height; y++ {
			e.Board[y] = make([]int, e.Width)
		}
	} else {
		e.Board = nil // Not needed for speed mode on server
	}
}

func (e *NonogramEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	e.Players[playerID] = &Player{ID: playerID}
	if _, ok := e.Wins[playerID]; !ok {
		e.Wins[playerID] = 0
	}
}

func (e *NonogramEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *NonogramEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, ok := e.Players[playerID]
	return ok
}

func (e *NonogramEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if engine.HandleLifecycle(&e.State, action, func() {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
	}, func() {
		// Restart logic
		seriesOver := false
		for _, w := range e.Wins {
			if w >= e.Target {
				seriesOver = true
				break
			}
		}
		if seriesOver {
			for p := range e.Wins {
				e.Wins[p] = 0
			}
		}
		for _, p := range e.Players {
			p.Score = 0
			p.Progress = 0
			p.Errors = 0
			p.FreezeUntil = 0
		}
		e.setupBoard()
		e.State = engine.StateWaiting
	}) {
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	p, ok := e.Players[playerID]
	if !ok {
		return e.State, nil
	}

	now := time.Now().UnixMilli()

	switch action {
	case "progress": // Speed mode progress update
		if e.Mode == "speed" {
			var req struct {
				Progress float64 `json:"progress"`
				Finished bool    `json:"finished"`
			}
			if err := json.Unmarshal(payload, &req); err == nil {
				p.Progress = req.Progress
				if req.Finished {
					p.Progress = 100
					e.State = engine.StateFinished
					e.Wins[playerID]++
				}
			}
		}

	case "move": // Steal mode cell reveal
		if e.Mode == "steal" && now >= p.FreezeUntil {
			var req struct {
				X int `json:"x"`
				Y int `json:"y"`
			}
			if err := json.Unmarshal(payload, &req); err == nil {
				if req.X >= 0 && req.X < e.Width && req.Y >= 0 && req.Y < e.Height {
					if e.Board[req.Y][req.X] == 0 {
						if e.AnswerBoard[req.Y][req.X] == 1 {
							// Correct
							e.Board[req.Y][req.X] = 1
							p.Score++
							
							// Check if game is over
							currentFilled := 0
							for y := 0; y < e.Height; y++ {
								for x := 0; x < e.Width; x++ {
									if e.Board[y][x] == 1 {
										currentFilled++
									}
								}
							}
							if currentFilled >= e.TotalFilled {
								e.State = engine.StateFinished
								// Determine winner
								maxScore := -1
								winner := ""
								for id, pl := range e.Players {
									if pl.Score > maxScore {
										maxScore = pl.Score
										winner = id
									}
								}
								if winner != "" {
									e.Wins[winner]++
								}
							}
						} else {
							// Incorrect - freeze for 3 seconds
							p.Errors++
							p.FreezeUntil = now + 3000
							// Do not update the board, let it remain unknown for others,
							// or we can reveal it as an X. Let's reveal it as an X (2).
							e.Board[req.Y][req.X] = 2
						}
					}
				}
			}
		}
	}

	return e.State, nil
}

func (e *NonogramEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, nil
}

func (e *NonogramEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	state := map[string]interface{}{
		"status":       e.State,
		"players":      e.Players,
		"wins":         e.Wins,
		"target":       e.Target,
		"mode":         e.Mode,
		"difficulty":   e.Difficulty,
		"width":        e.Width,
		"height":       e.Height,
		"row_hints":    e.RowHints,
		"col_hints":    e.ColHints,
		"total_filled": e.TotalFilled,
	}

	if e.Mode == "steal" {
		state["board"] = e.Board
	} else if e.State == engine.StateFinished {
		state["board"] = e.AnswerBoard
	}

	return state
}
