package domain

import (
	"time"
)

type GameConfig struct {
	ID         string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Config     string    `gorm:"type:jsonb" json:"config"`
	IsActive   bool      `gorm:"default:true" json:"isActive"`
	VisitCount int       `gorm:"default:0" json:"visitCount"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// GameMetaConfig is the typed representation of GameConfig.Config JSON.
// Fields here are managed via Admin UI and served by GET /api/v1/games/meta.
// Engine-specific params (e.g. penaltySeconds) live alongside these fields.
type GameMetaConfig struct {
	Priority     int                   `json:"priority,omitempty"`  // 推荐/置顶权重 (0..99，越大越靠前)
	BadgeType    string                `json:"badgeType,omitempty"` // 角标标识: "" | "none" | "pinned" | "new" | "hot"
	Icon         string                `json:"icon,omitempty"`
	MultiRound   bool                  `json:"multiRound,omitempty"`
	Modes        []GameModeInfo        `json:"modes,omitempty"`
	Difficulties []GameDiffInfo        `json:"difficulties,omitempty"`
	FinishFlow   *GameFinishFlowConfig `json:"finishFlow,omitempty"`
}

type GameFinishFlowConfig struct {
	WinAction       string `json:"winAction,omitempty"`       // "modal" | "auto_next"
	LoseAction      string `json:"loseAction,omitempty"`      // "modal" | "board_overlay" | "auto_restart"
	AutoNextAdFreq  int    `json:"autoNextAdFreq,omitempty"`  // -1: 继承全局, 0: 关闭广告, >0: 自定义频次
	AutoNextDelayMs int    `json:"autoNextDelayMs,omitempty"` // 自动流转等待毫秒 (默认 1500)
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
