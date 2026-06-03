package domain

import (
	"time"
)

type SudokuDifficulty string

const (
	SudokuDifficultyEasy   SudokuDifficulty = "easy"
	SudokuDifficultyMedium SudokuDifficulty = "medium"
	SudokuDifficultyHard   SudokuDifficulty = "hard"
	SudokuDifficultyExpert SudokuDifficulty = "expert"
)

// SudokuPuzzle represents a pre-generated Sudoku puzzle.
type SudokuPuzzle struct {
	ID         string           `gorm:"primarykey;type:varchar(50)" json:"id"` // E.g., SUDOKU-EASY-001
	Difficulty SudokuDifficulty `gorm:"index;type:varchar(20);not null" json:"difficulty"`
	Puzzle     string           `gorm:"type:varchar(81);not null" json:"puzzle"` // 81 char string of digits and '-'
	Solution   string           `gorm:"type:varchar(81);not null" json:"solution"`
	CreatedAt  time.Time        `json:"created_at"`
}

type SudokuStatus string

const (
	SudokuStatusPlaying  SudokuStatus = "playing"
	SudokuStatusFinished SudokuStatus = "finished"
)

// UserSudokuProgress tracks a user's progress on a specific puzzle.
type UserSudokuProgress struct {
	ID        uint         `gorm:"primarykey" json:"id"`
	UserID    uint         `gorm:"uniqueIndex:idx_user_sudoku_puzzle;not null" json:"user_id"`
	PuzzleID  string       `gorm:"uniqueIndex:idx_user_sudoku_puzzle;type:varchar(50);not null" json:"puzzle_id"`
	Status       SudokuStatus `gorm:"type:varchar(20);default:'playing'" json:"status"`
	CurrentState string       `gorm:"type:text" json:"current_state"`
	TimeSpent int          `gorm:"default:0" json:"time_spent"` // Time spent in seconds
	Stars     int          `gorm:"default:0" json:"stars"`      // Star rating (1-3)
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}
