package math24

import (
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

type PKStealEngine struct {
	engine.BaseEngine
	Players       map[string]*Math24Player `json:"players"`
	CurrentPuzzle *domain.Math24Puzzle     `json:"currentPuzzle"`
	Difficulty    string                   `json:"difficulty"`
	Winners       []string                 `json:"winners"`
}

func init() {
	engine.Register("math24_steal", func() engine.GameEngine {
		return &PKStealEngine{
			Players: make(map[string]*Math24Player),
			Winners: []string{},
		}
	})
}

func (e *PKStealEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	opts, _ := options.(map[string]interface{})
	diff, _ := opts["difficulty"].(string)
	e.Difficulty = diff

	puzzles := getRandomPuzzles(e.Difficulty, 1)
	if len(puzzles) > 0 {
		e.CurrentPuzzle = &puzzles[0]
	}

	e.State = engine.StateWaiting
	return nil
}

func (e *PKStealEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

func (e *PKStealEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &Math24Player{ID: playerID, Score: 0}
	}
}

func (e *PKStealEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *PKStealEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *PKStealEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	p, ok := e.Players[playerID]
	if !ok {
		return e.State, nil
	}

	if e.State == engine.StateWaiting && actionType == string(domain.ActionStartGame) {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if actionType == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		puzzles := getRandomPuzzles(e.Difficulty, 1)
		if len(puzzles) > 0 {
			e.CurrentPuzzle = &puzzles[0]
		}
		for _, p := range e.Players {
			p.Score = 0
			p.FreezeUntil = 0
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	now := time.Now().UnixMilli()
	if p.FreezeUntil > now {
		return e.State, nil // Ignored because frozen
	}

	if actionType == "solve" {
		solveData, err := parseSolvePayload(payload)
		if err != nil {
			return e.State, err
		}

		if solveData.IsCorrect {
			p.Score++
			// Move to next puzzle
			puzzles := getRandomPuzzles(e.Difficulty, 1)
			if len(puzzles) > 0 {
				e.CurrentPuzzle = &puzzles[0]
			}

			if p.Score >= 5 {
				e.State = engine.StateFinished
				e.Winners = append(e.Winners, playerID)
				e.Broadcast()
			} else {
				e.Broadcast()
			}
		} else {
			p.FreezeUntil = now + 3000
			e.Broadcast()
		}
	}

	return e.State, nil
}

func (e *PKStealEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return map[string]interface{}{
		"status":     e.State,
		"difficulty": e.Difficulty,
		"players":    e.Players,
		"puzzle":     e.CurrentPuzzle,
		"winners":    e.Winners,
	}
}
