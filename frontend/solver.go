package main

import (
	"fmt"
)

var (
	rows = [][]int{
		{3, 1, 1},
		{2, 2, 3},
		{5, 3},
		{1, 4, 1, 1},
		{2, 1, 2},
		{2, 4},
		{1, 3, 3},
		{1, 1, 2},
		{2, 1, 1},
		{1, 2, 1},
	}
	cols = [][]int{
		{4, 2, 1},
		{3, 2, 1},
		{1, 3, 1, 1},
		{2, 1, 2},
		{4, 3},
		{2, 1, 1},
		{1, 2, 2},
		{4, 3},
		{2, 5},
		{1, 2},
	}
)

func main() {
	board := make([][]int, 10)
	for i := range board {
		board[i] = make([]int, 10)
	}

	solutions := 0
	var solve func(r, c int)
	solve = func(r, c int) {
		if r == 10 {
			if isValid() {
				solutions++
				printBoard(board)
			}
			return
		}

		nextR, nextC := r, c+1
		if nextC == 10 {
			nextR, nextC = r+1, 0
		}

		// Try empty (0)
		board[r][c] = 0
		if checkValid(board, r, c) {
			solve(nextR, nextC)
		}

		// Try filled (1)
		board[r][c] = 1
		if checkValid(board, r, c) {
			solve(nextR, nextC)
		}
	}

	solve(0, 0)
	fmt.Printf("Total solutions: %d\n", solutions)
}

func checkValid(board [][]int, r, c int) bool {
    // Basic partial check can be done, but let's just do a simple one
    return true 
}

func isValidBoard(board [][]int) bool {
	for i := 0; i < 10; i++ {
		if !checkLine(board[i], rows[i]) {
			return false
		}
		
		colLine := make([]int, 10)
		for j := 0; j < 10; j++ {
			colLine[j] = board[j][i]
		}
		if !checkLine(colLine, cols[i]) {
			return false
		}
	}
	return true
}

func checkLine(line []int, clues []int) bool {
	var blocks []int
	current := 0
	for _, val := range line {
		if val == 1 {
			current++
		} else if current > 0 {
			blocks = append(blocks, current)
			current = 0
		}
	}
	if current > 0 {
		blocks = append(blocks, current)
	}

	if len(blocks) != len(clues) {
		return false
	}
	for i := range blocks {
		if blocks[i] != clues[i] {
			return false
		}
	}
	return true
}

func isValid() bool {
    return false // replaced in next step
}

func printBoard(board [][]int) {
	for i := 0; i < 10; i++ {
		for j := 0; j < 10; j++ {
			if board[i][j] == 1 {
				fmt.Print("O ")
			} else {
				fmt.Print(". ")
			}
		}
		fmt.Println()
	}
	fmt.Println()
}
