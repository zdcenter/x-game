package domain

import "time"

type ContentDistribution struct {
	ID           uint      `gorm:"primaryKey"                                            json:"id"`
	ArticleID    uint      `gorm:"uniqueIndex:idx_content_dist;not null"                 json:"article_id"`
	Platform     string    `gorm:"uniqueIndex:idx_content_dist;type:varchar(30);not null" json:"platform"`
	Lang         string    `gorm:"uniqueIndex:idx_content_dist;type:varchar(5);not null"  json:"lang"`
	LastCopiedAt time.Time `json:"last_copied_at"`
	CopyCount    int       `gorm:"default:0" json:"copy_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
