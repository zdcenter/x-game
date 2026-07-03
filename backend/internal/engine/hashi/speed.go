package hashi

import (
	"encoding/json"
	"math/rand"
	"strings"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/pkg/db"
)

type SpeedPlayer struct {
	ID       string `json:"id"`
	Progress int    `json:"progress"` // Number of correct bridges placed
	Finished bool   `json:"finished"`
}

type SpeedEngine struct {
	engine.BaseEngine
	Players    map[string]*SpeedPlayer
	Difficulty string
	Puzzle     string // The puzzle content as JSON string
	Winners    []string
	Wins       map[string]int // Accumulated wins across rounds
	Target     int            // Number of rounds needed to win series
}

func init() {
	engine.RegisterGame("hashi")
	engine.Register("hashi_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*SpeedPlayer)
	e.Winners = make([]string, 0)
	if e.Wins == nil {
		e.Wins = make(map[string]int)
	}

	e.Difficulty = string(domain.DiffMedium)
	e.Target = 1

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
			// Default sizes or handling for Hashi
			if strings.HasPrefix(diff, "custom_") {
				// Not supported for now, fallback to medium
			}
		}
		if t, ok := opts["target"].(int); ok && t > 0 {
			e.Target = t
		}
	}

	e.fetchNewPuzzle()
	return nil
}

func (e *SpeedEngine) fetchNewPuzzle() {
	var puzzles []domain.HashiPuzzle
	if err := db.DB.Where("difficulty = ?", e.Difficulty).Find(&puzzles).Error; err != nil || len(puzzles) == 0 {
		// Fallback puzzle 7x7 if none found
		e.Puzzle = `{"width":7,"height":7,"islands":[{"r":0,"c":0,"v":3},{"r":0,"c":2,"v":4},{"r":0,"c":4,"v":3},{"r":0,"c":6,"v":2},{"r":2,"c":0,"v":3},{"r":2,"c":2,"v":4},{"r":2,"c":4,"v":4},{"r":2,"c":6,"v":3},{"r":4,"c":0,"v":3},{"r":4,"c":2,"v":4},{"r":4,"c":4,"v":3},{"r":4,"c":6,"v":2},{"r":6,"c":0,"v":2},{"r":6,"c":2,"v":3},{"r":6,"c":4,"v":2},{"r":6,"c":6,"v":1}],"solution":[]}`
	} else {
		p := puzzles[rand.Intn(len(puzzles))]
		e.Puzzle = p.Content
	}
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
		if _, hasWins := e.Wins[playerID]; !hasWins {
			e.Wins[playerID] = 0
		}
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
	delete(e.Wins, playerID)
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
		"wins":       e.Wins,
		"target":     e.Target,
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

	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
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

		e.State = engine.StateWaiting
		e.Winners = []string{}
		for _, p := range e.Players {
			p.Progress = 0
			p.Finished = false
		}
		e.fetchNewPuzzle()
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		if action == string(domain.ActionForfeit) {
			e.checkGameEndForfeit(playerID)
		}
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
			if req.Progress >= 0 {
				player.Progress = req.Progress
			}
		}
	} else if action == "finish" {
		// Trust the frontend for completion
		player.Finished = true

		e.State = engine.StateFinished
		e.Winners = []string{player.ID}
		e.Wins[player.ID]++
	} else if action == string(domain.ActionForfeit) {
		player.Finished = true
		e.checkGameEndForfeit(playerID)
	}

	return e.State, nil
}

func (e *SpeedEngine) checkGameEndForfeit(playerID string) {
	// If the player forfeited, remove them or mark as finished
	delete(e.Players, playerID)
	delete(e.Wins, playerID)
	
	allFinished := true
	for _, p := range e.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}
	
	if !allFinished || len(e.Players) == 0 {
		return
	}
	e.State = engine.StateFinished

	if len(e.Winners) == 0 {
		maxProgress := -1
		for _, p := range e.Players {
			if p.Progress > maxProgress {
				maxProgress = p.Progress
			}
		}
		for _, p := range e.Players {
			if p.Progress == maxProgress {
				e.Winners = append(e.Winners, p.ID)
				e.Wins[p.ID]++
			}
		}
	}
}

func (e *SpeedEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}
