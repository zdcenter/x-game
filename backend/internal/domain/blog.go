package domain

import "time"

type BlogPost struct {
	ID         uint      `gorm:"primaryKey"                   json:"id"`
	Slug       string    `gorm:"type:varchar(120);uniqueIndex" json:"slug"`
	Date       string    `gorm:"type:varchar(10)"             json:"date"`
	Published  bool      `gorm:"default:true;index"           json:"published"`
	SortOrder  int       `gorm:"default:0;index"              json:"sort_order"`
	CoverImage string    `gorm:"type:varchar(500)"            json:"cover_image"`
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
	TagsZH     string    `gorm:"type:varchar(600)"            json:"tags_zh"`
	ContentZH  string    `gorm:"type:text"                    json:"content_zh"`
	TitleES    string    `gorm:"type:varchar(300)"            json:"title_es"`
	DescES     string    `gorm:"type:text"                    json:"desc_es"`
	KeywordsES string    `gorm:"type:varchar(600)"            json:"keywords_es"`
	ReadTimeES string    `gorm:"type:varchar(40)"             json:"read_time_es"`
	AuthorES   string    `gorm:"type:varchar(120)"            json:"author_es"`
	TagsES     string    `gorm:"type:varchar(600)"            json:"tags_es"`
	ContentES  string    `gorm:"type:text"                    json:"content_es"`
	TitleJA    string    `gorm:"type:varchar(300)"            json:"title_ja"`
	DescJA     string    `gorm:"type:text"                    json:"desc_ja"`
	KeywordsJA string    `gorm:"type:varchar(600)"            json:"keywords_ja"`
	ReadTimeJA string    `gorm:"type:varchar(40)"             json:"read_time_ja"`
	AuthorJA   string    `gorm:"type:varchar(120)"            json:"author_ja"`
	TagsJA     string    `gorm:"type:varchar(600)"            json:"tags_ja"`
	ContentJA  string    `gorm:"type:text"                    json:"content_ja"`
	TitleKO    string    `gorm:"type:varchar(300)"            json:"title_ko"`
	DescKO     string    `gorm:"type:text"                    json:"desc_ko"`
	KeywordsKO string    `gorm:"type:varchar(600)"            json:"keywords_ko"`
	ReadTimeKO string    `gorm:"type:varchar(40)"             json:"read_time_ko"`
	AuthorKO   string    `gorm:"type:varchar(120)"            json:"author_ko"`
	TagsKO     string    `gorm:"type:varchar(600)"            json:"tags_ko"`
	ContentKO  string    `gorm:"type:text"                    json:"content_ko"`
	TitlePT    string    `gorm:"type:varchar(300)"            json:"title_pt"`
	DescPT     string    `gorm:"type:text"                    json:"desc_pt"`
	KeywordsPT string    `gorm:"type:varchar(600)"            json:"keywords_pt"`
	ReadTimePT string    `gorm:"type:varchar(40)"             json:"read_time_pt"`
	AuthorPT   string    `gorm:"type:varchar(120)"            json:"author_pt"`
	TagsPT     string    `gorm:"type:varchar(600)"            json:"tags_pt"`
	ContentPT  string    `gorm:"type:text"                    json:"content_pt"`
	TitleFR    string    `gorm:"type:varchar(300)"            json:"title_fr"`
	DescFR     string    `gorm:"type:text"                    json:"desc_fr"`
	KeywordsFR string    `gorm:"type:varchar(600)"            json:"keywords_fr"`
	ReadTimeFR string    `gorm:"type:varchar(40)"             json:"read_time_fr"`
	AuthorFR   string    `gorm:"type:varchar(120)"            json:"author_fr"`
	TagsFR     string    `gorm:"type:varchar(600)"            json:"tags_fr"`
	ContentFR  string    `gorm:"type:text"                    json:"content_fr"`
	TitleDE    string    `gorm:"type:varchar(300)"            json:"title_de"`
	DescDE     string    `gorm:"type:text"                    json:"desc_de"`
	KeywordsDE string    `gorm:"type:varchar(600)"            json:"keywords_de"`
	ReadTimeDE string    `gorm:"type:varchar(40)"             json:"read_time_de"`
	AuthorDE   string    `gorm:"type:varchar(120)"            json:"author_de"`
	TagsDE     string    `gorm:"type:varchar(600)"            json:"tags_de"`
	ContentDE  string    `gorm:"type:text"                    json:"content_de"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
