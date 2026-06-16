package rest

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/service"
)

// GetMatchHistory returns the current user's recent match history.
// Query params: limit (1-100), gameId, mode
func GetMatchHistory(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	gameID := c.Query("gameId", "")
	mode := c.Query("mode", "")

	history := service.GetMatchHistory(userID, limit, gameID, mode)
	return c.JSON(fiber.Map{"history": history, "count": len(history)})
}
