package domain

import "time"

// MatchHistory records every game played by a user — gm_match_histories.
type MatchHistory struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"index;not null" json:"user_id"`
	GameID     string    `gorm:"type:varchar(30);index" json:"game_id"`
	Mode       string    `gorm:"type:varchar(20)" json:"mode"`
	Difficulty string    `gorm:"type:varchar(20)" json:"difficulty"`
	Result     string    `gorm:"type:varchar(20)" json:"result"` // win/lose/completed
	Score      int       `json:"score"`
	TimeTaken  int       `json:"time_taken"`
	Opponents  string    `gorm:"type:jsonb;default:'[]'" json:"opponents"` // JSON []string
	XPEarned   int       `json:"xp_earned"`
	PlayedAt   time.Time `gorm:"index" json:"played_at"`
}
