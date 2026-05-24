package minesweeper

import (
	"math/rand"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type CellState int

const (
	CellHidden CellState = iota
	CellRevealed
	CellFlagged
	CellExploded
)

type Cell struct {
	X         int       `json:"x"`
	Y         int       `json:"y"`
	IsMine    bool      `json:"-"` // Don't expose mines to clients!
	State     CellState `json:"state"`
	Neighbors int       `json:"neighbors"` // Number of adjacent mines
	Owner     string    `json:"owner,omitempty"` // ID of the player who claimed it
}

type Board struct {
	Width       int       `json:"width"`
	Height      int       `json:"height"`
	Mines       int       `json:"mines"`
	Cells       [][]*Cell `json:"cells"`
	Status      engine.GameState `json:"status"`
	RevealedCnt int       `json:"revealed_cnt"`
	StartAt     int64     `json:"start_at,omitempty"`
}

func NewBoard(width, height, mines int) *Board {
	b := &Board{
		Width:  width,
		Height: height,
		Mines:  mines,
		Status: engine.StatePlaying,
		Cells:  make([][]*Cell, height),
	}

	for y := 0; y < height; y++ {
		b.Cells[y] = make([]*Cell, width)
		for x := 0; x < width; x++ {
			b.Cells[y][x] = &Cell{
				X:     x,
				Y:     y,
				State: CellHidden,
			}
		}
	}

	b.placeMines()
	b.calculateNeighbors()

	return b
}

func (b *Board) placeMines() {
	rand.Seed(time.Now().UnixNano())
	placed := 0
	for placed < b.Mines {
		x := rand.Intn(b.Width)
		y := rand.Intn(b.Height)
		if !b.Cells[y][x].IsMine {
			b.Cells[y][x].IsMine = true
			placed++
		}
	}
}

func (b *Board) calculateNeighbors() {
	dirs := []struct{ dx, dy int }{
		{-1, -1}, {0, -1}, {1, -1},
		{-1, 0}, {1, 0},
		{-1, 1}, {0, 1}, {1, 1},
	}

	for y := 0; y < b.Height; y++ {
		for x := 0; x < b.Width; x++ {
			if b.Cells[y][x].IsMine {
				continue
			}

			count := 0
			for _, d := range dirs {
				nx, ny := x+d.dx, y+d.dy
				if b.isValid(nx, ny) && b.Cells[ny][nx].IsMine {
					count++
				}
			}
			b.Cells[y][x].Neighbors = count
		}
	}
}

func (b *Board) isValid(x, y int) bool {
	return x >= 0 && x < b.Width && y >= 0 && y < b.Height
}

func (b *Board) Clone() *Board {
	newBoard := &Board{
		Width:       b.Width,
		Height:      b.Height,
		Mines:       b.Mines,
		Status:      b.Status,
		RevealedCnt: b.RevealedCnt,
		StartAt:     b.StartAt,
		Cells:       make([][]*Cell, b.Height),
	}

	for y := 0; y < b.Height; y++ {
		newBoard.Cells[y] = make([]*Cell, b.Width)
		for x := 0; x < b.Width; x++ {
			oldCell := b.Cells[y][x]
			newBoard.Cells[y][x] = &Cell{
				X:         oldCell.X,
				Y:         oldCell.Y,
				IsMine:    oldCell.IsMine,
				State:     oldCell.State,
				Neighbors: oldCell.Neighbors,
				Owner:     oldCell.Owner,
			}
		}
	}
	return newBoard
}
