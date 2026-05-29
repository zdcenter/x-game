package hexa

import (
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
		Seed:    time.Now().UnixNano(),
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
			ID:           playerID,
			Score:        0,
			PiecesPlaced: 0,
			Finished:     false,
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

	// Handle Start
	if actionType == "start" && e.State == engine.StateWaiting {
		e.state.Seed = time.Now().UnixNano()
		e.state.GlobalStartAt = time.Now().Add(3 * time.Second).UnixMilli()
		
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			e.state.GlobalStartAt = time.Now().UnixMilli()
			
			// Start Game Timer when Playing
			go func() {
				time.Sleep(GameDurationSeconds * time.Second)
				e.Mu.Lock()
				if e.State == engine.StatePlaying {
					e.finishGame()
					e.Broadcast()
				}
				e.Mu.Unlock()
			}()
		})
		
		return e.State, nil
	}

	// Update score/progress
	if actionType == "update" && e.State == engine.StatePlaying {
		var act ActionPayload
		if err := json.Unmarshal(payload, &act); err != nil {
			return e.State, err
		}

		if p, ok := e.state.Players[playerID]; ok {
			p.Score = act.Score
			p.PiecesPlaced = act.PiecesPlaced
			if act.Finished {
				p.Finished = true
			}
			
			// Check if all players are finished
			allFinished := true
			for _, p := range e.state.Players {
				if !p.Finished {
					allFinished = false
					break
				}
			}
			if allFinished {
				e.finishGame()
			}
			e.Broadcast()
		}
	}

	// Force end for testing or manual game over
	if actionType == "game_over" && e.State == engine.StatePlaying {
		if p, ok := e.state.Players[playerID]; ok {
			p.Finished = true
			
			// Check if all finished
			allFinished := true
			for _, p := range e.state.Players {
				if !p.Finished {
					allFinished = false
					break
				}
			}
			if allFinished {
				e.finishGame()
			}
			e.Broadcast()
		}
	}

	return e.State, nil
}

func (e *PKScoreEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	e.state.Status = string(e.State) // ensure it's in sync for GetState
	return e.state
}

// Internal method, must be called with lock held
func (e *PKScoreEngine) finishGame() {
	if e.State == engine.StateFinished {
		return
	}
	e.State = engine.StateFinished
	e.state.Status = string(e.State)

	// Find winner
	maxScore := -1
	var winners []string

	for id, p := range e.state.Players {
		if p.Score > maxScore {
			maxScore = p.Score
			winners = []string{id}
		} else if p.Score == maxScore {
			winners = append(winners, id)
		}
	}
	e.state.Winners = winners
}

func (e *PKScoreEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	
	if e.State == engine.StateFinished {
		return true, e.state.Winners
	}
	
	// Game over if all players are finished
	allFinished := true
	for _, p := range e.state.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}
	isOver := allFinished && len(e.state.Players) > 0
	return isOver, e.state.Winners
}

func init() {
	engine.Register("hexa_pk_score", func() engine.GameEngine {
		return &PKScoreEngine{}
	})
}
