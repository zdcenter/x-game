package sliding

import (
	"math/rand"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type Board struct {
	Size     int              `json:"size"`
	Cells    []int            `json:"cells"`
	EmptyIdx int              `json:"emptyIdx"`
	Status   engine.GameState `json:"status"`
	StartAt  int64            `json:"startAt"`
	Moves    int              `json:"moves"`
}

func NewBoard(size int) *Board {
	cells := make([]int, size*size)
	for i := 0; i < size*size-1; i++ {
		cells[i] = i + 1
	}
	cells[size*size-1] = 0

	return &Board{
		Size:     size,
		Cells:    cells,
		EmptyIdx: size*size - 1,
		Status:   engine.StateWaiting,
		StartAt:  0,
		Moves:    0,
	}
}

func (b *Board) Clone() *Board {
	clonedCells := make([]int, len(b.Cells))
	copy(clonedCells, b.Cells)

	return &Board{
		Size:     b.Size,
		Cells:    clonedCells,
		EmptyIdx: b.EmptyIdx,
		Status:   b.Status,
		StartAt:  b.StartAt,
		Moves:    b.Moves,
	}
}

func (b *Board) Shuffle(moves int) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	lastIdx := -1
	for i := 0; i < moves; i++ {
		neighbors := b.getValidNeighbors(b.EmptyIdx)
		if len(neighbors) == 0 {
			continue
		}
		// Avoid immediately backtracking to the previous empty index to maximize entropy
		var candidates []int
		for _, n := range neighbors {
			if n != lastIdx {
				candidates = append(candidates, n)
			}
		}
		if len(candidates) == 0 {
			candidates = neighbors
		}

		nextIdx := candidates[r.Intn(len(candidates))]
		lastIdx = b.EmptyIdx
		b.Cells[b.EmptyIdx], b.Cells[nextIdx] = b.Cells[nextIdx], b.Cells[b.EmptyIdx]
		b.EmptyIdx = nextIdx
	}

	// Ensure the board does not start in an already-solved state
	if b.CheckWin() {
		neighbors := b.getValidNeighbors(b.EmptyIdx)
		if len(neighbors) > 0 {
			nextIdx := neighbors[r.Intn(len(neighbors))]
			b.Cells[b.EmptyIdx], b.Cells[nextIdx] = b.Cells[nextIdx], b.Cells[b.EmptyIdx]
			b.EmptyIdx = nextIdx
		}
	}
}

func (b *Board) getValidNeighbors(idx int) []int {
	size := b.Size
	row, col := idx/size, idx%size
	var neighbors []int

	if row > 0 {
		neighbors = append(neighbors, idx-size) // up
	}
	if row < size-1 {
		neighbors = append(neighbors, idx+size) // down
	}
	if col > 0 {
		neighbors = append(neighbors, idx-1) // left
	}
	if col < size-1 {
		neighbors = append(neighbors, idx+1) // right
	}

	return neighbors
}

// Move handles single tile or multi-tile line sliding towards the empty space.
func (b *Board) Move(idx int) bool {
	if idx < 0 || idx >= b.Size*b.Size || idx == b.EmptyIdx {
		return false
	}

	size := b.Size
	emptyRow, emptyCol := b.EmptyIdx/size, b.EmptyIdx%size
	targetRow, targetCol := idx/size, idx%size

	if emptyRow == targetRow {
		// Same row: slide all tiles between emptyCol and targetCol towards empty space
		if targetCol < emptyCol {
			for col := emptyCol - 1; col >= targetCol; col-- {
				curr := emptyRow*size + col
				b.Cells[b.EmptyIdx], b.Cells[curr] = b.Cells[curr], b.Cells[b.EmptyIdx]
				b.EmptyIdx = curr
			}
		} else {
			for col := emptyCol + 1; col <= targetCol; col++ {
				curr := emptyRow*size + col
				b.Cells[b.EmptyIdx], b.Cells[curr] = b.Cells[curr], b.Cells[b.EmptyIdx]
				b.EmptyIdx = curr
			}
		}
		b.Moves++
		return true
	}

	if emptyCol == targetCol {
		// Same column: slide all tiles between emptyRow and targetRow towards empty space
		if targetRow < emptyRow {
			for row := emptyRow - 1; row >= targetRow; row-- {
				curr := row*size + emptyCol
				b.Cells[b.EmptyIdx], b.Cells[curr] = b.Cells[curr], b.Cells[b.EmptyIdx]
				b.EmptyIdx = curr
			}
		} else {
			for row := emptyRow + 1; row <= targetRow; row++ {
				curr := row*size + emptyCol
				b.Cells[b.EmptyIdx], b.Cells[curr] = b.Cells[curr], b.Cells[b.EmptyIdx]
				b.EmptyIdx = curr
			}
		}
		b.Moves++
		return true
	}

	return false
}

func (b *Board) CheckWin() bool {
	size := b.Size
	for i := 0; i < size*size-1; i++ {
		if b.Cells[i] != i+1 {
			return false
		}
	}
	return b.Cells[size*size-1] == 0
}
