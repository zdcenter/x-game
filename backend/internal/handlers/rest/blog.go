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
	ID        uint        `json:"id"`
	Slug      string      `json:"id_slug"` // keep same key name as legacy "id" field for frontend compat
	Date      string      `json:"date"`
	Published bool        `json:"published"`
	SortOrder int         `json:"sort_order"`
	EN        blogLangDTO `json:"en"`
	ZH        blogLangDTO `json:"zh"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
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
}

func toDTO(p domain.BlogPost, withContent bool) blogPostDTO {
	var tagsEN, tagsZH []string
	json.Unmarshal([]byte(p.TagsEN), &tagsEN)
	json.Unmarshal([]byte(p.TagsZH), &tagsZH)

	dto := blogPostDTO{
		ID:        p.ID,
		Slug:      p.Slug,
		Date:      p.Date,
		Published: p.Published,
		SortOrder: p.SortOrder,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
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
	}
	if withContent {
		dto.EN.Content = p.ContentEN
		dto.ZH.Content = p.ContentZH
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

	post := domain.BlogPost{
		Slug:       slug,
		Date:       input.Date,
		Published:  input.Published,
		SortOrder:  input.SortOrder,
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

	db.DB.Model(&post).Updates(map[string]any{
		"slug":        strings.TrimSpace(input.Slug),
		"date":        input.Date,
		"published":   input.Published,
		"sort_order":  input.SortOrder,
		"title_en":    input.TitleEN,
		"desc_en":     input.DescEN,
		"keywords_en": input.KeywordsEN,
		"read_time_en": input.ReadTimeEN,
		"author_en":   input.AuthorEN,
		"tags_en":     string(tagsEN),
		"content_en":  input.ContentEN,
		"title_zh":    input.TitleZH,
		"desc_zh":     input.DescZH,
		"keywords_zh": input.KeywordsZH,
		"read_time_zh": input.ReadTimeZH,
		"author_zh":   input.AuthorZH,
		"tags_zh":     string(tagsZH),
		"content_zh":  input.ContentZH,
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
