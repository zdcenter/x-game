package rest

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type distributionWithPost struct {
	domain.BlogDistribution
	TitleEN string `json:"title_en"`
	TitleZH string `json:"title_zh"`
	Slug    string `json:"slug"`
}

func GetBlogDistributions(c fiber.Ctx) error {
	var dists []distributionWithPost
	db.DB.Model(&domain.BlogDistribution{}).
		Select("gm_blog_distributions.*, gm_blog_posts.title_en, gm_blog_posts.title_zh, gm_blog_posts.slug").
		Joins("JOIN gm_blog_posts ON gm_blog_posts.id = gm_blog_distributions.post_id").
		Scan(&dists)
	if dists == nil {
		dists = []distributionWithPost{}
	}
	return c.JSON(dists)
}

type distributeInput struct {
	Platform string `json:"platform"`
	Lang     string `json:"lang"`
}

func RecordBlogDistribution(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	var input distributeInput
	if err := c.Bind().JSON(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if input.Platform == "" || input.Lang == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "platform and lang required"})
	}

	// Verify the post exists
	var post domain.BlogPost
	if err := db.DB.First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "post not found"})
	}

	now := time.Now()
	var dist domain.BlogDistribution
	result := db.DB.Where("post_id = ? AND platform = ? AND lang = ?", post.ID, input.Platform, input.Lang).First(&dist)

	if result.Error != nil {
		dist = domain.BlogDistribution{
			PostID:       post.ID,
			Platform:     input.Platform,
			Lang:         input.Lang,
			LastCopiedAt: now,
			CopyCount:    1,
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
