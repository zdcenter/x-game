package drop2048

import (
	"github.com/x-game/backend/internal/domain"
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type PKScoreEngine struct {
	engine.BaseEngine
	state *GameState
}

func (e *PKScoreEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.state = &GameState{
		Players: make(map[string]*PlayerInfo),
		Winners: []string{},
	}
	e.State = engine.StateWaiting
	return nil
}

func (e *PKScoreEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.state.Players[playerID]; !exists {
		e.state.Players[playerID] = &PlayerInfo{
			ID:       playerID,
			Score:    0,
			Finished: false,
		}
		e.Broadcast()
	}
}

func (e *PKScoreEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if e.State == engine.StateWaiting {
		delete(e.state.Players, playerID)
		e.Broadcast()
	}
}

func (e *PKScoreEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.state.Players[playerID]
	return exists
}

func (e *PKScoreEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var act ActionPayload
	if err := json.Unmarshal(payload, &act); err == nil && act.Action != "" {
		actionType = act.Action
	}

	// Handle Start
	if actionType == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		e.state.GlobalStartAt = time.Now().Add(3 * time.Second).UnixMilli()

		// Reset all players for the new round
		for _, p := range e.state.Players {
			p.Score = 0
			p.Finished = false
		}
		e.state.Winners = []string{}

		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			e.state.GlobalStartAt = time.Now().UnixMilli()
		})

		return e.State, nil
	}

	if actionType == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.state.Winners = []string{}
		for _, p := range e.state.Players {
			p.Score = 0
			p.Finished = false
		}
		e.Broadcast()
		return e.State, nil
	}

	if e.State == engine.StatePlaying {
		p, ok := e.state.Players[playerID]
		if !ok || p.Finished {
			return e.State, nil
		}

		switch actionType {
		case "update", string(domain.ActionMove):
			p.Score = act.Score
			e.Broadcast()

		case "game_over", string(domain.ActionForfeit):
			// Take the final score if provided, then mark finished
			if act.Score > 0 {
				p.Score = act.Score
			}
			p.Finished = true
			e.checkGameEnd()
			e.Broadcast()
		}
	}

	return e.State, nil
}

func (e *PKScoreEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	e.state.Status = string(e.State)
	return e.state
}

func (e *PKScoreEngine) checkGameEnd() {
	allFinished := true

	for _, p := range e.state.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}

	if allFinished {
		e.State = engine.StateFinished

		// Find max score
		maxScore := -1
		for _, p := range e.state.Players {
			if p.Score > maxScore {
				maxScore = p.Score
			}
		}

		// Collect winners
		var winners []string
		for id, p := range e.state.Players {
			if p.Score == maxScore && maxScore >= 0 {
				winners = append(winners, id)
			}
		}
		e.state.Winners = winners
	}
}

func (e *PKScoreEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.state.Winners
}
