package nonogram

import (
	"math/rand"
	"time"
)

type Generator struct {
	rnd *rand.Rand
}

func NewGenerator() *Generator {
	return &Generator{
		rnd: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Generate creates a uniquely solvable nonogram puzzle of given size.
// Returns (answerGrid, rowHints, colHints). answerGrid is 1 for filled, 0 for empty.
func (g *Generator) Generate(width, height int) ([][]int, [][]int, [][]int) {
	for {
		grid := g.generateRandomGrid(width, height)
		rowHints, colHints := ExtractHints(grid)

		// Try to solve it with logic only
		solved, _ := SolveLogic(width, height, rowHints, colHints)
		if solved {
			return grid, rowHints, colHints
		}
	}
}

func (g *Generator) generateRandomGrid(width, height int) [][]int {
	grid := make([][]int, height)
	// Usually 50-60% fill density makes for good puzzles
	for y := 0; y < height; y++ {
		grid[y] = make([]int, width)
		for x := 0; x < width; x++ {
			if g.rnd.Float32() < 0.55 {
				grid[y][x] = 1
			}
		}
	}
	return grid
}

func ExtractHints(grid [][]int) ([][]int, [][]int) {
	height := len(grid)
	if height == 0 {
		return nil, nil
	}
	width := len(grid[0])

	rowHints := make([][]int, height)
	for y := 0; y < height; y++ {
		rowHints[y] = getLineHints(grid[y])
	}

	colHints := make([][]int, width)
	for x := 0; x < width; x++ {
		col := make([]int, height)
		for y := 0; y < height; y++ {
			col[y] = grid[y][x]
		}
		colHints[x] = getLineHints(col)
	}

	return rowHints, colHints
}

func getLineHints(line []int) []int {
	var hints []int
	count := 0
	for _, val := range line {
		if val == 1 {
			count++
		} else if count > 0 {
			hints = append(hints, count)
			count = 0
		}
	}
	if count > 0 {
		hints = append(hints, count)
	}
	if len(hints) == 0 {
		hints = []int{0}
	}
	return hints
}

// SolveLogic attempts to solve the puzzle using pure deduction.
// Returns true if fully solved without guessing.
func SolveLogic(width, height int, rowHints, colHints [][]int) (bool, [][]int) {
	// state: 0=unknown, 1=filled, 2=crossed
	state := make([][]int, height)
	for y := 0; y < height; y++ {
		state[y] = make([]int, width)
	}

	changed := true
	for changed {
		changed = false

		// Process rows
		for y := 0; y < height; y++ {
			lineChanged, ok := processLine(state[y], rowHints[y])
			if !ok {
				return false, nil // Invalid state
			}
			if lineChanged {
				changed = true
			}
		}

		// Process cols
		for x := 0; x < width; x++ {
			col := make([]int, height)
			for y := 0; y < height; y++ {
				col[y] = state[y][x]
			}
			lineChanged, ok := processLine(col, colHints[x])
			if !ok {
				return false, nil
			}
			if lineChanged {
				changed = true
				for y := 0; y < height; y++ {
					state[y][x] = col[y]
				}
			}
		}
	}

	// Check if any unknown cells remain
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			if state[y][x] == 0 {
				return false, state // Needs guessing
			}
		}
	}

	return true, state
}

func processLine(line []int, hints []int) (bool, bool) {
	n := len(line)
	// Find all valid arrangements of hints that match current line state
	var validArrangements [][]int
	
	// Fast path for 0 hints
	if len(hints) == 1 && hints[0] == 0 {
		changed := false
		for i := 0; i < n; i++ {
			if line[i] == 1 {
				return false, false
			}
			if line[i] == 0 {
				line[i] = 2
				changed = true
			}
		}
		return changed, true
	}

	var backtrack func(idx, hintIdx int, current []int)
	backtrack = func(idx, hintIdx int, current []int) {
		// If we placed all hints, fill the rest with 2 (crossed)
		if hintIdx == len(hints) {
			for i := idx; i < n; i++ {
				if line[i] == 1 {
					return // Invalid, can't put empty where filled is required
				}
				current[i] = 2
			}
			// Copy current arrangement
			valid := make([]int, n)
			copy(valid, current)
			validArrangements = append(validArrangements, valid)
			return
		}

		h := hints[hintIdx]
		// Calculate remaining space needed
		needed := 0
		for i := hintIdx; i < len(hints); i++ {
			needed += hints[i]
		}
		needed += len(hints) - 1 - hintIdx

		// Try placing the hint at various starting positions
		maxStart := n - needed
		for start := idx; start <= maxStart; start++ {
			// Check if we can place empty cells up to 'start'
			canPlaceEmpties := true
			for i := idx; i < start; i++ {
				if line[i] == 1 {
					canPlaceEmpties = false
					break
				}
				current[i] = 2
			}
			if !canPlaceEmpties {
				continue // Can't start here, and any further start would skip a mandatory filled cell
			}

			// Check if we can place the hint block
			canPlaceBlock := true
			for i := start; i < start+h; i++ {
				if line[i] == 2 {
					canPlaceBlock = false
					break
				}
				current[i] = 1
			}
			
			// Must have at least one empty cell after block, unless it's the end of line
			if canPlaceBlock {
				if start+h < n {
					if line[start+h] == 1 {
						canPlaceBlock = false
					} else {
						current[start+h] = 2
					}
					if canPlaceBlock {
						backtrack(start+h+1, hintIdx+1, current)
					}
				} else {
					backtrack(start+h, hintIdx+1, current)
				}
			}
		}
	}

	current := make([]int, n)
	backtrack(0, 0, current)

	if len(validArrangements) == 0 {
		return false, false
	}

	changed := false
	for i := 0; i < n; i++ {
		if line[i] == 0 { // If unknown
			firstVal := validArrangements[0][i]
			allSame := true
			for _, arr := range validArrangements {
				if arr[i] != firstVal {
					allSame = false
					break
				}
			}
			if allSame {
				line[i] = firstVal
				changed = true
			}
		}
	}

	return changed, true
}
