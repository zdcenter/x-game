package rest

import (
	"bytes"
	"fmt"
	"io"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/covergen"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/r2"
)

// POST /admin/blog/posts/covers/batch — generate SVG covers for all blog posts missing one, upload to R2
func AdminGenerateBlogCoversBatch(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	var posts []domain.BlogPost
	db.DB.Where("cover_image = '' OR cover_image IS NULL").Find(&posts)

	results := make([]fiber.Map, 0, len(posts))
	for _, post := range posts {
		url, err := generateAndUploadSVG(c, covergen.PostInfo{
			Slug: post.Slug, TitleEN: post.TitleEN, TitleZH: post.TitleZH,
			DescEN: post.DescEN, Date: post.Date, TagsEN: post.TagsEN, TagsZH: post.TagsZH,
		}, "blog", post.Slug)
		if err != nil {
			results = append(results, fiber.Map{"slug": post.Slug, "error": err.Error()})
			continue
		}
		db.DB.Model(&post).Update("cover_image", url)
		results = append(results, fiber.Map{"slug": post.Slug, "url": url})
	}
	return c.JSON(fiber.Map{"results": results, "total": len(posts)})
}

// POST /admin/blog/posts/:id/cover — return SVG string for frontend PNG conversion
func AdminGenerateBlogCover(c fiber.Ctx) error {
	id := c.Params("id")
	var post domain.BlogPost
	if err := db.DB.First(&post, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	svg := covergen.GenerateSVG(covergen.PostInfo{
		Slug: post.Slug, TitleEN: post.TitleEN, TitleZH: post.TitleZH,
		DescEN: post.DescEN, Date: post.Date, TagsEN: post.TagsEN, TagsZH: post.TagsZH,
	})
	key := fmt.Sprintf("covers/auto/blog-%s.png", post.Slug)
	return c.JSON(fiber.Map{"svg": svg, "key": key})
}

// PATCH /admin/blog/posts/:id/cover — set cover_image after frontend uploads PNG
func AdminSetBlogCoverImage(c fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		URL string `json:"url"`
	}
	if err := c.Bind().JSON(&body); err != nil || body.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "url required"})
	}
	if err := db.DB.Model(&domain.BlogPost{}).Where("id = ?", id).Update("cover_image", body.URL).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "url": body.URL})
}

// POST /admin/content/articles/covers/batch — generate SVG covers for all articles missing one
func AdminGenerateArticleCoversBatch(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	var arts []domain.ContentArticle
	db.DB.Where("cover_image = '' OR cover_image IS NULL").Find(&arts)

	results := make([]fiber.Map, 0, len(arts))
	for _, art := range arts {
		url, err := generateAndUploadSVG(c, covergen.PostInfo{
			Slug: art.Slug, TitleEN: art.TitleEN, TitleZH: art.TitleZH,
			DescEN: art.DescEN, Date: art.Date, TagsEN: art.TagsEN, TagsZH: art.TagsZH,
		}, "articles", art.Slug)
		if err != nil {
			results = append(results, fiber.Map{"slug": art.Slug, "error": err.Error()})
			continue
		}
		db.DB.Model(&art).Update("cover_image", url)
		results = append(results, fiber.Map{"slug": art.Slug, "url": url})
	}
	return c.JSON(fiber.Map{"results": results, "total": len(arts)})
}

// POST /admin/content/articles/:id/cover — return SVG string for frontend PNG conversion
func AdminGenerateArticleCover(c fiber.Ctx) error {
	id := c.Params("id")
	var art domain.ContentArticle
	if err := db.DB.First(&art, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	svg := covergen.GenerateSVG(covergen.PostInfo{
		Slug: art.Slug, TitleEN: art.TitleEN, TitleZH: art.TitleZH,
		DescEN: art.DescEN, Date: art.Date, TagsEN: art.TagsEN, TagsZH: art.TagsZH,
	})
	key := fmt.Sprintf("covers/auto/articles-%s.png", art.Slug)
	return c.JSON(fiber.Map{"svg": svg, "key": key})
}

// PATCH /admin/content/articles/:id/cover — set cover_image after frontend uploads PNG
func AdminSetArticleCoverImage(c fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		URL string `json:"url"`
	}
	if err := c.Bind().JSON(&body); err != nil || body.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "url required"})
	}
	if err := db.DB.Model(&domain.ContentArticle{}).Where("id = ?", id).Update("cover_image", body.URL).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "url": body.URL})
}

// GET /admin/images/raw?key=... — proxy R2 object for frontend SVG→PNG conversion
func AdminGetImageRaw(c fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "key required"})
	}
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	result, err := r2.Default.GetObject(c.Context(), key)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	defer result.Body.Close()

	content, err := io.ReadAll(result.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	ct := result.ContentType
	if ct == "" {
		ct = "application/octet-stream"
	}
	c.Set("Content-Type", ct)
	c.Set("Access-Control-Allow-Origin", "*")
	return c.Send(content)
}

func generateAndUploadSVG(c fiber.Ctx, info covergen.PostInfo, kind, slug string) (string, error) {
	svg := covergen.GenerateSVG(info)
	key := fmt.Sprintf("covers/auto/%s-%s.svg", kind, slug)
	item, err := r2.Default.Upload(c.Context(), key, bytes.NewReader([]byte(svg)), "image/svg+xml")
	if err != nil {
		return "", err
	}
	return item.URL, nil
}
