package rest

import (
	"fmt"
	"mime"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/pkg/r2"
)

func AdminListImages(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}
	prefix := c.Query("prefix", "")
	items, err := r2.Default.List(c.Context(), prefix)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if items == nil {
		items = []r2.ImageItem{}
	}
	return c.JSON(items)
}

func AdminUploadImages(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid multipart form"})
	}

	files := form.File["files"]
	if len(files) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "no files provided"})
	}

	uploaded := make([]r2.ImageItem, 0, len(files))
	ts := time.Now().Format("060102")

	for _, fh := range files {
		ext  := strings.ToLower(filepath.Ext(fh.Filename))
		base := strings.TrimSuffix(fh.Filename, filepath.Ext(fh.Filename))
		base = sanitizeFilename(base)
		key  := fmt.Sprintf("covers/%s-%s%s", ts, base, ext)

		ct := fh.Header.Get("Content-Type")
		if ct == "" || ct == "application/octet-stream" {
			ct = mime.TypeByExtension(ext)
		}
		if ct == "" {
			ct = "image/jpeg"
		}

		f, err := fh.Open()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "cannot open file: " + err.Error()})
		}
		item, err := r2.Default.Upload(c.Context(), key, f, ct)
		f.Close()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "upload failed: " + err.Error()})
		}
		item.Size = fh.Size
		uploaded = append(uploaded, item)
	}

	return c.Status(201).JSON(uploaded)
}

func AdminDeleteImages(c fiber.Ctx) error {
	if r2.Default == nil {
		return c.Status(503).JSON(fiber.Map{"error": "R2 not configured"})
	}

	var body struct {
		Keys []string `json:"keys"`
	}
	if err := c.Bind().JSON(&body); err != nil || len(body.Keys) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "keys array required"})
	}

	if err := r2.Default.DeleteMany(c.Context(), body.Keys); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"deleted": len(body.Keys)})
}

func sanitizeFilename(name string) string {
	name = url.QueryEscape(name)
	name = strings.ReplaceAll(name, "%", "")
	name = strings.ReplaceAll(name, "+", "-")
	if len(name) > 40 {
		name = name[:40]
	}
	if name == "" {
		name = "img"
	}
	return name
}
