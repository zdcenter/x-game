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
	rand.Seed(time.Now().UnixNano())
	for i := 0; i < moves; i++ {
		neighbors := b.getValidNeighbors(b.EmptyIdx)
		if len(neighbors) > 0 {
			nextIdx := neighbors[rand.Intn(len(neighbors))]
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

func (b *Board) Move(idx int) bool {
	if idx < 0 || idx >= b.Size*b.Size {
		return false
	}
	
	size := b.Size
	emptyRow, emptyCol := b.EmptyIdx/size, b.EmptyIdx%size
	targetRow, targetCol := idx/size, idx%size

	// Check if adjacent (Manhattan distance == 1)
	distRow := emptyRow - targetRow
	distCol := emptyCol - targetCol
	if distRow < 0 {
		distRow = -distRow
	}
	if distCol < 0 {
		distCol = -distCol
	}

	if distRow+distCol == 1 {
		b.Cells[b.EmptyIdx], b.Cells[idx] = b.Cells[idx], b.Cells[b.EmptyIdx]
		b.EmptyIdx = idx
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
