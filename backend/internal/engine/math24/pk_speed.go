package math24

import (
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

type PKSpeedEngine struct {
	engine.BaseEngine
	Players    map[string]*Math24Player `json:"players"`
	Puzzles    []domain.Math24Puzzle    `json:"puzzles"`
	Difficulty string                   `json:"difficulty"`
	Winners    []string                 `json:"winners"`
}

func init() {
	engine.Register("math24_pk_speed", func() engine.GameEngine {
		return &PKSpeedEngine{
			Players: make(map[string]*Math24Player),
			Winners: []string{},
		}
	})
}

func (e *PKSpeedEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	opts, _ := options.(map[string]interface{})
	diff, _ := opts["difficulty"].(string)
	e.Difficulty = diff

	// Speed mode: fetch 5 puzzles for everyone to solve sequentially
	e.Puzzles = getRandomPuzzles(e.Difficulty, 5)
	e.State = engine.StateWaiting
	return nil
}

func (e *PKSpeedEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

func (e *PKSpeedEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &Math24Player{ID: playerID, Progress: 0}
	}
}

func (e *PKSpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *PKSpeedEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *PKSpeedEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	p, ok := e.Players[playerID]
	if !ok {
		return e.State, nil
	}

	if e.State == engine.StateWaiting && actionType == "start" {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if actionType == "restart_game" && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		e.Puzzles = getRandomPuzzles(e.Difficulty, 5)
		for _, p := range e.Players {
			p.Progress = 0
			p.FreezeUntil = 0
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	now := time.Now().UnixMilli()
	if p.FreezeUntil > now {
		return e.State, nil
	}

	if actionType == "solve" {
		solveData, err := parseSolvePayload(payload)
		if err != nil {
			return e.State, err
		}

		if solveData.IsCorrect {
			p.Progress++
			if p.Progress >= len(e.Puzzles) {
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

func (e *PKSpeedEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return map[string]interface{}{
		"status":     e.State,
		"difficulty": e.Difficulty,
		"players":    e.Players,
		"puzzles":    e.Puzzles, // Client knows which puzzle they are on via progress
		"winners":    e.Winners,
	}
}
