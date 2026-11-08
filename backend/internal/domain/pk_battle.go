package domain

import "time"

// PKBattle represents a finished head-to-head match between two registered members.
// Strict rule: Only recorded when BOTH winner and loser are registered members (role != 'guest').
type PKBattle struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	RoomID      string    `gorm:"type:varchar(64);index" json:"room_id"`
	GameID      string    `gorm:"type:varchar(32);index;not null" json:"game_id"`
	Mode        string    `gorm:"type:varchar(24);not null" json:"mode"`
	Difficulty  string    `gorm:"type:varchar(24);not null" json:"difficulty"`
	WinnerID    uint      `gorm:"index;not null" json:"winner_id"`
	Winner      *User     `gorm:"foreignKey:WinnerID" json:"winner,omitempty"`
	WinnerScore int       `json:"winner_score"`
	WinnerTime  int       `json:"winner_time"` // In seconds
	LoserID     uint      `gorm:"index;not null" json:"loser_id"`
	Loser       *User     `gorm:"foreignKey:LoserID" json:"loser,omitempty"`
	LoserScore  int       `json:"loser_score"`
	LoserTime   int       `json:"loser_time"` // In seconds
	Margin      int       `json:"margin"`     // Time difference (seconds) or score difference
	BountyCoins int       `json:"bounty_coins"`
	PlayedAt    time.Time `gorm:"index;not null" json:"played_at"`
}

