package rest

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// ========== CATEGORIES ==========

func GetContentCategories(c fiber.Ctx) error {
	var cats []domain.ContentCategory
	db.DB.Order("sort_order, id").Find(&cats)
	return c.JSON(cats)
}

type categoryInput struct {
	Slug      string `json:"slug"`
	NameEN    string `json:"name_en"`
	NameZH    string `json:"name_zh"`
	DescEN    string `json:"desc_en"`
	DescZH    string `json:"desc_zh"`
	ParentID  *uint  `json:"parent_id"`
	SortOrder int    `json:"sort_order"`
}

func CreateContentCategory(c fiber.Ctx) error {
	var input categoryInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	cat := domain.ContentCategory{
		Slug: input.Slug, NameEN: input.NameEN, NameZH: input.NameZH,
		DescEN: input.DescEN, DescZH: input.DescZH,
		ParentID: input.ParentID, SortOrder: input.SortOrder,
	}
	if err := db.DB.Create(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(cat)
}

func UpdateContentCategory(c fiber.Ctx) error {
	id := c.Params("id")
	var cat domain.ContentCategory
	if err := db.DB.First(&cat, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	var input categoryInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	db.DB.Model(&cat).Updates(map[string]interface{}{
		"slug": input.Slug, "name_en": input.NameEN, "name_zh": input.NameZH,
		"desc_en": input.DescEN, "desc_zh": input.DescZH,
		"parent_id": input.ParentID, "sort_order": input.SortOrder,
	})
	db.DB.First(&cat, id)
	return c.JSON(cat)
}

func DeleteContentCategory(c fiber.Ctx) error {
	id := c.Params("id")
	var childCount int64
	db.DB.Model(&domain.ContentCategory{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "has_children"})
	}
	var articleCount int64
	db.DB.Model(&domain.ContentArticle{}).Where("category_id = ?", id).Count(&articleCount)
	if articleCount > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "has_articles"})
	}
	db.DB.Delete(&domain.ContentCategory{}, id)
	return c.JSON(fiber.Map{"ok": true})
}

// ========== ARTICLES ==========

type articleListItem struct {
	ID         uint      `json:"id"`
	Slug       string    `json:"slug"`
	CategoryID *uint     `json:"category_id"`
	TitleEN    string    `json:"title_en"`
	TitleZH    string    `json:"title_zh"`
	DescEN     string    `json:"desc_en"`
	DescZH     string    `json:"desc_zh"`
	TagsEN     string    `json:"tags_en"`
	TagsZH     string    `json:"tags_zh"`
	Published  bool      `json:"published"`
	SortOrder  int       `json:"sort_order"`
	Date       string    `json:"date"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func ListContentArticles(c fiber.Ctx) error {
	query := db.DB.Model(&domain.ContentArticle{}).
		Select("id, slug, category_id, title_en, title_zh, desc_en, desc_zh, tags_en, tags_zh, published, sort_order, date, created_at, updated_at")
	if catID := c.Query("category_id"); catID != "" {
		query = query.Where("category_id = ?", catID)
	}
	var items []articleListItem
	query.Order("sort_order desc, created_at desc").Scan(&items)
	if items == nil {
		items = []articleListItem{}
	}
	return c.JSON(items)
}

func GetContentArticle(c fiber.Ctx) error {
	id := c.Params("id")
	var art domain.ContentArticle
	if err := db.DB.First(&art, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(art)
}

type articleInput struct {
	Slug       string   `json:"slug"`
	CategoryID *uint    `json:"category_id"`
	TitleEN    string   `json:"title_en"`
	TitleZH    string   `json:"title_zh"`
	DescEN     string   `json:"desc_en"`
	DescZH     string   `json:"desc_zh"`
	ContentEN  string   `json:"content_en"`
	ContentZH  string   `json:"content_zh"`
	TagsEN     []string `json:"tags_en"`
	TagsZH     []string `json:"tags_zh"`
	AuthorEN   string   `json:"author_en"`
	AuthorZH   string   `json:"author_zh"`
	SourceURL  string   `json:"source_url"`
	Published  bool     `json:"published"`
	SortOrder  int      `json:"sort_order"`
	Date       string   `json:"date"`
}

func tagsSliceToJSON(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(tags)
	return string(b)
}

func CreateContentArticle(c fiber.Ctx) error {
	var input articleInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	art := domain.ContentArticle{
		Slug: input.Slug, CategoryID: input.CategoryID,
		TitleEN: input.TitleEN, TitleZH: input.TitleZH,
		DescEN: input.DescEN, DescZH: input.DescZH,
		ContentEN: input.ContentEN, ContentZH: input.ContentZH,
		TagsEN: tagsSliceToJSON(input.TagsEN), TagsZH: tagsSliceToJSON(input.TagsZH),
		AuthorEN: input.AuthorEN, AuthorZH: input.AuthorZH,
		SourceURL: input.SourceURL,
		Published: input.Published, SortOrder: input.SortOrder, Date: input.Date,
	}
	if err := db.DB.Create(&art).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(art)
}

func UpdateContentArticle(c fiber.Ctx) error {
	id := c.Params("id")
	var art domain.ContentArticle
	if err := db.DB.First(&art, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	var input articleInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	db.DB.Model(&art).Updates(map[string]interface{}{
		"slug": input.Slug, "category_id": input.CategoryID,
		"title_en": input.TitleEN, "title_zh": input.TitleZH,
		"desc_en": input.DescEN, "desc_zh": input.DescZH,
		"content_en": input.ContentEN, "content_zh": input.ContentZH,
		"tags_en": tagsSliceToJSON(input.TagsEN), "tags_zh": tagsSliceToJSON(input.TagsZH),
		"author_en": input.AuthorEN, "author_zh": input.AuthorZH,
		"source_url": input.SourceURL,
		"published": input.Published, "sort_order": input.SortOrder, "date": input.Date,
	})
	db.DB.First(&art, id)
	return c.JSON(art)
}

func DeleteContentArticle(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.ContentArticle{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func ToggleContentArticle(c fiber.Ctx) error {
	id := c.Params("id")
	var art domain.ContentArticle
	if err := db.DB.First(&art, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	newPub := !art.Published
	db.DB.Model(&art).Update("published", newPub)
	return c.JSON(fiber.Map{"published": newPub})
}

// ========== DISTRIBUTIONS ==========

func GetContentDistributions(c fiber.Ctx) error {
	id := c.Params("id")
	var dists []domain.ContentDistribution
	db.DB.Where("article_id = ?", id).Find(&dists)
	if dists == nil {
		dists = []domain.ContentDistribution{}
	}
	return c.JSON(dists)
}

type contentDistributeInput struct {
	Platform string `json:"platform"`
	Lang     string `json:"lang"`
}

func RecordContentDistribution(c fiber.Ctx) error {
	id := c.Params("id")
	var art domain.ContentArticle
	if err := db.DB.First(&art, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	var input contentDistributeInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	now := time.Now()
	var dist domain.ContentDistribution
	result := db.DB.Where("article_id = ? AND platform = ? AND lang = ?", art.ID, input.Platform, input.Lang).First(&dist)
	if result.Error != nil {
		dist = domain.ContentDistribution{
			ArticleID: art.ID, Platform: input.Platform, Lang: input.Lang,
			LastCopiedAt: now, CopyCount: 1,
		}
		db.DB.Create(&dist)
	} else {
		db.DB.Model(&dist).Updates(map[string]interface{}{
			"last_copied_at": now,
			"copy_count":     dist.CopyCount + 1,
		})
		dist.CopyCount++
	}
	return c.JSON(fiber.Map{"ok": true, "copy_count": dist.CopyCount})
}
