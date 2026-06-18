package domain

import (
	"time"
)

type GameConfig struct {
	ID         string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name       string    `gorm:"type:varchar(100);not null" json:"name"`
	Overview   string    `gorm:"type:text" json:"overview"`
	Rules      string    `gorm:"type:text" json:"rules"`
	Config     string    `gorm:"type:jsonb" json:"config"`
	IsActive   bool      `gorm:"default:true" json:"isActive"`
	SortOrder  int       `gorm:"default:999" json:"sortOrder"`
	VisitCount int       `gorm:"default:0" json:"visitCount"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// GameMetaConfig is the typed representation of GameConfig.Config JSON.
// Fields here are managed via Admin UI and served by GET /api/v1/games/meta.
// Engine-specific params (e.g. penaltySeconds) live alongside these fields.
type GameMetaConfig struct {
	Icon         string         `json:"icon,omitempty"`
	MultiRound   bool           `json:"multiRound,omitempty"`
	Modes        []GameModeInfo `json:"modes,omitempty"`
	Difficulties []GameDiffInfo `json:"difficulties,omitempty"`
}

type GameModeInfo struct {
	ID       string `json:"id"`
	LabelKey string `json:"labelKey"`
	DescKey  string `json:"descKey,omitempty"`
	Icon     string `json:"icon,omitempty"`
}

type GameDiffInfo struct {
	ID       string `json:"id"`
	LabelKey string `json:"labelKey"`
	DescKey  string `json:"descKey,omitempty"`
	Desc     string `json:"desc,omitempty"`
}
