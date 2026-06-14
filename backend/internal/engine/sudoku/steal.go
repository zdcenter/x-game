package sudoku

import (
	"encoding/json"
	"math/rand"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/pkg/db"
)

type StealPlayer struct {
	ID          string `json:"id"`
	Score       int    `json:"score"`
	FreezeUntil int64  `json:"freezeUntil"` // Unix milliseconds
	Finished    bool   `json:"finished"`
}

type StealEngine struct {
	engine.BaseEngine
	Players        map[string]*StealPlayer
	Difficulty     string
	PenaltySeconds int
	Puzzle         string
	Solution       string
	CurrentBoard   string // The shared board state, e.g. "53..7..."
	Winners        []string
}

func init() {
	engine.Register("sudoku_steal", func() engine.GameEngine { return &StealEngine{} })
}

func (e *StealEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*StealPlayer)
	e.Winners = make([]string, 0)

	e.Difficulty = "medium"
	e.PenaltySeconds = 3

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
		}
		if penalty, ok := opts["penaltySeconds"].(float64); ok {
			e.PenaltySeconds = int(penalty)
		} else if penalty, ok := opts["penaltySeconds"].(int); ok {
			e.PenaltySeconds = penalty
		}
	}

	// Fetch a random puzzle from DB
	var puzzles []domain.SudokuPuzzle
	if err := db.DB.Where("difficulty = ?", e.Difficulty).Find(&puzzles).Error; err != nil || len(puzzles) == 0 {
		// Fallback
		e.Puzzle = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79"
		e.Solution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
	} else {
		p := puzzles[rand.Intn(len(puzzles))]
		e.Puzzle = p.Puzzle
		e.Solution = p.Solution
	}

	e.CurrentBoard = e.Puzzle
	return nil
}

func (e *StealEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &StealPlayer{
			ID:          playerID,
			Score:       0,
			FreezeUntil: 0,
			Finished:    false,
		}
	}
}

func (e *StealEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *StealEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *StealEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	return map[string]interface{}{
		"status":         e.State,
		"difficulty":     e.Difficulty,
		"penaltySeconds": e.PenaltySeconds,
		"players":        e.Players,
		"puzzle":         e.Puzzle,
		"currentBoard":   e.CurrentBoard,
		"winners":        e.Winners,
	}
}

func (e *StealEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseReq struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseReq); err == nil && baseReq.Action != "" {
		action = baseReq.Action
	}

	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		for _, p := range e.Players {
			p.Score = 0
			p.FreezeUntil = 0
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
		e.CurrentBoard = e.Puzzle
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	player, exists := e.Players[playerID]
	if !exists {
		return e.State, nil
	}

	if time.Now().UnixMilli() < player.FreezeUntil {
		// Player is frozen, ignore action
		return e.State, nil
	}

	if action == "input" {
		var req struct {
			R   int `json:"r"`
			C   int `json:"c"`
			Val int `json:"val"`
		}
		if err := json.Unmarshal(payload, &req); err != nil {
			return e.State, err
		}

		idx := req.R*9 + req.C
		if idx < 0 || idx >= 81 {
			return e.State, nil
		}

		// Check if cell is already filled
		if e.CurrentBoard[idx] != '.' && e.CurrentBoard[idx] != '0' {
			return e.State, nil // Already filled
		}

		expected := int(e.Solution[idx] - '0')
		if req.Val == expected {
			// Correct!
			player.Score += 1
			// Update board
			boardBytes := []byte(e.CurrentBoard)
			boardBytes[idx] = e.Solution[idx]
			e.CurrentBoard = string(boardBytes)

			// Check win condition
			e.checkWinConditionLocked()
		} else {
			// Wrong!
			player.Score -= 1
			player.FreezeUntil = time.Now().UnixMilli() + int64(e.PenaltySeconds*1000)
		}
	} else if action == string(domain.ActionForfeit) {
		player.Finished = true

		allFinished := true
		for _, p := range e.Players {
			if !p.Finished {
				allFinished = false
				break
			}
		}
		if allFinished && len(e.Players) > 0 {
			e.State = engine.StateFinished
			var maxScore int = -9999
			for _, p := range e.Players {
				if p.Score > maxScore {
					maxScore = p.Score
				}
			}
			for _, p := range e.Players {
				if p.Score == maxScore {
					e.Winners = append(e.Winners, p.ID)
				}
			}
		}
	}

	return e.State, nil
}

func (e *StealEngine) checkWinConditionLocked() {
	// Game ends when currentBoard equals solution
	if e.CurrentBoard == e.Solution {
		e.State = engine.StateFinished

		var maxScore int = -9999
		for _, p := range e.Players {
			if p.Score > maxScore {
				maxScore = p.Score
			}
		}
		for _, p := range e.Players {
			if p.Score == maxScore {
				e.Winners = append(e.Winners, p.ID)
			}
		}
	}
}

func (e *StealEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}
