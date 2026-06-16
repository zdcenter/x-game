package domain

import (
	"time"
)

type SokobanDifficulty string

const (
	SokobanDifficultyBeginner     SokobanDifficulty = "easy"
	SokobanDifficultyIntermediate SokobanDifficulty = "medium"
	SokobanDifficultyAdvanced     SokobanDifficulty = "hard"
	SokobanDifficultyProfessional SokobanDifficulty = "expert"
)

// SokobanPuzzle represents a predefined Sokoban puzzle
type SokobanPuzzle struct {
	ID         string            `gorm:"primarykey;type:varchar(50)" json:"id"` // e.g., SOKO-EASY-001
	Difficulty SokobanDifficulty `gorm:"index;type:varchar(20);not null" json:"difficulty"`
	LevelNum   int               `gorm:"not null" json:"level_num"`
	Puzzle     string            `gorm:"type:text;not null" json:"puzzle"` // The map string
	CreatedAt  time.Time         `json:"created_at"`
}

type SokobanStatus string

const (
	SokobanStatusPlaying  SokobanStatus = "playing"
	SokobanStatusFinished SokobanStatus = "finished"
)

// UserSokobanProgress tracks a user's progress on a specific puzzle
type UserSokobanProgress struct {
	ID        uint          `gorm:"primarykey" json:"id"`
	UserID    uint          `gorm:"uniqueIndex:idx_user_soko_puzzle;not null" json:"user_id"`
	PuzzleID  string        `gorm:"uniqueIndex:idx_user_soko_puzzle;type:varchar(50);not null" json:"puzzle_id"`
	Status    SokobanStatus `gorm:"type:varchar(20);default:'playing'" json:"status"`
	Moves     int           `gorm:"default:0" json:"moves"`
	TimeSpent int           `gorm:"default:0" json:"time_spent"` // Time spent in seconds
	Stars     int           `gorm:"default:0" json:"stars"`      // Star rating (1-3)
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}
