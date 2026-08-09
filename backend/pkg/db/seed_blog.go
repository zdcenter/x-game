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
	ES        blogSeedLang `json:"es"`
	JA        blogSeedLang `json:"ja"`
	KO        blogSeedLang `json:"ko"`
	PT        blogSeedLang `json:"pt"`
	FR        blogSeedLang `json:"fr"`
	DE        blogSeedLang `json:"de"`
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
		tagsES, _ := json.Marshal(s.ES.Tags)
		tagsJA, _ := json.Marshal(s.JA.Tags)
		tagsKO, _ := json.Marshal(s.KO.Tags)
		tagsPT, _ := json.Marshal(s.PT.Tags)
		tagsFR, _ := json.Marshal(s.FR.Tags)
		tagsDE, _ := json.Marshal(s.DE.Tags)

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
			TitleES:    s.ES.Title,
			DescES:     s.ES.Desc,
			KeywordsES: s.ES.Keywords,
			ReadTimeES: s.ES.ReadTime,
			AuthorES:   s.ES.Author,
			TagsES:     string(tagsES),
			ContentES:  s.ES.Content,
			TitleJA:    s.JA.Title,
			DescJA:     s.JA.Desc,
			KeywordsJA: s.JA.Keywords,
			ReadTimeJA: s.JA.ReadTime,
			AuthorJA:   s.JA.Author,
			TagsJA:     string(tagsJA),
			ContentJA:  s.JA.Content,
			TitleKO:    s.KO.Title,
			DescKO:     s.KO.Desc,
			KeywordsKO: s.KO.Keywords,
			ReadTimeKO: s.KO.ReadTime,
			AuthorKO:   s.KO.Author,
			TagsKO:     string(tagsKO),
			ContentKO:  s.KO.Content,
			TitlePT:    s.PT.Title,
			DescPT:     s.PT.Desc,
			KeywordsPT: s.PT.Keywords,
			ReadTimePT: s.PT.ReadTime,
			AuthorPT:   s.PT.Author,
			TagsPT:     string(tagsPT),
			ContentPT:  s.PT.Content,
			TitleFR:    s.FR.Title,
			DescFR:     s.FR.Desc,
			KeywordsFR: s.FR.Keywords,
			ReadTimeFR: s.FR.ReadTime,
			AuthorFR:   s.FR.Author,
			TagsFR:     string(tagsFR),
			ContentFR:  s.FR.Content,
			TitleDE:    s.DE.Title,
			DescDE:     s.DE.Desc,
			KeywordsDE: s.DE.Keywords,
			ReadTimeDE: s.DE.ReadTime,
			AuthorDE:   s.DE.Author,
			TagsDE:     string(tagsDE),
			ContentDE:  s.DE.Content,
		}

		// Upsert: insert only if slug doesn't exist; never overwrite existing edits
		var existing domain.BlogPost
		result := DB.Where("slug = ?", s.Slug).First(&existing)
		if result.Error != nil {
			DB.Create(&post)
		}
	}
}
