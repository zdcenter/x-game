package domain

import "time"

// UserDailyQuest tracks the user's progress for daily automated quests — gm_user_daily_quests
type UserDailyQuest struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Date      string    `gorm:"type:varchar(10);index;not null" json:"date"` // "2026-10-18"
	QuestID   string    `gorm:"type:varchar(30);not null" json:"quest_id"`   // "solo_play", "pk_play", "win_game", "daily_chest"
	Current   int       `gorm:"default:0" json:"current"`
	Target    int       `gorm:"default:1" json:"target"`
	XPAmount  int       `gorm:"default:0" json:"xp_amount"`
	Completed bool      `gorm:"default:false" json:"completed"`
	Claimed   bool      `gorm:"default:false" json:"claimed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
