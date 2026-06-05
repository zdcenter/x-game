package sudoku

import (
	"encoding/json"
	"math/rand"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/pkg/db"
)

type SpeedPlayer struct {
	ID       string `json:"id"`
	Progress int    `json:"progress"` // Number of correct cells (0-81)
	Finished bool   `json:"finished"`
}

type SpeedEngine struct {
	engine.BaseEngine
	Players    map[string]*SpeedPlayer
	Difficulty string
	Puzzle     string
	Solution   string
	Winners    []string
}

func init() {
	engine.Register("sudoku_pk_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*SpeedPlayer)
	e.Winners = make([]string, 0)

	e.Difficulty = "medium"

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
		}
	}

	var puzzles []domain.SudokuPuzzle
	if err := db.DB.Where("difficulty = ?", e.Difficulty).Find(&puzzles).Error; err != nil || len(puzzles) == 0 {
		e.Puzzle = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79"
		e.Solution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
	} else {
		p := puzzles[rand.Intn(len(puzzles))]
		e.Puzzle = p.Puzzle
		e.Solution = p.Solution
	}

	return nil
}

func (e *SpeedEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &SpeedPlayer{
			ID:       playerID,
			Progress: 0,
			Finished: false,
		}
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *SpeedEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *SpeedEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	return map[string]interface{}{
		"status":     e.State,
		"difficulty": e.Difficulty,
		"players":    e.Players,
		"puzzle":     e.Puzzle,
		"winners":    e.Winners,
	}
}

func (e *SpeedEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseReq struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseReq); err == nil && baseReq.Action != "" {
		action = baseReq.Action
	}

	if action == "start" && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if action == "restart_game" && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		for _, p := range e.Players {
			p.Progress = 0
			p.Finished = false
		}
		// Fetch a new puzzle
		var puzzles []domain.SudokuPuzzle
		if err := db.DB.Where("difficulty = ?", e.Difficulty).Find(&puzzles).Error; err != nil || len(puzzles) == 0 {
			e.Puzzle = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79"
			e.Solution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
		} else {
			p := puzzles[rand.Intn(len(puzzles))]
			e.Puzzle = p.Puzzle
			e.Solution = p.Solution
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	player, exists := e.Players[playerID]
	if !exists {
		return e.State, nil
	}

	if action == "progress" {
		var req struct {
			Progress int `json:"progress"`
		}
		if err := json.Unmarshal(payload, &req); err == nil {
			if req.Progress >= 0 && req.Progress <= 81 {
				player.Progress = req.Progress
			}
		}
	} else if action == "finish" {
		var req struct {
			Board string `json:"board"`
		}
		if err := json.Unmarshal(payload, &req); err == nil {
			// Validate board matches solution
			if req.Board == e.Solution {
				player.Finished = true
				player.Progress = 81

				e.State = engine.StateFinished
				e.Winners = []string{player.ID}
			}
		}
	} else if action == "forfeit" {
		player.Finished = true
		e.checkGameEnd()
	}

	return e.State, nil
}

func (e *SpeedEngine) checkGameEnd() {
	allFinished := true
	for _, p := range e.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}
	if allFinished && len(e.Players) > 0 {
		e.State = engine.StateFinished
	}
}

func (e *SpeedEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}
