package domain

import "time"

type ContentArticle struct {
	ID         uint      `gorm:"primaryKey"                        json:"id"`
	Slug       string    `gorm:"type:varchar(120);uniqueIndex"     json:"slug"`
	CategoryID *uint     `gorm:"index"                             json:"category_id"`
	TitleEN    string    `gorm:"type:varchar(300)"                 json:"title_en"`
	TitleZH    string    `gorm:"type:varchar(300)"                 json:"title_zh"`
	DescEN     string    `gorm:"type:text"                         json:"desc_en"`
	DescZH     string    `gorm:"type:text"                         json:"desc_zh"`
	ContentEN  string    `gorm:"type:text"                         json:"content_en"`
	ContentZH  string    `gorm:"type:text"                         json:"content_zh"`
	TagsEN     string    `gorm:"type:varchar(600)"                 json:"tags_en"` // JSON array
	TagsZH     string    `gorm:"type:varchar(600)"                 json:"tags_zh"`
	AuthorEN   string    `gorm:"type:varchar(120)"                 json:"author_en"`
	AuthorZH   string    `gorm:"type:varchar(120)"                 json:"author_zh"`
	SourceURL  string    `gorm:"type:varchar(500)"                 json:"source_url"`
	CoverImage string    `gorm:"type:varchar(500)"                 json:"cover_image"`
	Published  bool      `gorm:"default:false;index"               json:"published"`
	SortOrder  int       `gorm:"default:0;index"                   json:"sort_order"`
	Date       string    `gorm:"type:varchar(10)"                  json:"date"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
