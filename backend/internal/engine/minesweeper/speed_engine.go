package minesweeper

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type SpeedEngine struct {
	BaseBoard *Board // Used to generate the initial seed
	Boards    map[string]*Board
	Scores    map[string]int
	Cooldowns map[string]int64
	Status    engine.GameState
}

type PKSpeedStateResponse struct {
	Boards    map[string]*Board `json:"boards"`
	Scores    map[string]int    `json:"scores"`
	Cooldowns map[string]int64  `json:"cooldowns"`
	Status    engine.GameState  `json:"status"`
}

func (e *SpeedEngine) InitGame(options interface{}) error {
	width, height, mines := 16, 16, 40

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			switch diff {
			case "easy":
				width, height, mines = 9, 9, 10
			case "hard":
				width, height, mines = 30, 16, 99
			case "medium":
				fallthrough
			default:
				width, height, mines = 16, 16, 40
			}
		}
	}

	e.BaseBoard = NewBoard(width, height, mines)
	e.Boards = make(map[string]*Board)
	e.Scores = make(map[string]int)
	e.Cooldowns = make(map[string]int64)
	e.Status = engine.StateWaiting

	return nil
}

func (e *SpeedEngine) AddPlayer(playerID string) {
	if _, exists := e.Boards[playerID]; !exists {
		// Clone the base board for this player
		e.Boards[playerID] = e.BaseBoard.Clone()
		e.Boards[playerID].Status = engine.StateWaiting
		e.Scores[playerID] = 0
	}
}

func (e *SpeedEngine) RemovePlayer(playerID string) {
	delete(e.Boards, playerID)
	delete(e.Scores, playerID)
}

func (e *SpeedEngine) GetState() interface{} {
	return PKSpeedStateResponse{
		Boards:    e.Boards,
		Scores:    e.Scores,
		Cooldowns: e.Cooldowns,
		Status:    e.Status,
	}
}

func (e *SpeedEngine) SetStarting() {
	e.Status = engine.StateStarting
	for _, b := range e.Boards {
		b.Status = engine.StateStarting
		b.StartAt = time.Now().Add(3 * time.Second).UnixMilli()
	}
}

func (e *SpeedEngine) StartPlayingAndRevealSafe() {
	e.Status = engine.StatePlaying
	now := time.Now().UnixMilli()

	for _, b := range e.Boards {
		b.Status = engine.StatePlaying
		b.StartAt = now

		// Find a safe 0-neighbor zone to reveal for each player
		for y := 0; y < b.Height; y++ {
			for x := 0; x < b.Width; x++ {
				if !b.Cells[y][x].IsMine && b.Cells[y][x].Neighbors == 0 {
					e.revealCell(b, x, y)
					goto NextBoard
				}
			}
		}
	NextBoard:
	}
}

func (e *SpeedEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	if e.Status != engine.StatePlaying {
		return e.Status, errors.New("game is not in playing state")
	}

	board, exists := e.Boards[playerID]
	if !exists {
		return e.Status, errors.New("player not found")
	}

	// Check cooldown
	if until, exists := e.Cooldowns[playerID]; exists {
		if time.Now().UnixMilli() < until {
			return e.Status, errors.New("you are frozen")
		}
	}

	var action PlayerAction
	if err := json.Unmarshal(payload, &action); err != nil {
		return e.Status, err
	}

	if !board.isValid(action.X, action.Y) {
		return e.Status, errors.New("invalid coordinates")
	}

	cell := board.Cells[action.Y][action.X]

	if cell.State != CellHidden {
		return e.Status, errors.New("cell already processed")
	}

	switch action.Type {
	case "reveal":
		if cell.IsMine {
			// Explode and freeze for 3 seconds
			cell.State = CellExploded
			e.Cooldowns[playerID] = time.Now().UnixMilli() + 3000
		} else {
			e.revealCell(board, action.X, action.Y)
		}
	case "flag":
		if cell.IsMine {
			cell.State = CellFlagged
			cell.Owner = playerID
		} else {
			// Incorrect flag, freeze for 3 seconds
			e.Cooldowns[playerID] = time.Now().UnixMilli() + 3000
		}
	default:
		return e.Status, errors.New("unknown action type")
	}

	e.checkWinCondition(playerID)

	return e.Status, nil
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
	if e.Status == engine.StateFinished {
		return
	}

	board := e.Boards[playerID]
	totalSafeCells := (board.Width * board.Height) - board.Mines

	if board.RevealedCnt == totalSafeCells {
		e.Status = engine.StateFinished
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
	if e.Status == engine.StateFinished {
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
