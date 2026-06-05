package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/simulator"
)

// GetPublicSettings returns non-sensitive settings for the frontend (maintenance mode, announcement)
func GetPublicSettings(c fiber.Ctx) error {
	var settings []domain.SystemSetting
	// Only fetch public settings to avoid leaking admin config
	if err := db.DB.Where("key IN ?", []string{"site_maintenance", "maintenance_message", "global_announcement", "registration_enabled"}).Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return c.JSON(result)
}

// GetAdminSettings returns all system settings
func GetAdminSettings(c fiber.Ctx) error {
	var settings []domain.SystemSetting
	if err := db.DB.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return c.JSON(result)
}

type UpdateSettingsRequest struct {
	Settings map[string]string `json:"settings"`
}

// UpdateSettings updates multiple system settings at once
func UpdateSettings(c fiber.Ctx) error {
	var req UpdateSettingsRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	for key, val := range req.Settings {
		setting := domain.SystemSetting{Key: key, Value: val}
		// Save to DB
		if err := db.DB.Save(&setting).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update setting: " + key})
		}

		// Handle specific side effects
		if key == "simulator_enabled" {
			if val == "true" {
				simulator.Enabled = true
			} else {
				simulator.Enabled = false
			}
		}
	}

	return c.JSON(fiber.Map{"message": "Settings updated successfully"})
}
