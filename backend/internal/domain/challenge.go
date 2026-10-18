package domain

import "time"

// GhostChallenge represents an asynchronous player challenge on a specific game board
type GhostChallenge struct {
	ID             string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	ChallengerID   uint      `gorm:"index;not null" json:"challenger_id"`
	ChallengerName string    `gorm:"type:varchar(100);not null" json:"challenger_name"`
	GameID         string    `gorm:"type:varchar(50);not null" json:"game_id"`
	Mode           string    `gorm:"type:varchar(50);default:'single'" json:"mode"`
	Difficulty     string    `gorm:"type:varchar(50);default:''" json:"difficulty"`
	Seed           string    `gorm:"type:text" json:"seed"`
	TargetScore    int       `gorm:"default:0" json:"target_score"`
	TargetTime     int       `gorm:"default:0" json:"target_time"`
	AcceptCount    int       `gorm:"default:0" json:"accept_count"`
	BeatenCount    int       `gorm:"default:0" json:"beaten_count"`
	CreatedAt      time.Time `json:"created_at"`
}
