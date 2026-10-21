package tetris

import (
	"github.com/x-game/backend/internal/domain"
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type PKAttackEngine struct {
	engine.BaseEngine
	state *GameState
}

func (e *PKAttackEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	target := 1
	if opts, ok := options.(map[string]interface{}); ok {
		if t, ok := opts["target"].(int); ok && t > 0 {
			target = t
		} else if tf, ok := opts["target"].(float64); ok && tf > 0 {
			target = int(tf)
		}
	}

	e.state = &GameState{
		Players: make(map[string]*PlayerInfo),
		Seed:    time.Now().UnixMilli(),
		Winners: []string{},
		Target:  target,
		Wins:    make(map[string]int),
	}
	e.State = engine.StateWaiting
	return nil
}

func (e *PKAttackEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.state.Players[playerID]; !exists {
		e.state.Players[playerID] = &PlayerInfo{
			ID:              playerID,
			Score:           0,
			Lines:           0,
			GarbageReceived: 0,
			Matrix:          [][]int{},
			Finished:        false,
		}
		if _, hasWins := e.state.Wins[playerID]; !hasWins {
			e.state.Wins[playerID] = 0
		}
		e.Broadcast()
	}
}

func (e *PKAttackEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if e.State == engine.StateWaiting {
		delete(e.state.Players, playerID)
		delete(e.state.Wins, playerID)
		e.Broadcast()
	} else if e.State == engine.StatePlaying {
		if p, ok := e.state.Players[playerID]; ok {
			p.Finished = true
			e.checkGameEnd()
			e.Broadcast()
		}
	}
}

func (e *PKAttackEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.state.Players[playerID]
	return exists
}

func (e *PKAttackEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var act ActionPayload
	if err := json.Unmarshal(payload, &act); err == nil && act.Action != "" {
		actionType = act.Action
	}

	// Handle Start
	if actionType == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		e.state.Seed = time.Now().UnixMilli()
		e.state.GlobalStartAt = time.Now().Add(3 * time.Second).UnixMilli()

		// Reset all players for the new round
		for _, p := range e.state.Players {
			p.Score = 0
			p.Lines = 0
			p.GarbageReceived = 0
			p.Matrix = [][]int{}
			p.Finished = false
		}
		e.state.Winners = []string{}

		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			e.state.GlobalStartAt = time.Now().UnixMilli()
		})

		return e.State, nil
	}

	if (actionType == string(domain.ActionRestartGame) || act.Action == string(domain.ActionRestartGame)) && e.State == engine.StateFinished {
		// Reset Wins only when someone has won the series (reached target)
		seriesOver := false
		if e.state.Target > 0 {
			for _, w := range e.state.Wins {
				if w >= e.state.Target {
					seriesOver = true
					break
				}
			}
		}
		if seriesOver {
			for p := range e.state.Wins {
				e.state.Wins[p] = 0
			}
		}

		e.State = engine.StateWaiting
		e.state.Winners = []string{}
		for _, p := range e.state.Players {
			p.Score = 0
			p.Lines = 0
			p.GarbageReceived = 0
			p.Matrix = [][]int{}
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
			p.Lines = act.Lines
			if act.Matrix != nil {
				p.Matrix = act.Matrix
			}
			e.Broadcast()

		case "attack":
			// A player cleared multiple lines, send garbage to opponents
			if act.Lines > 0 {
				for otherID, otherP := range e.state.Players {
					if otherID != playerID && !otherP.Finished {
						otherP.GarbageReceived += act.Lines
					}
				}
				e.Broadcast()
			}

		case "game_over", string(domain.ActionForfeit):
			if act.Score > 0 {
				p.Score = act.Score
			}
			if act.Lines > 0 {
				p.Lines = act.Lines
			}
			p.Finished = true
			e.checkGameEnd()
			e.Broadcast()
		}
	}

	return e.State, nil
}

func (e *PKAttackEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	e.state.Status = string(e.State)
	return e.state
}

func (e *PKAttackEngine) checkGameEnd() {
	totalPlayers := len(e.state.Players)

	// If 2 or more players, any time only 1 player remains alive, they immediately win by KO!
	if totalPlayers >= 2 {
		var alive []string
		for id, p := range e.state.Players {
			if !p.Finished {
				alive = append(alive, id)
			}
		}

		if len(alive) == 1 {
			e.State = engine.StateFinished
			e.state.Winners = alive
			for _, w := range alive {
				e.state.Wins[w]++
			}
			return
		} else if len(alive) == 0 {
			// All died, compare scores
			e.State = engine.StateFinished
			maxScore := -1
			for _, p := range e.state.Players {
				if p.Score > maxScore {
					maxScore = p.Score
				}
			}
			var winners []string
			for id, p := range e.state.Players {
				if p.Score == maxScore && maxScore >= 0 {
					winners = append(winners, id)
				}
			}
			e.state.Winners = winners
			for _, w := range winners {
				e.state.Wins[w]++
			}
			return
		}
		return
	}

	// 1 player room / solo practice
	allFinished := true
	for _, p := range e.state.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}

	if allFinished {
		e.State = engine.StateFinished
		var winners []string
		for id := range e.state.Players {
			winners = append(winners, id)
		}
		e.state.Winners = winners
		for _, w := range winners {
			e.state.Wins[w]++
		}
	}
}

func (e *PKAttackEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.state.Winners
}
