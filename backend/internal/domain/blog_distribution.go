package domain

import "time"

type BlogDistribution struct {
	ID           uint      `gorm:"primaryKey"                                        json:"id"`
	PostID       uint      `gorm:"uniqueIndex:idx_post_platform_lang;not null"        json:"post_id"`
	Platform     string    `gorm:"uniqueIndex:idx_post_platform_lang;type:varchar(30);not null" json:"platform"`
	Lang         string    `gorm:"uniqueIndex:idx_post_platform_lang;type:varchar(5);not null"  json:"lang"`
	LastCopiedAt time.Time `json:"last_copied_at"`
	CopyCount    int       `gorm:"default:0" json:"copy_count"`
	PublishedURL string    `gorm:"type:varchar(500)" json:"published_url"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
