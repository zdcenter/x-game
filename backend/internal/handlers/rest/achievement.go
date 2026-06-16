package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
)

// GetAchievements returns all achievements with the current user's unlock status.
func GetAchievements(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	var userID uint
	if userIDVal != nil {
		userID = uint(userIDVal.(float64))
	}
	achievements := service.GetAchievementsWithStatus(userID)
	return c.JSON(fiber.Map{"achievements": achievements})
}

// GetMyAchievements returns only the achievements a user has unlocked.
func GetMyAchievements(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var unlocked []domain.UserAchievement
	db.DB.Where("user_id = ?", userID).Order("unlocked_at desc").Find(&unlocked)

	var achievementIDs []string
	for _, ua := range unlocked {
		achievementIDs = append(achievementIDs, ua.AchievementID)
	}

	var achievements []domain.Achievement
	if len(achievementIDs) > 0 {
		db.DB.Where("id IN ?", achievementIDs).Find(&achievements)
	}

	return c.JSON(fiber.Map{
		"achievements": achievements,
		"count":        len(achievements),
	})
}

// AdminListAchievements lists all achievements with unlock counts.
func AdminListAchievements(c fiber.Ctx) error {
	type AchievementAdmin struct {
		domain.Achievement
		UnlockCount int64 `json:"unlock_count"`
	}

	var achievements []domain.Achievement
	db.DB.Order("sort_order asc, id asc").Find(&achievements)

	result := make([]AchievementAdmin, 0, len(achievements))
	for _, a := range achievements {
		var count int64
		db.DB.Model(&domain.UserAchievement{}).Where("achievement_id = ?", a.ID).Count(&count)
		result = append(result, AchievementAdmin{Achievement: a, UnlockCount: count})
	}

	return c.JSON(fiber.Map{"achievements": result})
}

// AdminCreateAchievement creates a new achievement definition.
func AdminCreateAchievement(c fiber.Ctx) error {
	var a domain.Achievement
	if err := c.Bind().Body(&a); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	if a.ID == "" || a.TitleKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id and title_key are required"})
	}
	if err := db.DB.Create(&a).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create achievement"})
	}
	return c.Status(fiber.StatusCreated).JSON(a)
}

// AdminUpdateAchievement updates an achievement definition.
func AdminUpdateAchievement(c fiber.Ctx) error {
	id := c.Params("id")
	var a domain.Achievement
	if err := db.DB.First(&a, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}
	if err := c.Bind().Body(&a); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	a.ID = id // prevent ID change
	db.DB.Save(&a)
	return c.JSON(a)
}

// AdminDeleteAchievement soft-deletes an achievement (sets is_active=false).
func AdminDeleteAchievement(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Model(&domain.Achievement{}).Where("id = ?", id).Update("is_active", false).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

// AdminGetUserAchievements returns a specific user's achievements (anti-cheat inspection).
func AdminGetUserAchievements(c fiber.Ctx) error {
	userID := c.Params("id")
	achievements := service.GetAchievementsWithStatus(parseUintParam(userID))
	return c.JSON(fiber.Map{"achievements": achievements})
}

func parseUintParam(s string) uint {
	var n uint
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + uint(c-'0')
	}
	return n
}
