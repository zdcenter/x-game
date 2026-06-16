package domain

import "time"

// DailyChallenge is the scheduled challenge for each calendar day — gm_daily_challenges.
type DailyChallenge struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Date       string    `gorm:"type:varchar(10);uniqueIndex;not null" json:"date"` // "2024-01-15"
	GameID     string    `gorm:"type:varchar(30);not null" json:"game_id"`
	Mode       string    `gorm:"type:varchar(20);default:'single'" json:"mode"`
	Difficulty string    `gorm:"type:varchar(20)" json:"difficulty"`
	PuzzleID   *uint     `json:"puzzle_id"`                            // for sudoku/math24/sokoban
	Config     string    `gorm:"type:jsonb;default:'{}'" json:"config"` // random seed etc.
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// UserDailyChallenge tracks whether a user completed a daily challenge — gm_user_daily_challenges.
type UserDailyChallenge struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           uint      `gorm:"index;not null" json:"user_id"`
	DailyChallengeID uint      `gorm:"index;not null" json:"daily_challenge_id"`
	CompletedAt      time.Time `json:"completed_at"`
	Score            int       `json:"score"`
	TimeTaken        int       `json:"time_taken"`
	XPEarned         int       `json:"xp_earned"`
}
