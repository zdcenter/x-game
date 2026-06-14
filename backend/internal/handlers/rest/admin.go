package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/simulator"
)

type ToggleStatusRequest struct {
	Status domain.Status `json:"status"` // "active" or "banned"
}

func GetUsers(c fiber.Ctx) error {
	var users []domain.User
	result := db.DB.Select("id", "username", "role", "status", "created_at").Find(&users)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}

	return c.JSON(fiber.Map{"users": users})
}

func ToggleUserStatus(c fiber.Ctx) error {
	id := c.Params("id")

	var req ToggleStatusRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Status != domain.StatusActive && req.Status != domain.StatusBanned {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status must be active or banned"})
	}

	// Fetch user to prevent banning other admins? Optional MVP check
	var user domain.User
	if err := db.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Role == domain.RoleAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Cannot ban another admin"})
	}

	user.Status = req.Status
	db.DB.Save(&user)

	return c.JSON(fiber.Map{"message": "User status updated", "user": user})
}

func GetSimulatorStatus(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"enabled": simulator.Enabled})
}

func ToggleSimulator(c fiber.Ctx) error {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	simulator.Enabled = req.Enabled
	// If enabled, refresh data immediately
	if simulator.Enabled {
		simulator.ForceRefresh()
	}

	return c.JSON(fiber.Map{"enabled": simulator.Enabled, "message": "Simulator status updated"})
}
