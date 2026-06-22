package rest

import (
	"bytes"
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/covergen"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/r2"
)

// POST /admin/blog/posts/covers/batch
func AdminGenerateBlogCoversBatch(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	var posts []domain.BlogPost
	db.DB.Where("cover_image = '' OR cover_image IS NULL").Find(&posts)

	results := make([]fiber.Map, 0, len(posts))
	for _, post := range posts {
		url, err := generateAndUploadCover(c, covergen.PostInfo{
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

// POST /admin/blog/posts/:id/cover
func AdminGenerateBlogCover(c fiber.Ctx) error {
	id := c.Params("id")
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}

	var post domain.BlogPost
	if err := db.DB.First(&post, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}

	url, err := generateAndUploadCover(c, covergen.PostInfo{
		Slug: post.Slug, TitleEN: post.TitleEN, TitleZH: post.TitleZH,
		DescEN: post.DescEN, Date: post.Date, TagsEN: post.TagsEN, TagsZH: post.TagsZH,
	}, "blog", post.Slug)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	db.DB.Model(&post).Update("cover_image", url)
	return c.JSON(fiber.Map{"url": url})
}

// POST /admin/content/articles/covers/batch
func AdminGenerateArticleCoversBatch(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	var arts []domain.ContentArticle
	db.DB.Where("cover_image = '' OR cover_image IS NULL").Find(&arts)

	results := make([]fiber.Map, 0, len(arts))
	for _, art := range arts {
		url, err := generateAndUploadCover(c, covergen.PostInfo{
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

// POST /admin/content/articles/:id/cover
func AdminGenerateArticleCover(c fiber.Ctx) error {
	id := c.Params("id")
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}

	var art domain.ContentArticle
	if err := db.DB.First(&art, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}

	url, err := generateAndUploadCover(c, covergen.PostInfo{
		Slug: art.Slug, TitleEN: art.TitleEN, TitleZH: art.TitleZH,
		DescEN: art.DescEN, Date: art.Date, TagsEN: art.TagsEN, TagsZH: art.TagsZH,
	}, "articles", art.Slug)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	db.DB.Model(&art).Update("cover_image", url)
	return c.JSON(fiber.Map{"url": url})
}

func generateAndUploadCover(c fiber.Ctx, info covergen.PostInfo, kind, slug string) (string, error) {
	svg := covergen.GenerateSVG(info)
	key := fmt.Sprintf("covers/auto/%s-%s.svg", kind, slug)
	item, err := r2.Default.Upload(c.Context(), key, bytes.NewReader([]byte(svg)), "image/svg+xml")
	if err != nil {
		return "", err
	}
	return item.URL, nil
}
