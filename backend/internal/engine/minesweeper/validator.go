package minesweeper

import (
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type MinesweeperEngine struct {
	Board     *Board
	Scores    map[string]int
	Cooldowns map[string]int64 // Unix milliseconds
}

// Action structure for incoming payloads
type PlayerAction struct {
	Type string `json:"type"` // "reveal" or "flag"
	X    int    `json:"x"`
	Y    int    `json:"y"`
}

func (e *MinesweeperEngine) InitGame(options interface{}) error {
	// Default to medium
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

	e.Board = NewBoard(width, height, mines)
	e.Scores = make(map[string]int)
	e.Cooldowns = make(map[string]int64)

	// Determine if we should start in waiting mode
	if opts, ok := options.(map[string]interface{}); ok {
		if mode, ok := opts["mode"].(string); ok && mode != "single" {
			e.Board.Status = engine.StateWaiting
		}
	}

	return nil
}

func (e *MinesweeperEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	log.Printf("[DEBUG] HandleAction called by player=%s, payload=%s", playerID, string(payload))
	if e.Board.Status != engine.StatePlaying {
		log.Printf("[DEBUG] Rejecting %s: Game state is %s", playerID, e.Board.Status)
		return e.Board.Status, errors.New("game is not in playing state")
	}

	// Check cooldown
	if until, exists := e.Cooldowns[playerID]; exists {
		if time.Now().UnixMilli() < until {
			return e.Board.Status, errors.New("you are frozen")
		}
	}

	var action PlayerAction
	if err := json.Unmarshal(payload, &action); err != nil {
		return e.Board.Status, err
	}

	if !e.Board.isValid(action.X, action.Y) {
		return e.Board.Status, errors.New("invalid coordinates")
	}

	cell := e.Board.Cells[action.Y][action.X]

	if cell.State != CellHidden {
		return e.Board.Status, errors.New("cell already processed")
	}

	switch action.Type {
	case "reveal":
		if cell.IsMine {
			// Stepped on a mine! Explode, freeze for 3 seconds, no score.
			cell.State = CellExploded
			e.Cooldowns[playerID] = time.Now().UnixMilli() + 3000
		} else {
			e.revealCell(action.X, action.Y)
		}
	case "flag":
		if cell.IsMine {
			// Successfully defused a mine!
			cell.State = CellFlagged
			cell.Owner = playerID
			e.Scores[playerID]++
		} else {
			// Incorrect flag! Freeze for 3 seconds.
			e.Cooldowns[playerID] = time.Now().UnixMilli() + 3000
		}
	default:
		return e.Board.Status, errors.New("unknown action type")
	}

	e.checkWinCondition()

	return e.Board.Status, nil
}

func (e *MinesweeperEngine) revealCell(x, y int) {
	cell := e.Board.Cells[y][x]
	if cell.State != CellHidden {
		return
	}

	cell.State = CellRevealed
	e.Board.RevealedCnt++

	if cell.Neighbors == 0 && !cell.IsMine {
		// Flood fill
		dirs := []struct{ dx, dy int }{
			{-1, -1}, {0, -1}, {1, -1},
			{-1, 0}, {1, 0},
			{-1, 1}, {0, 1}, {1, 1},
		}
		for _, d := range dirs {
			nx, ny := x+d.dx, y+d.dy
			if e.Board.isValid(nx, ny) {
				e.revealCell(nx, ny)
			}
		}
	}
}

func (e *MinesweeperEngine) checkWinCondition() {
	if e.Board.Status == engine.StateFinished {
		return
	}
	
	// Game ends when all safe cells are revealed, OR all mines are processed (flagged/exploded)
	totalSafeCells := (e.Board.Width * e.Board.Height) - e.Board.Mines
	
	processedMines := 0
	for y := 0; y < e.Board.Height; y++ {
		for x := 0; x < e.Board.Width; x++ {
			c := e.Board.Cells[y][x]
			if c.IsMine && (c.State == CellFlagged || c.State == CellExploded) {
				processedMines++
			}
		}
	}

	if e.Board.RevealedCnt == totalSafeCells || processedMines == e.Board.Mines {
		e.Board.Status = engine.StateFinished
		e.revealAllMines() // Show any remaining hidden mines
	}
}

func (e *MinesweeperEngine) revealAllMines() {
	for y := 0; y < e.Board.Height; y++ {
		for x := 0; x < e.Board.Width; x++ {
			c := e.Board.Cells[y][x]
			if c.IsMine && c.State == CellHidden {
				c.State = CellRevealed // Neutral reveal at end of game
			}
		}
	}
}

func (e *MinesweeperEngine) CheckGameOver() (bool, []string) {
	if e.Board.Status == engine.StateFinished {
		// Find player with max score
		maxScore := -1
		var winners []string
		for p, s := range e.Scores {
			if s > maxScore {
				maxScore = s
				winners = []string{p}
			} else if s == maxScore {
				winners = append(winners, p) // Tie
			}
		}
		return true, winners
	}
	return false, nil
}

// Custom response to include Scores and Cooldowns
type PKStateResponse struct {
	Board     *Board           `json:"board"`
	Scores    map[string]int   `json:"scores"`
	Cooldowns map[string]int64 `json:"cooldowns"`
}

func (e *MinesweeperEngine) GetState() interface{} {
	return PKStateResponse{
		Board:     e.Board,
		Scores:    e.Scores,
		Cooldowns: e.Cooldowns,
	}
}

func (e *MinesweeperEngine) AddPlayer(playerID string) {
	if _, exists := e.Scores[playerID]; !exists {
		e.Scores[playerID] = 0
	}
}

func (e *MinesweeperEngine) RemovePlayer(playerID string) {
	delete(e.Scores, playerID)
}

func (e *MinesweeperEngine) SetStarting() {
	e.Board.Status = engine.StateStarting
	e.Board.StartAt = time.Now().Add(3 * time.Second).UnixMilli()
}

func (e *MinesweeperEngine) StartPlayingAndRevealSafe() {
	e.Board.Status = engine.StatePlaying
	e.Board.StartAt = time.Now().UnixMilli() // Record start time for elapsed timer

	// Find a safe 0-neighbor zone to reveal
	for y := 0; y < e.Board.Height; y++ {
		for x := 0; x < e.Board.Width; x++ {
			if !e.Board.Cells[y][x].IsMine && e.Board.Cells[y][x].Neighbors == 0 {
				e.revealCell(x, y)
				return // Only reveal one safe zone
			}
		}
	}
}
