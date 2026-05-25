package domain

import (
	"time"
)

type GameConfig struct {
	ID        string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Overview  string    `gorm:"type:text" json:"overview"`
	Rules     string    `gorm:"type:text" json:"rules"`
	Config    string    `gorm:"type:jsonb" json:"config"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
