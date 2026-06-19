package rest

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// AdminListIdioms GET /admin/idioms?page=1&limit=20&q=破釜&difficulty=hard&daily_target=true
func AdminListIdioms(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	q := db.DB.Model(&domain.Idiom{}).Order("id DESC")
	if kw := strings.TrimSpace(c.Query("q")); kw != "" {
		q = q.Where("word LIKE ? OR explanation LIKE ? OR pinyin LIKE ?",
			"%"+kw+"%", "%"+kw+"%", "%"+kw+"%")
	}
	if diff := c.Query("difficulty"); diff != "" {
		q = q.Where("difficulty = ?", diff)
	}
	if dt := c.Query("daily_target"); dt == "true" {
		q = q.Where("is_daily_target = ?", true)
	} else if dt == "false" {
		q = q.Where("is_daily_target = ?", false)
	}

	var total int64
	q.Count(&total)

	var idioms []domain.Idiom
	q.Offset(offset).Limit(limit).Find(&idioms)

	return c.JSON(fiber.Map{
		"items": idioms,
		"total": total,
		"page":  page,
		"limit": limit,
		"pages": (int(total) + limit - 1) / limit,
	})
}

// AdminCreateIdiom POST /admin/idioms
func AdminCreateIdiom(c fiber.Ctx) error {
	type Req struct {
		Word          string `json:"word"`
		Pinyin        string `json:"pinyin"`
		Explanation   string `json:"explanation"`
		Story         string `json:"story"`
		Derivation    string `json:"derivation"`
		Difficulty    string `json:"difficulty"`
		IsDailyTarget bool   `json:"is_daily_target"`
	}
	var req Req
	if err := c.Bind().JSON(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request")
	}
	req.Word = strings.TrimSpace(req.Word)
	if req.Word == "" {
		return fiber.NewError(fiber.StatusBadRequest, "word is required")
	}
	if req.Difficulty == "" {
		req.Difficulty = "medium"
	}

	idiom := domain.Idiom{
		Word:          req.Word,
		Pinyin:        req.Pinyin,
		Explanation:   req.Explanation,
		Story:         req.Story,
		Derivation:    req.Derivation,
		Difficulty:    req.Difficulty,
		IsDailyTarget: req.IsDailyTarget,
	}
	if err := db.DB.Create(&idiom).Error; err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return fiber.NewError(fiber.StatusConflict, "idiom already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "create failed")
	}
	return c.Status(fiber.StatusCreated).JSON(idiom)
}

// AdminUpdateIdiom PUT /admin/idioms/:id
func AdminUpdateIdiom(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}

	type Req struct {
		Word          string `json:"word"`
		Pinyin        string `json:"pinyin"`
		Explanation   string `json:"explanation"`
		Story         string `json:"story"`
		Derivation    string `json:"derivation"`
		Difficulty    string `json:"difficulty"`
		IsDailyTarget bool   `json:"is_daily_target"`
	}
	var req Req
	if err := c.Bind().JSON(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request")
	}

	var idiom domain.Idiom
	if err := db.DB.First(&idiom, id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "idiom not found")
	}

	updates := map[string]any{
		"word":            strings.TrimSpace(req.Word),
		"pinyin":          req.Pinyin,
		"explanation":     req.Explanation,
		"story":           req.Story,
		"derivation":      req.Derivation,
		"difficulty":      req.Difficulty,
		"is_daily_target": req.IsDailyTarget,
	}
	if err := db.DB.Model(&idiom).Updates(updates).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "update failed")
	}
	db.DB.First(&idiom, id)
	return c.JSON(idiom)
}

// AdminDeleteIdiom DELETE /admin/idioms/:id
func AdminDeleteIdiom(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}
	var idiom domain.Idiom
	if err := db.DB.First(&idiom, id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "idiom not found")
	}
	// Also clean up orphaned progress rows
	db.DB.Exec("DELETE FROM gm_user_idiom_progresses WHERE idiom_id = ?", id)
	db.DB.Delete(&idiom)
	return c.JSON(fiber.Map{"message": "deleted"})
}
