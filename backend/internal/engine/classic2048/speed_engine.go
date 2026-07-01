package classic2048

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

type SpeedEngine struct {
	engine.BaseEngine
	Boards        map[string]*Board
	Winners       []string
	Wins          map[string]int // Accumulated round wins across restarts
	Target        int            // Series target: first to win Target rounds wins
	GlobalStartAt int64
	BoardSize     int
	WinTarget     int // e.g., 2048
}

func init() {
	engine.RegisterGame("classic2048")
	engine.Register("classic2048_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

type PKSpeedStateResponse struct {
	Boards        map[string]*Board `json:"boards"`
	Winners       []string          `json:"winners"`
	Wins          map[string]int    `json:"wins"`
	Target        int               `json:"target"`
	Status        engine.GameState  `json:"status"`
	GlobalStartAt int64             `json:"globalStartAt"`
	BoardSize     int               `json:"boardSize"`
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	e.BoardSize = 4 // Default
	e.WinTarget = 2048

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			if strings.HasPrefix(diff, "custom_") {
				parts := strings.Split(diff, "_")
				if len(parts) >= 2 {
					if s, err := strconv.Atoi(parts[1]); err == nil && s >= 3 && s <= 8 {
						e.BoardSize = s
					}
				}
			} else {
				switch diff {
				case string(domain.DiffEasy):
					e.BoardSize = 5
				case string(domain.DiffMedium):
					e.BoardSize = 4
				case string(domain.DiffHard):
					e.BoardSize = 3
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
		e.Boards[playerID] = NewBoard(e.BoardSize)
		e.Boards[playerID].Status = string(engine.StateWaiting)
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
		BoardSize:     e.BoardSize,
	}
}

func (e *SpeedEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseAction struct {
		Action string `json:"action"`
		Dir    string `json:"dir"` // up, down, left, right
	}
	if err := json.Unmarshal(payload, &baseAction); err != nil {
		return e.State, err
	}

	if baseAction.Action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		startAt := time.Now().Add(3 * time.Second).UnixMilli()
		e.GlobalStartAt = startAt
		for _, b := range e.Boards {
			b.Status = string(engine.StateStarting)
			b.StartAt = startAt
		}

		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			now := time.Now().UnixMilli()
			e.GlobalStartAt = now
			for _, b := range e.Boards {
				b.Status = string(engine.StatePlaying)
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
		for _, b := range e.Boards {
			newBoard := NewBoard(e.BoardSize)
			b.Cells = newBoard.Cells
			b.Score = 0
			b.Status = string(engine.StateWaiting)
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

	if b.Status != string(engine.StatePlaying) {
		return e.State, errors.New("player board not playing")
	}

	if baseAction.Action == string(domain.ActionMove) {
		if b.Move(baseAction.Dir) {
			if b.CheckWin(e.WinTarget) {
				b.Status = string(engine.StateFinished)
				e.Winners = append(e.Winners, playerID)
				e.Wins[playerID]++

				// End game for everyone
				e.State = engine.StateFinished
				for _, otherBoard := range e.Boards {
					otherBoard.Status = string(engine.StateFinished)
				}
			} else if b.CheckGameOver() {
				// Player loses / gets stuck. In speed mode, maybe they just lose this round?
				// To keep it simple, if they get stuck, they forfeit the round.
				// Wait, if it's single player, they just lose. In PK, if they stuck, they lose if other player hasn't.
				b.Status = string(engine.StateFinished)
				
				// Check if everyone is finished
				allFinished := true
				for _, otherBoard := range e.Boards {
					if otherBoard.Status == string(engine.StatePlaying) {
						allFinished = false
						break
					}
				}
				if allFinished {
					e.State = engine.StateFinished
					
					// Determine winner by highest score since nobody reached the target
					maxScore := -1
					for _, bBoard := range e.Boards {
						if bBoard.Score > maxScore {
							maxScore = bBoard.Score
						}
					}
					
					for pID, bBoard := range e.Boards {
						if bBoard.Score == maxScore {
							e.Winners = append(e.Winners, pID)
							e.Wins[pID]++
						}
					}
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
