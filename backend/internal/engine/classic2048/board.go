package classic2048

import (
	"math/rand"
	"time"
)

type Board struct {
	Cells   [][]int `json:"cells"`
	Score   int     `json:"score"`
	Status  string  `json:"status"`
	StartAt int64   `json:"startAt"`
}

func NewBoard(size int) *Board {
	cells := make([][]int, size)
	for i := range cells {
		cells[i] = make([]int, size)
	}
	b := &Board{
		Cells: cells,
	}
	b.spawnTile()
	b.spawnTile()
	return b
}

func (b *Board) Clone() *Board {
	cells := make([][]int, len(b.Cells))
	for i, row := range b.Cells {
		cells[i] = make([]int, len(row))
		copy(cells[i], row)
	}
	return &Board{
		Cells:   cells,
		Score:   b.Score,
		Status:  b.Status,
		StartAt: b.StartAt,
	}
}

func (b *Board) spawnTile() {
	var emptyCoords [][2]int
	for r := 0; r < len(b.Cells); r++ {
		for c := 0; c < len(b.Cells[r]); c++ {
			if b.Cells[r][c] == 0 {
				emptyCoords = append(emptyCoords, [2]int{r, c})
			}
		}
	}
	if len(emptyCoords) == 0 {
		return
	}
	// Note: in Go 1.20+ math/rand is automatically seeded, but for safety:
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	idx := r.Intn(len(emptyCoords))
	coord := emptyCoords[idx]
	val := 2
	if r.Float32() < 0.1 {
		val = 4
	}
	b.Cells[coord[0]][coord[1]] = val
}

// Move applies the 2048 logic for moving tiles. dir: "up", "down", "left", "right"
// Returns whether the board changed.
func (b *Board) Move(dir string) bool {
	size := len(b.Cells)
	changed := false

	// Rotate board so we only need to implement "left" slide
	rotations := 0
	switch dir {
	case "up":
		rotations = 3
	case "right":
		rotations = 2
	case "down":
		rotations = 1
	case "left":
		rotations = 0
	default:
		return false
	}

	for i := 0; i < rotations; i++ {
		b.rotateRight()
	}

	// Apply left slide
	for r := 0; r < size; r++ {
		// Compress
		newRow := make([]int, size)
		idx := 0
		for c := 0; c < size; c++ {
			if b.Cells[r][c] != 0 {
				newRow[idx] = b.Cells[r][c]
				idx++
			}
		}

		// Merge
		for c := 0; c < size-1; c++ {
			if newRow[c] != 0 && newRow[c] == newRow[c+1] {
				newRow[c] *= 2
				b.Score += newRow[c]
				newRow[c+1] = 0
				changed = true
			}
		}

		// Compress again after merge
		finalRow := make([]int, size)
		idx = 0
		for c := 0; c < size; c++ {
			if newRow[c] != 0 {
				finalRow[idx] = newRow[c]
				idx++
			}
		}

		// Check if changed
		for c := 0; c < size; c++ {
			if b.Cells[r][c] != finalRow[c] {
				changed = true
			}
			b.Cells[r][c] = finalRow[c]
		}
	}

	// Rotate back
	for i := 0; i < (4 - rotations) % 4; i++ {
		b.rotateRight()
	}

	if changed {
		b.spawnTile()
	}

	return changed
}

func (b *Board) rotateRight() {
	size := len(b.Cells)
	newCells := make([][]int, size)
	for i := range newCells {
		newCells[i] = make([]int, size)
	}
	for r := 0; r < size; r++ {
		for c := 0; c < size; c++ {
			newCells[c][size-1-r] = b.Cells[r][c]
		}
	}
	b.Cells = newCells
}

func (b *Board) CheckWin(target int) bool {
	for r := 0; r < len(b.Cells); r++ {
		for c := 0; c < len(b.Cells[r]); c++ {
			if b.Cells[r][c] >= target {
				return true
			}
		}
	}
	return false
}

func (b *Board) CheckGameOver() bool {
	// If any empty cell, not over
	for r := 0; r < len(b.Cells); r++ {
		for c := 0; c < len(b.Cells[r]); c++ {
			if b.Cells[r][c] == 0 {
				return false
			}
		}
	}
	// If any adjacent cells can merge, not over
	for r := 0; r < len(b.Cells); r++ {
		for c := 0; c < len(b.Cells[r]); c++ {
			val := b.Cells[r][c]
			if r > 0 && b.Cells[r-1][c] == val {
				return false
			}
			if r < len(b.Cells)-1 && b.Cells[r+1][c] == val {
				return false
			}
			if c > 0 && b.Cells[r][c-1] == val {
				return false
			}
			if c < len(b.Cells[r])-1 && b.Cells[r][c+1] == val {
				return false
			}
		}
	}
	return true
}
