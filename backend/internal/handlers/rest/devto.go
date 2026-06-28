package rest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type devtoRequest struct {
	Article struct {
		Title        string   `json:"title"`
		BodyMarkdown string   `json:"body_markdown"`
		Published    bool     `json:"published"`
		Tags         []string `json:"tags"`
		CanonicalURL string   `json:"canonical_url,omitempty"`
	} `json:"article"`
}

// PublishToDevTo publishes a blog post to Dev.to via API.
// POST /admin/blog/posts/:id/publish/devto?lang=en
func PublishToDevTo(c fiber.Ctx) error {
	id := c.Params("id")
	lang := c.Query("lang", "en")
	if lang != "en" && lang != "zh" {
		lang = "en"
	}

	// Read API key from system_settings
	var setting domain.SystemSetting
	if err := db.DB.Where("key = ?", "devto_api_key").First(&setting).Error; err != nil || strings.TrimSpace(setting.Value) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dev.to API key not configured. Go to Admin → Settings to add it."})
	}

	// Get blog post
	var post domain.BlogPost
	if err := db.DB.First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "post not found"})
	}

	var title, content, tagsJSON string
	if lang == "zh" {
		title, content, tagsJSON = post.TitleZH, post.ContentZH, post.TagsZH
	} else {
		title, content, tagsJSON = post.TitleEN, post.ContentEN, post.TagsEN
	}
	if title == "" || content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "post has no " + lang + " content"})
	}

	// Parse tags: Dev.to accepts max 4, lowercase alphanumeric + hyphen, max 30 chars each
	var rawTags []string
	json.Unmarshal([]byte(tagsJSON), &rawTags)
	tags := sanitizeDevToTags(rawTags)

	canonicalURL := fmt.Sprintf("https://www.puzzlepk.com/%s/blog/%s", lang, post.Slug)

	var req devtoRequest
	req.Article.Title = title
	req.Article.BodyMarkdown = content
	req.Article.Published = true
	req.Article.Tags = tags
	req.Article.CanonicalURL = canonicalURL

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "https://dev.to/api/articles", bytes.NewReader(body))
	httpReq.Header.Set("api-key", strings.TrimSpace(setting.Value))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "PuzzlePK-Admin/1.0")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to reach Dev.to: " + err.Error()})
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		var devtoErr map[string]interface{}
		json.Unmarshal(respBody, &devtoErr)
		msg := fmt.Sprintf("Dev.to returned HTTP %d", resp.StatusCode)
		if e, ok := devtoErr["error"].(string); ok && e != "" {
			msg = e
		}
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": msg})
	}

	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	publishedURL, _ := result["url"].(string)

	// Upsert distribution record
	now := time.Now()
	var dist domain.BlogDistribution
	dbRes := db.DB.Where("post_id = ? AND platform = ? AND lang = ?", post.ID, "devto", lang).First(&dist)
	if dbRes.Error != nil {
		dist = domain.BlogDistribution{PostID: post.ID, Platform: "devto", Lang: lang, LastCopiedAt: now, CopyCount: 1, PublishedURL: publishedURL}
		db.DB.Create(&dist)
	} else {
		db.DB.Model(&dist).Updates(map[string]interface{}{"last_copied_at": now, "copy_count": dist.CopyCount + 1, "published_url": publishedURL})
	}

	return c.JSON(fiber.Map{"ok": true, "url": publishedURL})
}

// PublishArticleToDevTo publishes a content article to Dev.to via API.
// POST /admin/content/articles/:id/publish/devto?lang=en
func PublishArticleToDevTo(c fiber.Ctx) error {
	id := c.Params("id")
	lang := c.Query("lang", "en")
	if lang != "en" && lang != "zh" {
		lang = "en"
	}

	var setting domain.SystemSetting
	if err := db.DB.Where("key = ?", "devto_api_key").First(&setting).Error; err != nil || strings.TrimSpace(setting.Value) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dev.to API key not configured. Go to Admin → Settings to add it."})
	}

	var article domain.ContentArticle
	if err := db.DB.First(&article, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "article not found"})
	}

	var title, content, tagsJSON string
	if lang == "zh" {
		title, content, tagsJSON = article.TitleZH, article.ContentZH, article.TagsZH
	} else {
		title, content, tagsJSON = article.TitleEN, article.ContentEN, article.TagsEN
	}
	if title == "" || content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "article has no " + lang + " content"})
	}

	var rawTags []string
	json.Unmarshal([]byte(tagsJSON), &rawTags)
	tags := sanitizeDevToTags(rawTags)

	canonicalURL := fmt.Sprintf("https://www.puzzlepk.com/%s/articles/%s", lang, article.Slug)

	var req devtoRequest
	req.Article.Title = title
	req.Article.BodyMarkdown = content
	req.Article.Published = true
	req.Article.Tags = tags
	req.Article.CanonicalURL = canonicalURL

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "https://dev.to/api/articles", bytes.NewReader(body))
	httpReq.Header.Set("api-key", strings.TrimSpace(setting.Value))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "PuzzlePK-Admin/1.0")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to reach Dev.to: " + err.Error()})
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		var devtoErr map[string]interface{}
		json.Unmarshal(respBody, &devtoErr)
		msg := fmt.Sprintf("Dev.to returned HTTP %d", resp.StatusCode)
		if e, ok := devtoErr["error"].(string); ok && e != "" {
			msg = e
		}
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": msg})
	}

	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	publishedURL, _ := result["url"].(string)

	now := time.Now()
	var dist domain.ContentDistribution
	dbRes := db.DB.Where("article_id = ? AND platform = ? AND lang = ?", article.ID, "devto", lang).First(&dist)
	if dbRes.Error != nil {
		dist = domain.ContentDistribution{ArticleID: article.ID, Platform: "devto", Lang: lang, LastCopiedAt: now, CopyCount: 1, PublishedURL: publishedURL}
		db.DB.Create(&dist)
	} else {
		db.DB.Model(&dist).Updates(map[string]interface{}{"last_copied_at": now, "copy_count": dist.CopyCount + 1, "published_url": publishedURL})
	}

	return c.JSON(fiber.Map{"ok": true, "url": publishedURL})
}

// sanitizeDevToTags cleans tags for Dev.to format requirements.
func sanitizeDevToTags(tags []string) []string {
	var result []string
	for _, t := range tags {
		var sb strings.Builder
		for _, r := range strings.ToLower(t) {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
				sb.WriteRune(r)
			}
		}
		clean := strings.Trim(sb.String(), "-")
		if clean == "" || len(clean) > 30 {
			continue
		}
		result = append(result, clean)
		if len(result) == 4 {
			break
		}
	}
	return result
}
