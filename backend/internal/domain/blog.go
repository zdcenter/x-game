package domain

import "time"

type BlogPost struct {
	ID         uint      `gorm:"primaryKey"                   json:"id"`
	Slug       string    `gorm:"type:varchar(120);uniqueIndex" json:"slug"`
	Date       string    `gorm:"type:varchar(10)"             json:"date"`
	Published  bool      `gorm:"default:true;index"           json:"published"`
	SortOrder  int       `gorm:"default:0;index"              json:"sort_order"`
	TitleEN    string    `gorm:"type:varchar(300)"            json:"title_en"`
	DescEN     string    `gorm:"type:text"                    json:"desc_en"`
	KeywordsEN string    `gorm:"type:varchar(600)"            json:"keywords_en"`
	ReadTimeEN string    `gorm:"type:varchar(40)"             json:"read_time_en"`
	AuthorEN   string    `gorm:"type:varchar(120)"            json:"author_en"`
	TagsEN     string    `gorm:"type:varchar(600)"            json:"tags_en"` // JSON array
	ContentEN  string    `gorm:"type:text"                    json:"content_en"`
	TitleZH    string    `gorm:"type:varchar(300)"            json:"title_zh"`
	DescZH     string    `gorm:"type:text"                    json:"desc_zh"`
	KeywordsZH string    `gorm:"type:varchar(600)"            json:"keywords_zh"`
	ReadTimeZH string    `gorm:"type:varchar(40)"             json:"read_time_zh"`
	AuthorZH   string    `gorm:"type:varchar(120)"            json:"author_zh"`
	TagsZH     string    `gorm:"type:varchar(600)"            json:"tags_zh"` // JSON array
	ContentZH  string    `gorm:"type:text"                    json:"content_zh"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
