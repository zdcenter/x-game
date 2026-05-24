package domain

import (
	"time"
)

type GameConfig struct {
	ID        string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Rules     string    `gorm:"type:text" json:"rules"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
