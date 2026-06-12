package domain

import "time"

// AdPlacement represents a location in the app where ads can be shown.
type AdPlacement struct {
	ID              string       `gorm:"primaryKey;type:varchar(50)" json:"id"` // e.g. "hint_ad", "lobby_banner", "interstitial"
	Name            string       `gorm:"type:varchar(100);not null" json:"name"`
	Desc            string       `gorm:"type:varchar(255)" json:"desc"`
	IsEnabled       bool         `gorm:"default:true" json:"is_enabled"`
	DailyTotalLimit int          `gorm:"default:-1" json:"daily_total_limit"` // -1 means unlimited
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
	Networks        []AdNetwork  `gorm:"foreignKey:PlacementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"networks"`
}

// AdNetwork represents a specific ad provider's configuration for a placement.
type AdNetwork struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PlacementID  string    `gorm:"type:varchar(50);index;not null" json:"placement_id"`
	Provider     string    `gorm:"type:varchar(50);not null" json:"provider"` // e.g. "google_admob", "unity_ads"
	SlotID       string    `gorm:"type:varchar(255);not null" json:"slot_id"`
	Priority     int       `gorm:"default:0" json:"priority"` // lower number = higher priority
	LimitPerUser int       `gorm:"default:-1" json:"limit_per_user"` // -1 means unlimited
	IsEnabled    bool      `gorm:"default:true" json:"is_enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
