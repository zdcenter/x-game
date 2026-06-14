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
	Neighbors int       `json:"neighbors"`       // Number of adjacent mines
	Owner     string    `json:"owner,omitempty"` // ID of the player who claimed it
}

type Board struct {
	Width         int              `json:"width"`
	Height        int              `json:"height"`
	Mines         int              `json:"mines"`
	Cells         [][]*Cell        `json:"cells"`
	Status        engine.GameState `json:"status"`
	RevealedCnt   int              `json:"revealed_cnt"`
	StartAt       int64            `json:"start_at,omitempty"`
	IsMinesPlaced bool             `json:"is_mines_placed"`
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
	return b
}

func (b *Board) GenerateMines(excludeX, excludeY int) {
	if b.IsMinesPlaced {
		return
	}
	b.placeMines(excludeX, excludeY)
	b.calculateNeighbors()
	b.IsMinesPlaced = true
}

func (b *Board) placeMines(excludeX, excludeY int) {
	rand.Seed(time.Now().UnixNano())

	// Create a safe zone around the excluded coordinate
	safeZone := make(map[struct{ x, y int }]bool)
	if excludeX != -1 && excludeY != -1 {
		for dy := -1; dy <= 1; dy++ {
			for dx := -1; dx <= 1; dx++ {
				nx, ny := excludeX+dx, excludeY+dy
				if b.isValid(nx, ny) {
					safeZone[struct{ x, y int }{nx, ny}] = true
				}
			}
		}
	}

	placed := 0
	attempts := 0
	maxAttempts := b.Width * b.Height * 10

	for placed < b.Mines && attempts < maxAttempts {
		attempts++
		x := rand.Intn(b.Width)
		y := rand.Intn(b.Height)

		// If we are struggling to place mines, drop the safe zone requirement
		if safeZone[struct{ x, y int }{x, y}] && attempts < maxAttempts/2 {
			continue
		}

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

func (b *Board) FindSafeStartPoint() (int, int) {
	// 1. Try to find a 0
	var zeroes []struct{ x, y int }
	for y := 0; y < b.Height; y++ {
		for x := 0; x < b.Width; x++ {
			if !b.Cells[y][x].IsMine && b.Cells[y][x].Neighbors == 0 {
				zeroes = append(zeroes, struct{ x, y int }{x, y})
			}
		}
	}
	if len(zeroes) > 0 {
		pt := zeroes[rand.Intn(len(zeroes))]
		return pt.x, pt.y
	}

	// 2. Try to find lowest number
	for target := 1; target <= 8; target++ {
		var candidates []struct{ x, y int }
		for y := 0; y < b.Height; y++ {
			for x := 0; x < b.Width; x++ {
				if !b.Cells[y][x].IsMine && b.Cells[y][x].Neighbors == target {
					candidates = append(candidates, struct{ x, y int }{x, y})
				}
			}
		}
		if len(candidates) > 0 {
			pt := candidates[rand.Intn(len(candidates))]
			return pt.x, pt.y
		}
	}

	// 3. Fallback to any non-mine
	for y := 0; y < b.Height; y++ {
		for x := 0; x < b.Width; x++ {
			if !b.Cells[y][x].IsMine {
				return x, y
			}
		}
	}
	return 0, 0
}

func (b *Board) Clone() *Board {
	newBoard := &Board{
		Width:         b.Width,
		Height:        b.Height,
		Mines:         b.Mines,
		Status:        b.Status,
		RevealedCnt:   b.RevealedCnt,
		StartAt:       b.StartAt,
		IsMinesPlaced: b.IsMinesPlaced,
		Cells:         make([][]*Cell, b.Height),
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
