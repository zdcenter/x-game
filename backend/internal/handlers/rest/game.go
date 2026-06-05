package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	wsManager "github.com/x-game/backend/pkg/ws"
)

// GetRooms returns the current list of active rooms (HTTP polling fallback)
func GetRooms(c fiber.Ctx) error {
	rooms := wsManager.GetActiveRooms()
	return c.JSON(rooms)
}

func GetGames(c fiber.Ctx) error {
	var games []domain.GameConfig
	// Only fetch active games, sorted by manual sortOrder first, then popularity
	if err := db.DB.Where("is_active = ?", true).Order("sort_order ASC, visit_count DESC").Find(&games).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch games"})
	}
	return c.JSON(games)
}

func GetAdminGames(c fiber.Ctx) error {
	var games []domain.GameConfig
	// Admin gets all games, sorted
	if err := db.DB.Order("sort_order ASC, visit_count DESC").Find(&games).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch games"})
	}
	return c.JSON(games)
}

func UpdateGame(c fiber.Ctx) error {
	id := c.Params("id")
	var game domain.GameConfig
	
	if err := db.DB.First(&game, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Game not found"})
	}

	type UpdateRequest struct {
		Overview  *string `json:"overview"`
		Rules     *string `json:"rules"`
		Config    *string `json:"config"`
		IsActive  *bool   `json:"isActive"`
		SortOrder *int    `json:"sortOrder"`
	}

	var req UpdateRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	updates := map[string]interface{}{}
	if req.Overview != nil {
		updates["overview"] = *req.Overview
	}
	if req.Rules != nil {
		updates["rules"] = *req.Rules
	}
	if req.Config != nil {
		updates["config"] = *req.Config
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if err := db.DB.Model(&game).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update game"})
	}

	// Fetch updated
	db.DB.First(&game, "id = ?", id)
	return c.JSON(game)
}

func VisitGame(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Model(&domain.GameConfig{}).Where("id = ?", id).UpdateColumn("visit_count", db.DB.Raw("visit_count + ?", 1)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update visit count"})
	}
	return c.JSON(fiber.Map{"success": true})
}
