package domain

import (
	"time"

	"gorm.io/gorm"
)

type Role string
type Status string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
	RoleGuest Role = "guest"
)

const (
	StatusActive Status = "active"
	StatusBanned Status = "banned"
)

type User struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	Username      string         `gorm:"uniqueIndex;not null" json:"username"`
	Password      string         `gorm:"not null" json:"-"` // never return password
	Avatar        string         `json:"avatar"`
	Role          Role           `gorm:"type:varchar(20);default:'user'" json:"role"`
	Status        Status         `gorm:"type:varchar(20);default:'active'" json:"status"`
	XP            int            `gorm:"default:0" json:"xp"`
	Level         int            `gorm:"default:1" json:"level"`
	LoginStreak   int            `gorm:"default:0" json:"login_streak"`
	LastLoginDate string         `gorm:"type:varchar(10);default:''" json:"last_login_date"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
