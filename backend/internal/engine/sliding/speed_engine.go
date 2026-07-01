package sliding

import (
	"github.com/x-game/backend/internal/domain"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type SpeedEngine struct {
	engine.BaseEngine
	BaseBoard     *Board
	Boards        map[string]*Board
	Winners       []string
	Wins          map[string]int // Accumulated round wins across restarts
	Target        int            // Series target: first to win Target rounds wins
	GlobalStartAt int64
}

func init() {
	engine.RegisterGame("sliding")
	engine.Register("sliding_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

type PKSpeedStateResponse struct {
	Boards        map[string]*Board `json:"boards"`
	Winners       []string          `json:"winners"`
	Wins          map[string]int    `json:"wins"`
	Target        int               `json:"target"`
	Status        engine.GameState  `json:"status"`
	GlobalStartAt int64             `json:"globalStartAt"`
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	size := 4 // Default

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			if strings.HasPrefix(diff, "custom_") {
				parts := strings.Split(diff, "_")
				if len(parts) >= 2 {
					if s, err := strconv.Atoi(parts[1]); err == nil && s >= 3 && s <= 10 {
						size = s
					}
				}
			} else {
				switch diff {
				case string(domain.DiffEasy), "beginner":
					size = 4
				case string(domain.DiffMedium), "intermediate":
					size = 5
				case string(domain.DiffHard), "advanced":
					size = 6
				}
			}
		}

		if t, ok := opts["target"].(int); ok && t > 0 {
			e.Target = t
		} else {
			e.Target = 1
		}
	} else {
		e.Target = 1
	}

	e.BaseBoard = NewBoard(size)
	e.BaseBoard.Shuffle(size * size * 100) // Shuffle

	e.Boards = make(map[string]*Board)
	e.Winners = make([]string, 0)
	e.Wins = make(map[string]int)
	e.State = engine.StateWaiting

	return nil
}

func (e *SpeedEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.Boards[playerID]; !exists {
		e.Boards[playerID] = e.BaseBoard.Clone()
		e.Boards[playerID].Status = engine.StateWaiting
		if _, hasWins := e.Wins[playerID]; !hasWins {
			e.Wins[playerID] = 0
		}
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Boards, playerID)
	delete(e.Wins, playerID)
}

func (e *SpeedEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Boards[playerID]
	return exists
}

func (e *SpeedEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return PKSpeedStateResponse{
		Boards:        e.Boards,
		Winners:       e.Winners,
		Wins:          e.Wins,
		Target:        e.Target,
		Status:        e.State,
		GlobalStartAt: e.GlobalStartAt,
	}
}

func (e *SpeedEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseAction struct {
		Action string `json:"action"`
		Idx    int    `json:"idx"`
	}
	if err := json.Unmarshal(payload, &baseAction); err != nil {
		return e.State, err
	}

	if baseAction.Action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		startAt := time.Now().Add(3 * time.Second).UnixMilli()
		e.GlobalStartAt = startAt
		for _, b := range e.Boards {
			b.Status = engine.StateStarting
			b.StartAt = startAt
		}

		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			now := time.Now().UnixMilli()
			e.GlobalStartAt = now
			for _, b := range e.Boards {
				b.Status = engine.StatePlaying
				b.StartAt = now
			}
		})
		return e.State, nil
	}

	if (actionType == string(domain.ActionRestartGame) || baseAction.Action == string(domain.ActionRestartGame)) && e.State == engine.StateFinished {
		// Reset Wins only when someone has won the series
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
		e.BaseBoard.Shuffle(e.BaseBoard.Size * e.BaseBoard.Size * 100)
		for _, b := range e.Boards {
			b.Status = engine.StateWaiting
			b.Moves = 0
			newBoard := e.BaseBoard.Clone()
			b.Cells = newBoard.Cells
			b.EmptyIdx = newBoard.EmptyIdx
			b.StartAt = 0
		}
		return e.State, nil
	}

	if baseAction.Action == string(domain.ActionForfeit) {
		e.RemovePlayer(playerID)
		if len(e.Boards) == 0 {
			e.State = engine.StateFinished
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, errors.New("game not playing")
	}

	b, exists := e.Boards[playerID]
	if !exists {
		return e.State, errors.New("player not found")
	}

	if b.Status != engine.StatePlaying {
		return e.State, errors.New("player board not playing")
	}

	if baseAction.Action == string(domain.ActionMove) {
		if b.Move(baseAction.Idx) {
			if b.CheckWin() {
				b.Status = engine.StateFinished
				e.Winners = append(e.Winners, playerID)
				e.Wins[playerID]++

				// End game for everyone
				e.State = engine.StateFinished
				for _, otherBoard := range e.Boards {
					otherBoard.Status = engine.StateFinished
				}
			}
			return e.State, nil
		}
		return e.State, errors.New("invalid move")
	}

	return e.State, errors.New("unknown action")
}

func (e *SpeedEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}
