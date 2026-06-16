package db

import (
	_ "embed"
	"encoding/json"
	"log"

	"github.com/x-game/backend/internal/domain"
)

//go:embed blog_seeds.json
var blogSeedsJSON []byte

type blogSeedLang struct {
	Title    string   `json:"title"`
	Desc     string   `json:"desc"`
	Keywords string   `json:"keywords"`
	ReadTime string   `json:"read_time"`
	Author   string   `json:"author"`
	Tags     []string `json:"tags"`
	Content  string   `json:"content"`
}

type blogSeed struct {
	Slug      string       `json:"slug"`
	Date      string       `json:"date"`
	SortOrder int          `json:"sort_order"`
	Published bool         `json:"published"`
	EN        blogSeedLang `json:"en"`
	ZH        blogSeedLang `json:"zh"`
}

func SeedBlog() {
	var seeds []blogSeed
	if err := json.Unmarshal(blogSeedsJSON, &seeds); err != nil {
		log.Printf("[SeedBlog] failed to parse blog_seeds.json: %v", err)
		return
	}

	for _, s := range seeds {
		tagsEN, _ := json.Marshal(s.EN.Tags)
		tagsZH, _ := json.Marshal(s.ZH.Tags)

		post := domain.BlogPost{
			Slug:       s.Slug,
			Date:       s.Date,
			SortOrder:  s.SortOrder,
			Published:  s.Published,
			TitleEN:    s.EN.Title,
			DescEN:     s.EN.Desc,
			KeywordsEN: s.EN.Keywords,
			ReadTimeEN: s.EN.ReadTime,
			AuthorEN:   s.EN.Author,
			TagsEN:     string(tagsEN),
			ContentEN:  s.EN.Content,
			TitleZH:    s.ZH.Title,
			DescZH:     s.ZH.Desc,
			KeywordsZH: s.ZH.Keywords,
			ReadTimeZH: s.ZH.ReadTime,
			AuthorZH:   s.ZH.Author,
			TagsZH:     string(tagsZH),
			ContentZH:  s.ZH.Content,
		}

		// Upsert: insert only if slug doesn't exist; never overwrite existing edits
		var existing domain.BlogPost
		result := DB.Where("slug = ?", s.Slug).First(&existing)
		if result.Error != nil {
			DB.Create(&post)
		}
	}
}
