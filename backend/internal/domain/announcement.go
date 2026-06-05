package domain

import "time"

// Announcement represents a global scrolling message displayed in the game lobby.
type Announcement struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
