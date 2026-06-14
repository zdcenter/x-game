package domain

import (
	"time"
)

// UserGameStat represents a user's personal best record for a specific game, mode, and difficulty
type UserGameStat struct {
	ID         uint   `gorm:"primarykey"`
	UserID     uint   `gorm:"index;not null"` // Link to User.ID
	GameID     string `gorm:"index;not null"` // e.g. 'hexa', 'minesweeper'
	Mode       string `gorm:"index;not null"` // e.g. 'single'
	Difficulty string `gorm:"index;not null"` // e.g. 'standard', '3x3', '' for no difficulty
	BestScore  int    `gorm:"default:0"`      // Highest score achieved
	BestTime   int    `gorm:"default:0"`      // Fastest time in seconds (0 means not achieved)
	PlayCount  int    `gorm:"default:0"`      // Total games played
	WinCount   int    `gorm:"default:0"`      // Total games won (for applicable games)
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
