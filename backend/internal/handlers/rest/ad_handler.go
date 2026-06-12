package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetAdPlacements returns all ad placements with their active networks, ordered by priority
func GetAdPlacements(c fiber.Ctx) error {
	var placements []domain.AdPlacement
	if err := db.DB.Preload("Networks", "is_enabled = ?", true).Order("id asc").Find(&placements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch ad placements"})
	}

	// Sort networks by priority (Preload doesn't support Order directly easily without custom func, so sort in memory or GORM custom preload)
	// Actually we can just do a custom Preload if needed, but since it's small, it's fine.
	for i := range placements {
		// Just a simple bubble sort for Priority
		for j := 0; j < len(placements[i].Networks)-1; j++ {
			for k := 0; k < len(placements[i].Networks)-j-1; k++ {
				if placements[i].Networks[k].Priority > placements[i].Networks[k+1].Priority {
					placements[i].Networks[k], placements[i].Networks[k+1] = placements[i].Networks[k+1], placements[i].Networks[k]
				}
			}
		}
	}

	return c.JSON(placements)
}

// AdminGetAllAdPlacements returns all ad placements with all networks for admin
func AdminGetAllAdPlacements(c fiber.Ctx) error {
	var placements []domain.AdPlacement
	if err := db.DB.Preload("Networks").Order("id asc").Find(&placements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch ad placements"})
	}

	for i := range placements {
		for j := 0; j < len(placements[i].Networks)-1; j++ {
			for k := 0; k < len(placements[i].Networks)-j-1; k++ {
				if placements[i].Networks[k].Priority > placements[i].Networks[k+1].Priority {
					placements[i].Networks[k], placements[i].Networks[k+1] = placements[i].Networks[k+1], placements[i].Networks[k]
				}
			}
		}
	}

	return c.JSON(placements)
}

// AdminUpdateAdPlacement updates placement settings
func AdminUpdateAdPlacement(c fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsEnabled       bool `json:"is_enabled"`
		DailyTotalLimit int  `json:"daily_total_limit"`
	}

	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := db.DB.Model(&domain.AdPlacement{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_enabled":        req.IsEnabled,
		"daily_total_limit": req.DailyTotalLimit,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update ad placement"})
	}

	return c.JSON(fiber.Map{"message": "success"})
}

// AdminAddAdNetwork adds a new ad network to a placement
func AdminAddAdNetwork(c fiber.Ctx) error {
	var network domain.AdNetwork
	if err := c.Bind().JSON(&network); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := db.DB.Create(&network).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create ad network"})
	}

	return c.JSON(network)
}

// AdminUpdateAdNetwork updates an existing ad network
func AdminUpdateAdNetwork(c fiber.Ctx) error {
	id := c.Params("id")
	var network domain.AdNetwork
	if err := c.Bind().JSON(&network); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := db.DB.Model(&domain.AdNetwork{}).Where("id = ?", id).Updates(map[string]interface{}{
		"provider":       network.Provider,
		"slot_id":        network.SlotID,
		"priority":       network.Priority,
		"limit_per_user": network.LimitPerUser,
		"is_enabled":     network.IsEnabled,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update ad network"})
	}

	return c.JSON(fiber.Map{"message": "success"})
}

// AdminDeleteAdNetwork deletes an ad network
func AdminDeleteAdNetwork(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.AdNetwork{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete ad network"})
	}

	return c.JSON(fiber.Map{"message": "success"})
}
