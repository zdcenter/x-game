package tetris

import (
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

	e.state = &GameState{
		Players: make(map[string]*PlayerInfo),
		Seed:    time.Now().UnixMilli(),
		Winners: []string{},
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
		e.Broadcast()
	}
}

func (e *PKAttackEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if e.State == engine.StateWaiting {
		delete(e.state.Players, playerID)
		e.Broadcast()
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
	if actionType == "start" && e.State == engine.StateWaiting {
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

	if actionType == "restart_game" && e.State == engine.StateFinished {
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
		case "update":
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

		case "game_over", "forfeit":
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
	allFinished := true
	var alive []string

	for id, p := range e.state.Players {
		if !p.Finished {
			allFinished = false
			alive = append(alive, id)
		}
	}

	if len(e.state.Players) > 1 {
		if len(alive) <= 1 {
			e.State = engine.StateFinished
			e.state.Winners = alive
		}
	} else {
		if allFinished {
			e.State = engine.StateFinished
		}
	}
}

func (e *PKAttackEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.state.Winners
}
