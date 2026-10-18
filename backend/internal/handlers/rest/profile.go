package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
)

// GetProfileMe returns the current user's profile with XP/level/streak info, brain radar, and coins.
func GetProfileMe(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	// Check login streak on each profile fetch
	bonusXP, streak, freezeUsed, freezesLeft := service.CheckLoginStreak(userID)

	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	radar := service.GetUserBrainRadar(userID)

	return c.JSON(fiber.Map{
		"user":            user,
		"login_streak":    streak,
		"streak_bonus_xp": bonusXP,
		"freeze_used":     freezeUsed,
		"freezes_left":    freezesLeft,
		"level_progress":  service.GetLevelProgress(user.XP),
		"brain_radar":     radar,
	})
}

// GetBrainRadar returns brain radar for the current user or guest
func GetBrainRadar(c fiber.Ctx) error {
	var userID uint
	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		userID = uint(userIDVal.(float64))
	}
	radar := service.GetUserBrainRadar(userID)
	return c.JSON(radar)
}
