package domain

import (
	"time"

	"github.com/google/uuid"
)

type Feedback struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Username   string     `gorm:"size:100" json:"username,omitempty"`
	GameID     string     `gorm:"size:50;index" json:"game_id"`
	Level      string     `gorm:"size:100" json:"level"`
	Type       string     `gorm:"size:30;default:'bug'" json:"type"` // bug, suggestion, wrong_answer, other
	Content    string     `gorm:"type:text;not null" json:"content"`
	DeviceInfo string     `gorm:"type:text" json:"device_info"`
	Contact    string     `gorm:"size:100" json:"contact"`
	Status     string     `gorm:"size:20;default:'pending'" json:"status"` // pending, resolving, resolved, ignored
	AdminNote  string     `gorm:"type:text" json:"admin_note,omitempty"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}
