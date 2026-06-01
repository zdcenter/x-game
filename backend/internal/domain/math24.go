package domain

import (
	"time"
)

type Math24Difficulty string

const (
	Math24DifficultyEasy   Math24Difficulty = "easy"
	Math24DifficultyMedium Math24Difficulty = "medium"
	Math24DifficultyHard   Math24Difficulty = "hard"
)

// Math24Puzzle represents a pre-generated Math24 puzzle.
type Math24Puzzle struct {
	ID         string           `gorm:"primarykey;type:varchar(50)" json:"id"` // E.g., M24-EASY-001
	Difficulty Math24Difficulty `gorm:"index;type:varchar(20);not null" json:"difficulty"`
	Cards      string           `gorm:"type:varchar(50);not null" json:"cards"` // E.g., "1,3,4,6"
	CreatedAt  time.Time        `json:"created_at"`
}

type Math24Status string

const (
	Math24StatusPlaying  Math24Status = "playing"
	Math24StatusFinished Math24Status = "finished"
)

// UserMath24Progress tracks a user's progress on a specific puzzle.
type UserMath24Progress struct {
	ID        uint         `gorm:"primarykey" json:"id"`
	UserID    uint         `gorm:"uniqueIndex:idx_user_m24_puzzle;not null" json:"user_id"`
	PuzzleID  string       `gorm:"uniqueIndex:idx_user_m24_puzzle;type:varchar(50);not null" json:"puzzle_id"`
	Status    Math24Status `gorm:"type:varchar(20);default:'playing'" json:"status"`
	TimeSpent int          `gorm:"default:0" json:"time_spent"` // Time spent in seconds
	Stars     int          `gorm:"default:0" json:"stars"`      // Star rating (1-3)
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}
