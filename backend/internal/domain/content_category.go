package domain

import "time"

type ContentCategory struct {
	ID        uint      `gorm:"primaryKey"                        json:"id"`
	Slug      string    `gorm:"type:varchar(100);uniqueIndex"     json:"slug"`
	NameEN    string    `gorm:"type:varchar(200)"                 json:"name_en"`
	NameZH    string    `gorm:"type:varchar(200)"                 json:"name_zh"`
	DescEN    string    `gorm:"type:text"                         json:"desc_en"`
	DescZH    string    `gorm:"type:text"                         json:"desc_zh"`
	ParentID  *uint     `gorm:"index"                             json:"parent_id"`
	SortOrder int       `gorm:"default:0;index"                   json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
