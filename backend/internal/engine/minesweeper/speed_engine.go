package minesweeper

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type SpeedEngine struct {
	engine.BaseEngine
	BaseBoard *Board // Used to generate the initial seed
	Boards    map[string]*Board
	Scores    map[string]int
	Cooldowns map[string]int64
	Errors    map[string]int
	PenaltyMs int64
}

func init() {
	engine.Register("minesweeper_pk_speed", func() engine.GameEngine { return &SpeedEngine{} })
}

type PKSpeedStateResponse struct {
	Boards    map[string]*Board `json:"boards"`
	Scores    map[string]int    `json:"scores"`
	Cooldowns map[string]int64  `json:"cooldowns"`
	Errors    map[string]int    `json:"errors"`
	Status    engine.GameState  `json:"status"`
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	width, height, mines := 16, 16, 40

	if opts, ok := options.(map[string]interface{}); ok {
		if penalty, ok := opts["penaltySeconds"].(float64); ok {
			e.PenaltyMs = int64(penalty * 1000)
		} else if penalty, ok := opts["penaltySeconds"].(int); ok {
			e.PenaltyMs = int64(penalty * 1000)
		} else {
			e.PenaltyMs = 3000
		}

		if diff, ok := opts["difficulty"].(string); ok {
			if strings.HasPrefix(diff, "custom_") {
				parts := strings.Split(diff, "_")
				if len(parts) == 4 {
					if w, err := strconv.Atoi(parts[1]); err == nil && w > 0 {
						width = w
					}
					if h, err := strconv.Atoi(parts[2]); err == nil && h > 0 {
						height = h
					}
					if m, err := strconv.Atoi(parts[3]); err == nil && m > 0 {
						mines = m
					}
				}
			} else {
				switch diff {
				case "easy", "beginner":
					width, height, mines = 9, 9, 10
				case "medium", "intermediate":
					width, height, mines = 16, 16, 40
				case "hard", "advanced":
					width, height, mines = 30, 16, 99
				case "hard_mode":
					width, height, mines = 30, 18, 130
				case "professional":
					width, height, mines = 30, 20, 160
				case "master":
					width, height, mines = 30, 22, 190
				case "expert":
					width, height, mines = 30, 24, 230
				default:
					width, height, mines = 16, 16, 40
				}
			}
		}
	}

	e.BaseBoard = NewBoard(width, height, mines)
	e.BaseBoard.GenerateMines(-1, -1) // PK mode always generates immediately
	e.Boards = make(map[string]*Board)
	e.Scores = make(map[string]int)
	e.Cooldowns = make(map[string]int64)
	e.Errors = make(map[string]int)
	e.State = engine.StateWaiting

	return nil
}

func (e *SpeedEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Boards[playerID]; !exists {
		// Clone the base board for this player
		e.Boards[playerID] = e.BaseBoard.Clone()
		e.Boards[playerID].Status = engine.StateWaiting
		e.Scores[playerID] = 0
		e.Errors[playerID] = 0
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Boards, playerID)
	delete(e.Scores, playerID)
	delete(e.Errors, playerID)
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
		Boards:    e.Boards,
		Scores:    e.Scores,
		Cooldowns: e.Cooldowns,
		Errors:    e.Errors,
		Status:    e.State,
	}
}

func (e *SpeedEngine) SetStarting() {
	e.State = engine.StateStarting
	for _, b := range e.Boards {
		b.Status = engine.StateStarting
		b.StartAt = time.Now().Add(3 * time.Second).UnixMilli()
	}
}

func (e *SpeedEngine) StartPlayingAndRevealSafe() {
	e.State = engine.StatePlaying
	now := time.Now().UnixMilli()

	// Find the best safe start point on the base board
	x, y := e.BaseBoard.FindSafeStartPoint()

	for _, b := range e.Boards {
		b.Status = engine.StatePlaying
		b.StartAt = now
		e.revealCell(b, x, y)
	}
}

func (e *SpeedEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	// Parse generic action from payload
	var baseAction struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseAction); err == nil {
		if baseAction.Action == "start" && e.State == engine.StateWaiting {
			for _, b := range e.Boards {
				b.Status = engine.StateStarting
				b.StartAt = time.Now().Add(3 * time.Second).UnixMilli()
			}
			
			engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
				now := time.Now().UnixMilli()
				x, y := e.BaseBoard.FindSafeStartPoint()
				for _, b := range e.Boards {
					b.Status = engine.StatePlaying
					b.StartAt = now
					e.revealCell(b, x, y)
				}
			})
			return e.State, nil
		}
		
		if baseAction.Action == "forfeit" {
			e.RemovePlayer(playerID)
			if len(e.Boards) == 0 {
				e.State = engine.StateFinished
			}
			return e.State, nil
		}
	}

	if (actionType == "restart_game" || baseAction.Action == "restart_game") && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		// We need a new base board to randomize mines
		e.BaseBoard = NewBoard(e.BaseBoard.Width, e.BaseBoard.Height, e.BaseBoard.Mines)
		e.BaseBoard.GenerateMines(-1, -1)
		
		for _, b := range e.Boards {
			b.Status = engine.StateWaiting
			// Clone new board
			newBoard := e.BaseBoard.Clone()
			b.Cells = newBoard.Cells
			b.RevealedCnt = 0
		}
		
		for playerID := range e.Scores {
			e.Scores[playerID] = 0
			e.Errors[playerID] = 0
		}
		e.Cooldowns = make(map[string]int64)
		
		e.Broadcast()
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, errors.New("game is not in playing state")
	}

	board, exists := e.Boards[playerID]
	if !exists {
		return e.State, errors.New("player not found")
	}

	// Check cooldown
	if until, exists := e.Cooldowns[playerID]; exists {
		if time.Now().UnixMilli() < until {
			return e.State, errors.New("you are frozen")
		}
	}

	var action PlayerAction
	if err := json.Unmarshal(payload, &action); err != nil {
		return e.State, err
	}

	if !board.isValid(action.X, action.Y) {
		return e.State, errors.New("invalid coordinates")
	}

	cell := board.Cells[action.Y][action.X]

	if cell.State != CellHidden {
		return e.State, errors.New("cell already processed")
	}

	switch action.Type {
	case "reveal":
		if cell.IsMine {
			cell.State = CellExploded
			e.Errors[playerID]++
			penalty := e.PenaltyMs + int64(e.Errors[playerID]-1)*2000
			e.Cooldowns[playerID] = time.Now().UnixMilli() + penalty
		} else {
			e.revealCell(board, action.X, action.Y)
		}
	case "flag":
		if cell.IsMine {
			cell.State = CellFlagged
			// Fix: Do not increment RevealedCnt on flag, otherwise players win early 
			// because RevealedCnt reaches totalSafeCells before the board is clear.
		} else {
			e.Errors[playerID]++
			penalty := e.PenaltyMs + int64(e.Errors[playerID]-1)*2000
			e.Cooldowns[playerID] = time.Now().UnixMilli() + penalty
		}
	default:
		return e.State, errors.New("unknown action type")
	}

	e.checkWinCondition(playerID)

	return e.State, nil
}

func (e *SpeedEngine) revealCell(b *Board, x, y int) {
	cell := b.Cells[y][x]
	if cell.State != CellHidden {
		return
	}

	cell.State = CellRevealed
	b.RevealedCnt++

	if cell.Neighbors == 0 && !cell.IsMine {
		dirs := []struct{ dx, dy int }{
			{-1, -1}, {0, -1}, {1, -1},
			{-1, 0}, {1, 0},
			{-1, 1}, {0, 1}, {1, 1},
		}
		for _, d := range dirs {
			nx, ny := x+d.dx, y+d.dy
			if b.isValid(nx, ny) {
				e.revealCell(b, nx, ny)
			}
		}
	}
}

func (e *SpeedEngine) checkWinCondition(playerID string) {
	if e.State == engine.StateFinished {
		return
	}

	board := e.Boards[playerID]
	totalSafeCells := (board.Width * board.Height) - board.Mines

	// Fix: Use >= as a robust check in case of any flood fill multi-increments,
	// ensuring the win condition is never skipped.
	if board.RevealedCnt >= totalSafeCells {
		e.State = engine.StateFinished
		e.Scores[playerID] = 1 // Mark the winner with score 1
		// Reveal remaining mines for all players to show game over state
		for _, b := range e.Boards {
			b.Status = engine.StateFinished
			for y := 0; y < b.Height; y++ {
				for x := 0; x < b.Width; x++ {
					if b.Cells[y][x].IsMine && b.Cells[y][x].State == CellHidden {
						b.Cells[y][x].State = CellRevealed
					}
				}
			}
		}
	}
}

func (e *SpeedEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	
	if e.State == engine.StateFinished {
		var winners []string
		for p, s := range e.Scores {
			if s > 0 {
				winners = append(winners, p)
			}
		}
		return true, winners
	}
	return false, nil
}
