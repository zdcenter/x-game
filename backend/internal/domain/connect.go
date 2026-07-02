package domain

import (
	"time"
)

type ConnectDifficulty string

const (
	ConnectDifficultyEasy   ConnectDifficulty = "easy"
	ConnectDifficultyMedium ConnectDifficulty = "medium"
	ConnectDifficultyHard   ConnectDifficulty = "hard"
	ConnectDifficultyExpert ConnectDifficulty = "expert"
)

// ConnectPuzzle represents a pre-generated Connect (Flow Free) puzzle.
type ConnectPuzzle struct {
	ID         string            `gorm:"primarykey;type:varchar(50)" json:"id"` // E.g., CONNECT-EASY-001
	Difficulty ConnectDifficulty `gorm:"index;type:varchar(20);not null" json:"difficulty"`
	Width      int               `gorm:"not null" json:"width"`
	Height     int               `gorm:"not null" json:"height"`
	Endpoints  string            `gorm:"type:text;not null" json:"endpoints"` // JSON string: [{"color": 1, "p1": [x, y], "p2": [x, y]}, ...]
	Blocks     string            `gorm:"type:text" json:"blocks"`             // JSON string: [[x, y], ...]
	CreatedAt  time.Time         `json:"created_at"`
}

type ConnectStatus string

const (
	ConnectStatusPlaying  ConnectStatus = "playing"
	ConnectStatusFinished ConnectStatus = "finished"
)

// UserConnectProgress tracks a user's progress on a specific Connect puzzle.
type UserConnectProgress struct {
	ID           uint          `gorm:"primarykey" json:"id"`
	UserID       uint          `gorm:"uniqueIndex:idx_user_connect_puzzle;not null" json:"user_id"`
	PuzzleID     string        `gorm:"uniqueIndex:idx_user_connect_puzzle;type:varchar(50);not null" json:"puzzle_id"`
	Status       ConnectStatus `gorm:"type:varchar(20);default:'playing'" json:"status"`
	CurrentState string        `gorm:"type:text" json:"current_state"` // Current drawing paths
	TimeSpent    int           `gorm:"default:0" json:"time_spent"`    // Time spent in seconds
	Stars        int           `gorm:"default:0" json:"stars"`         // Star rating (1-3)
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}
