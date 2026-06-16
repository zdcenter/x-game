package domain

import "time"

type AchievementRarity string

const (
	RarityCommon    AchievementRarity = "common"    // +10 xp
	RarityRare      AchievementRarity = "rare"      // +20 xp
	RarityEpic      AchievementRarity = "epic"      // +35 xp
	RarityLegendary AchievementRarity = "legendary" // +50 xp
)

// Achievement defines an achievement badge — stored in gm_achievements.
type Achievement struct {
	ID              string            `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Category        string            `gorm:"type:varchar(30);index" json:"category"`
	TitleKey        string            `gorm:"type:varchar(100)" json:"title_key"`
	DescKey         string            `gorm:"type:varchar(100)" json:"desc_key"`
	IconEmoji       string            `gorm:"type:varchar(10)" json:"icon_emoji"`
	Rarity          AchievementRarity `gorm:"type:varchar(20)" json:"rarity"`
	XPReward        int               `gorm:"default:10" json:"xp_reward"`
	ConditionType   string            `gorm:"type:varchar(50)" json:"condition_type"`
	ConditionParams string            `gorm:"type:jsonb;default:'{}'" json:"condition_params"`
	SortOrder       int               `gorm:"default:0" json:"sort_order"`
	IsActive        bool              `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// UserAchievement records which achievements a user has unlocked — gm_user_achievements.
type UserAchievement struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"index;not null" json:"user_id"`
	AchievementID string    `gorm:"type:varchar(50);index;not null" json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}
