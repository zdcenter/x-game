package domain

import (
	"time"

	"gorm.io/gorm"
)

type FriendshipStatus string

const (
	FriendshipPending  FriendshipStatus = "pending"
	FriendshipAccepted FriendshipStatus = "accepted"
)

type Friendship struct {
	ID        uint             `gorm:"primarykey" json:"id"`
	UserID    uint             `gorm:"index;not null" json:"user_id"`
	FriendID  uint             `gorm:"index;not null" json:"friend_id"`
	Status    FriendshipStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`

	// Relationships
	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Friend *User `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
}
