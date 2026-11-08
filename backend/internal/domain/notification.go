package domain

import (
	"time"

	"gorm.io/gorm"
)

type NotificationType string

const (
	NotificationRecordBroken NotificationType = "record_broken"
	NotificationSystem       NotificationType = "system"
)

type Notification struct {
	ID           uint             `gorm:"primarykey" json:"id"`
	UserID       uint             `gorm:"index;not null" json:"user_id"` // Receiver (User A)
	SenderID     uint             `gorm:"index;default:0" json:"sender_id"` // Breaker (User B)
	SenderName   string           `gorm:"size:100" json:"sender_name"`
	SenderAvatar string           `gorm:"size:255" json:"sender_avatar"`
	Type         NotificationType `gorm:"size:50;default:'record_broken'" json:"type"`
	GameID       string           `gorm:"size:50;index" json:"game_id"`
	Difficulty   string           `gorm:"size:50" json:"difficulty"`
	OldRecord    int              `json:"old_record"`
	NewRecord    int              `json:"new_record"`
	RankType     string           `gorm:"size:20;default:'time'" json:"rank_type"` // "time" or "score"
	Title        string           `gorm:"size:200" json:"title"`
	Content      string           `gorm:"type:text" json:"content"`
	IsRead       bool             `gorm:"default:false;index" json:"is_read"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
	DeletedAt    gorm.DeletedAt   `gorm:"index" json:"-"`

	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Sender *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

