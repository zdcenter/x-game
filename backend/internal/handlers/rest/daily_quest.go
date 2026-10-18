package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/service"
)

// GetDailyQuests returns today's automated quest list and progress
func GetDailyQuests(c fiber.Ctx) error {
	var userID uint
	if v := c.Locals("user_id"); v != nil {
		userID = uint(v.(float64))
	}

	res, err := service.GetDailyQuests(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}

type ClaimDailyQuestRequest struct {
	QuestID string `json:"quest_id"`
}

// ClaimDailyQuest awards XP and marks a completed quest as claimed
func ClaimDailyQuest(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req ClaimDailyQuestRequest
	if err := c.Bind().Body(&req); err != nil || req.QuestID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body, quest_id required"})
	}

	res, err := service.ClaimDailyQuest(userID, req.QuestID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}
