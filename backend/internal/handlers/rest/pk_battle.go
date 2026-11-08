package rest

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/service"
)

// GetRecentPKBattles returns the recent public member PK matches for the live esports ticker/feed.
func GetRecentPKBattles(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "15"))
	battles := service.GetRecentPKBattles(limit)
	return c.JSON(fiber.Map{
		"battles": battles,
		"count":   len(battles),
	})
}

// GetMyPKBattles returns the authenticated member's personal battle history and performance summary.
func GetMyPKBattles(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "15"))
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	offset := (page - 1) * limit

	gameID := c.Query("gameId", "")
	result := c.Query("result", "all")

	battles, total, summary := service.GetMyPKBattles(userID, limit, offset, gameID, result)

	return c.JSON(fiber.Map{
		"battles": battles,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"summary": summary,
	})
}

