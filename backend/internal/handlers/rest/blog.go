package rest

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// ---- DTOs ----

type blogLangDTO struct {
	Title    string   `json:"title"`
	Desc     string   `json:"description"`
	Keywords string   `json:"keywords"`
	ReadTime string   `json:"readTime"`
	Author   string   `json:"author"`
	Tags     []string `json:"tags"`
	Content  string   `json:"content,omitempty"` // omitted in list responses
}

type blogPostDTO struct {
	ID         uint        `json:"id"`
	Slug       string      `json:"id_slug"` // keep same key name as legacy "id" field for frontend compat
	Date       string      `json:"date"`
	Published  bool        `json:"published"`
	SortOrder  int         `json:"sort_order"`
	CoverImage string      `json:"cover_image"`
	EN         blogLangDTO `json:"en"`
	ZH         blogLangDTO `json:"zh"`
	ES         blogLangDTO `json:"es"`
	JA         blogLangDTO `json:"ja"`
	KO         blogLangDTO `json:"ko"`
	PT         blogLangDTO `json:"pt"`
	FR         blogLangDTO `json:"fr"`
	DE         blogLangDTO `json:"de"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type blogPostInput struct {
	Slug       string   `json:"slug"`
	Date       string   `json:"date"`
	Published  bool     `json:"published"`
	SortOrder  int      `json:"sort_order"`
	TitleEN    string   `json:"title_en"`
	DescEN     string   `json:"desc_en"`
	KeywordsEN string   `json:"keywords_en"`
	ReadTimeEN string   `json:"read_time_en"`
	AuthorEN   string   `json:"author_en"`
	TagsEN     []string `json:"tags_en"`
	ContentEN  string   `json:"content_en"`
	TitleZH    string   `json:"title_zh"`
	DescZH     string   `json:"desc_zh"`
	KeywordsZH string   `json:"keywords_zh"`
	ReadTimeZH string   `json:"read_time_zh"`
	AuthorZH   string   `json:"author_zh"`
	TagsZH     []string `json:"tags_zh"`
	ContentZH  string   `json:"content_zh"`
	TitleES    string   `json:"title_es"`
	DescES     string   `json:"desc_es"`
	KeywordsES string   `json:"keywords_es"`
	ReadTimeES string   `json:"read_time_es"`
	AuthorES   string   `json:"author_es"`
	TagsES     []string `json:"tags_es"`
	ContentES  string   `json:"content_es"`
	TitleJA    string   `json:"title_ja"`
	DescJA     string   `json:"desc_ja"`
	KeywordsJA string   `json:"keywords_ja"`
	ReadTimeJA string   `json:"read_time_ja"`
	AuthorJA   string   `json:"author_ja"`
	TagsJA     []string `json:"tags_ja"`
	ContentJA  string   `json:"content_ja"`
	TitleKO    string   `json:"title_ko"`
	DescKO     string   `json:"desc_ko"`
	KeywordsKO string   `json:"keywords_ko"`
	ReadTimeKO string   `json:"read_time_ko"`
	AuthorKO   string   `json:"author_ko"`
	TagsKO     []string `json:"tags_ko"`
	ContentKO  string   `json:"content_ko"`
	TitlePT    string   `json:"title_pt"`
	DescPT     string   `json:"desc_pt"`
	KeywordsPT string   `json:"keywords_pt"`
	ReadTimePT string   `json:"read_time_pt"`
	AuthorPT   string   `json:"author_pt"`
	TagsPT     []string `json:"tags_pt"`
	ContentPT  string   `json:"content_pt"`
	TitleFR    string   `json:"title_fr"`
	DescFR     string   `json:"desc_fr"`
	KeywordsFR string   `json:"keywords_fr"`
	ReadTimeFR string   `json:"read_time_fr"`
	AuthorFR   string   `json:"author_fr"`
	TagsFR     []string `json:"tags_fr"`
	ContentFR  string   `json:"content_fr"`
	TitleDE    string   `json:"title_de"`
	DescDE     string   `json:"desc_de"`
	KeywordsDE string   `json:"keywords_de"`
	ReadTimeDE string   `json:"read_time_de"`
	AuthorDE   string   `json:"author_de"`
	TagsDE     []string `json:"tags_de"`
	ContentDE  string   `json:"content_de"`
	CoverImage string   `json:"cover_image"`
}

func toDTO(p domain.BlogPost, withContent bool) blogPostDTO {
	var tagsEN, tagsZH, tagsES, tagsJA, tagsKO, tagsPT, tagsFR, tagsDE []string
	json.Unmarshal([]byte(p.TagsEN), &tagsEN)
	json.Unmarshal([]byte(p.TagsZH), &tagsZH)
	json.Unmarshal([]byte(p.TagsES), &tagsES)
	json.Unmarshal([]byte(p.TagsJA), &tagsJA)
	json.Unmarshal([]byte(p.TagsKO), &tagsKO)
	json.Unmarshal([]byte(p.TagsPT), &tagsPT)
	json.Unmarshal([]byte(p.TagsFR), &tagsFR)
	json.Unmarshal([]byte(p.TagsDE), &tagsDE)

	dto := blogPostDTO{
		ID:         p.ID,
		Slug:       p.Slug,
		Date:       p.Date,
		Published:  p.Published,
		SortOrder:  p.SortOrder,
		CoverImage: p.CoverImage,
		CreatedAt:  p.CreatedAt,
		UpdatedAt:  p.UpdatedAt,
		EN: blogLangDTO{
			Title:    p.TitleEN,
			Desc:     p.DescEN,
			Keywords: p.KeywordsEN,
			ReadTime: p.ReadTimeEN,
			Author:   p.AuthorEN,
			Tags:     tagsEN,
		},
		ZH: blogLangDTO{
			Title:    p.TitleZH,
			Desc:     p.DescZH,
			Keywords: p.KeywordsZH,
			ReadTime: p.ReadTimeZH,
			Author:   p.AuthorZH,
			Tags:     tagsZH,
		},
		ES: blogLangDTO{
			Title:    p.TitleES,
			Desc:     p.DescES,
			Keywords: p.KeywordsES,
			ReadTime: p.ReadTimeES,
			Author:   p.AuthorES,
			Tags:     tagsES,
		},
		JA: blogLangDTO{
			Title:    p.TitleJA,
			Desc:     p.DescJA,
			Keywords: p.KeywordsJA,
			ReadTime: p.ReadTimeJA,
			Author:   p.AuthorJA,
			Tags:     tagsJA,
		},
		KO: blogLangDTO{
			Title:    p.TitleKO,
			Desc:     p.DescKO,
			Keywords: p.KeywordsKO,
			ReadTime: p.ReadTimeKO,
			Author:   p.AuthorKO,
			Tags:     tagsKO,
		},
		PT: blogLangDTO{
			Title:    p.TitlePT,
			Desc:     p.DescPT,
			Keywords: p.KeywordsPT,
			ReadTime: p.ReadTimePT,
			Author:   p.AuthorPT,
			Tags:     tagsPT,
		},
		FR: blogLangDTO{
			Title:    p.TitleFR,
			Desc:     p.DescFR,
			Keywords: p.KeywordsFR,
			ReadTime: p.ReadTimeFR,
			Author:   p.AuthorFR,
			Tags:     tagsFR,
		},
		DE: blogLangDTO{
			Title:    p.TitleDE,
			Desc:     p.DescDE,
			Keywords: p.KeywordsDE,
			ReadTime: p.ReadTimeDE,
			Author:   p.AuthorDE,
			Tags:     tagsDE,
		},
	}
	if withContent {
		dto.EN.Content = p.ContentEN
		dto.ZH.Content = p.ContentZH
		dto.ES.Content = p.ContentES
		dto.JA.Content = p.ContentJA
		dto.KO.Content = p.ContentKO
		dto.PT.Content = p.ContentPT
		dto.FR.Content = p.ContentFR
		dto.DE.Content = p.ContentDE
	}
	return dto
}

// ---- Public handlers ----

// GET /api/v1/blog/posts  →  published posts list (no content)
func ListBlogPosts(c fiber.Ctx) error {
	var posts []domain.BlogPost
	db.DB.Where("published = true").Order("sort_order ASC, date DESC").Find(&posts)

	dtos := make([]blogPostDTO, len(posts))
	for i, p := range posts {
		dtos[i] = toDTO(p, false)
	}
	return c.JSON(dtos)
}

// GET /api/v1/blog/posts/:slug  →  single post with content
func GetBlogPost(c fiber.Ctx) error {
	slug := c.Params("slug")
	var post domain.BlogPost
	if err := db.DB.Where("slug = ? AND published = true", slug).First(&post).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(toDTO(post, true))
}

// ---- Admin handlers ----

// GET /api/v1/admin/blog/posts  →  all posts (incl. unpublished)
func AdminListBlogPosts(c fiber.Ctx) error {
	var posts []domain.BlogPost
	db.DB.Order("sort_order ASC, date DESC").Find(&posts)

	dtos := make([]blogPostDTO, len(posts))
	for i, p := range posts {
		dtos[i] = toDTO(p, false)
	}
	return c.JSON(dtos)
}

// GET /api/v1/admin/blog/posts/:id  →  single post (full content)
func AdminGetBlogPost(c fiber.Ctx) error {
	id := c.Params("id")
	var post domain.BlogPost
	if err := db.DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(toDTO(post, true))
}

// POST /api/v1/admin/blog/posts
func AdminCreateBlogPost(c fiber.Ctx) error {
	var input blogPostInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		return c.Status(400).JSON(fiber.Map{"error": "slug required"})
	}

	tagsEN, _ := json.Marshal(input.TagsEN)
	tagsZH, _ := json.Marshal(input.TagsZH)
	tagsES, _ := json.Marshal(input.TagsES)
	tagsJA, _ := json.Marshal(input.TagsJA)
	tagsKO, _ := json.Marshal(input.TagsKO)
	tagsPT, _ := json.Marshal(input.TagsPT)
	tagsFR, _ := json.Marshal(input.TagsFR)
	tagsDE, _ := json.Marshal(input.TagsDE)

	post := domain.BlogPost{
		Slug:       slug,
		Date:       input.Date,
		Published:  input.Published,
		SortOrder:  input.SortOrder,
		CoverImage: input.CoverImage,
		TitleEN:    input.TitleEN,
		DescEN:     input.DescEN,
		KeywordsEN: input.KeywordsEN,
		ReadTimeEN: input.ReadTimeEN,
		AuthorEN:   input.AuthorEN,
		TagsEN:     string(tagsEN),
		ContentEN:  input.ContentEN,
		TitleZH:    input.TitleZH,
		DescZH:     input.DescZH,
		KeywordsZH: input.KeywordsZH,
		ReadTimeZH: input.ReadTimeZH,
		AuthorZH:   input.AuthorZH,
		TagsZH:     string(tagsZH),
		ContentZH:  input.ContentZH,
		TitleES:    input.TitleES,
		DescES:     input.DescES,
		KeywordsES: input.KeywordsES,
		ReadTimeES: input.ReadTimeES,
		AuthorES:   input.AuthorES,
		TagsES:     string(tagsES),
		ContentES:  input.ContentES,
		TitleJA:    input.TitleJA,
		DescJA:     input.DescJA,
		KeywordsJA: input.KeywordsJA,
		ReadTimeJA: input.ReadTimeJA,
		AuthorJA:   input.AuthorJA,
		TagsJA:     string(tagsJA),
		ContentJA:  input.ContentJA,
		TitleKO:    input.TitleKO,
		DescKO:     input.DescKO,
		KeywordsKO: input.KeywordsKO,
		ReadTimeKO: input.ReadTimeKO,
		AuthorKO:   input.AuthorKO,
		TagsKO:     string(tagsKO),
		ContentKO:  input.ContentKO,
		TitlePT:    input.TitlePT,
		DescPT:     input.DescPT,
		KeywordsPT: input.KeywordsPT,
		ReadTimePT: input.ReadTimePT,
		AuthorPT:   input.AuthorPT,
		TagsPT:     string(tagsPT),
		ContentPT:  input.ContentPT,
		TitleFR:    input.TitleFR,
		DescFR:     input.DescFR,
		KeywordsFR: input.KeywordsFR,
		ReadTimeFR: input.ReadTimeFR,
		AuthorFR:   input.AuthorFR,
		TagsFR:     string(tagsFR),
		ContentFR:  input.ContentFR,
		TitleDE:    input.TitleDE,
		DescDE:     input.DescDE,
		KeywordsDE: input.KeywordsDE,
		ReadTimeDE: input.ReadTimeDE,
		AuthorDE:   input.AuthorDE,
		TagsDE:     string(tagsDE),
		ContentDE:  input.ContentDE,
	}
	if err := db.DB.Create(&post).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "create failed: " + err.Error()})
	}
	return c.Status(201).JSON(toDTO(post, true))
}

// PUT /api/v1/admin/blog/posts/:id
func AdminUpdateBlogPost(c fiber.Ctx) error {
	id := c.Params("id")
	var post domain.BlogPost
	if err := db.DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}

	var input blogPostInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	tagsEN, _ := json.Marshal(input.TagsEN)
	tagsZH, _ := json.Marshal(input.TagsZH)
	tagsES, _ := json.Marshal(input.TagsES)
	tagsJA, _ := json.Marshal(input.TagsJA)
	tagsKO, _ := json.Marshal(input.TagsKO)
	tagsPT, _ := json.Marshal(input.TagsPT)
	tagsFR, _ := json.Marshal(input.TagsFR)
	tagsDE, _ := json.Marshal(input.TagsDE)

	db.DB.Model(&post).Updates(map[string]any{
		"slug":         strings.TrimSpace(input.Slug),
		"date":         input.Date,
		"published":    input.Published,
		"sort_order":   input.SortOrder,
		"cover_image":  input.CoverImage,
		"title_en":     input.TitleEN,
		"desc_en":      input.DescEN,
		"keywords_en":  input.KeywordsEN,
		"read_time_en": input.ReadTimeEN,
		"author_en":    input.AuthorEN,
		"tags_en":      string(tagsEN),
		"content_en":   input.ContentEN,
		"title_zh":     input.TitleZH,
		"desc_zh":      input.DescZH,
		"keywords_zh":  input.KeywordsZH,
		"read_time_zh": input.ReadTimeZH,
		"author_zh":    input.AuthorZH,
		"tags_zh":      string(tagsZH),
		"content_zh":   input.ContentZH,
		"title_es":     input.TitleES,
		"desc_es":      input.DescES,
		"keywords_es":  input.KeywordsES,
		"read_time_es": input.ReadTimeES,
		"author_es":    input.AuthorES,
		"tags_es":      string(tagsES),
		"content_es":   input.ContentES,
		"title_ja":     input.TitleJA,
		"desc_ja":      input.DescJA,
		"keywords_ja":  input.KeywordsJA,
		"read_time_ja": input.ReadTimeJA,
		"author_ja":    input.AuthorJA,
		"tags_ja":      string(tagsJA),
		"content_ja":   input.ContentJA,
		"title_ko":     input.TitleKO,
		"desc_ko":      input.DescKO,
		"keywords_ko":  input.KeywordsKO,
		"read_time_ko": input.ReadTimeKO,
		"author_ko":    input.AuthorKO,
		"tags_ko":      string(tagsKO),
		"content_ko":   input.ContentKO,
		"title_pt":     input.TitlePT,
		"desc_pt":      input.DescPT,
		"keywords_pt":  input.KeywordsPT,
		"read_time_pt": input.ReadTimePT,
		"author_pt":    input.AuthorPT,
		"tags_pt":      string(tagsPT),
		"content_pt":   input.ContentPT,
		"title_fr":     input.TitleFR,
		"desc_fr":      input.DescFR,
		"keywords_fr":  input.KeywordsFR,
		"read_time_fr": input.ReadTimeFR,
		"author_fr":    input.AuthorFR,
		"tags_fr":      string(tagsFR),
		"content_fr":   input.ContentFR,
		"title_de":     input.TitleDE,
		"desc_de":      input.DescDE,
		"keywords_de":  input.KeywordsDE,
		"read_time_de": input.ReadTimeDE,
		"author_de":    input.AuthorDE,
		"tags_de":      string(tagsDE),
		"content_de":   input.ContentDE,
	})
	return c.JSON(toDTO(post, true))
}

// DELETE /api/v1/admin/blog/posts/:id
func AdminDeleteBlogPost(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.BlogPost{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "delete failed"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// PATCH /api/v1/admin/blog/posts/:id/toggle
func AdminToggleBlogPost(c fiber.Ctx) error {
	id := c.Params("id")
	var post domain.BlogPost
	if err := db.DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	db.DB.Model(&post).Update("published", !post.Published)
	return c.JSON(fiber.Map{"published": post.Published})
}
