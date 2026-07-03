package domain

import "time"

type HashiPuzzle struct {
	ID         string `gorm:"primarykey;type:varchar(50)" json:"id"`
	Difficulty string `gorm:"index;type:varchar(20)" json:"difficulty"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Content    string `gorm:"type:text" json:"content"` // JSON string representing the grid or islands
}

type UserHashiProgress struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex:idx_user_hashi_puzzle;not null" json:"user_id"`
	PuzzleID  string    `gorm:"uniqueIndex:idx_user_hashi_puzzle;type:varchar(50);not null" json:"puzzle_id"`
	Status    string    `gorm:"type:varchar(20);default:'playing'" json:"status"` // "playing" | "finished"
	TimeSpent int       `gorm:"default:0" json:"time_spent"`
	Stars     int       `gorm:"default:0" json:"stars"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
