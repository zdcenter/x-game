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
	GlobalStartAt int64
}

func init() {
	engine.Register("sliding_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

type PKSpeedStateResponse struct {
	Boards        map[string]*Board `json:"boards"`
	Winners       []string          `json:"winners"`
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
				case "easy", "beginner":
					size = 4
				case "medium", "intermediate":
					size = 5
				case "hard", "advanced":
					size = 6
				}
			}
		}
	}

	e.BaseBoard = NewBoard(size)
	e.BaseBoard.Shuffle(size * size * 100) // Shuffle

	e.Boards = make(map[string]*Board)
	e.Winners = make([]string, 0)
	e.State = engine.StateWaiting

	return nil
}

func (e *SpeedEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.Boards[playerID]; !exists {
		e.Boards[playerID] = e.BaseBoard.Clone()
		e.Boards[playerID].Status = engine.StateWaiting
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Boards, playerID)
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
		e.State = engine.StateWaiting
		e.Winners = []string{}
		for _, b := range e.Boards {
			b.Status = engine.StateWaiting
			b.Moves = 0
			// Need a new shuffled board for everyone
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
