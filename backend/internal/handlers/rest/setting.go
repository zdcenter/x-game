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
	if err := db.DB.Where("key IN ?", []string{
		"site_maintenance", "maintenance_message", "global_announcement", "registration_enabled", "multiplayer_enabled", "pk_multi_round_enabled",
		"ad_interstitial_frequency", "ad_interstitial_daily_limit",
		"ad_pc_left_slot", "ad_pc_right_slot", "ad_mobile_lobby_slot",
	}).Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return c.JSON(result)
}

// GetAdminSettings returns all system settings as {settings: [{key,value}]}
func GetAdminSettings(c fiber.Ctx) error {
	var settings []domain.SystemSetting
	if err := db.DB.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	type kvPair struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	pairs := make([]kvPair, 0, len(settings))
	for _, s := range settings {
		pairs = append(pairs, kvPair{Key: s.Key, Value: s.Value})
	}
	return c.JSON(fiber.Map{"settings": pairs})
}

type UpdateSettingsRequest struct {
	Settings map[string]string `json:"settings"`
}

// BulkUpdateSettingsRequest accepts an array of {key, value} pairs
type BulkUpdateSettingsRequest struct {
	Settings []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"settings"`
}

// UpdateSettings updates multiple system settings at once (map format)
func UpdateSettings(c fiber.Ctx) error {
	var req UpdateSettingsRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	for key, val := range req.Settings {
		if err := upsertSetting(key, val); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update setting: " + key})
		}
	}
	return c.JSON(fiber.Map{"message": "Settings updated successfully"})
}

// BulkUpdateSettings updates settings from an array of {key,value} pairs
func BulkUpdateSettings(c fiber.Ctx) error {
	var req BulkUpdateSettingsRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	for _, kv := range req.Settings {
		if err := upsertSetting(kv.Key, kv.Value); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update setting: " + kv.Key})
		}
	}
	return c.JSON(fiber.Map{"message": "Settings updated successfully"})
}

func upsertSetting(key, val string) error {
	setting := domain.SystemSetting{Key: key, Value: val}
	if err := db.DB.Save(&setting).Error; err != nil {
		return err
	}
	if key == "simulator_enabled" {
		simulator.Enabled = val == "true"
	}
	return nil
}
