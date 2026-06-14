package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
)

func AdminProtected() fiber.Handler {
	return func(c fiber.Ctx) error {
		role := c.Locals("role")

		if role == nil || role.(string) != string(domain.RoleAdmin) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied: Admins only"})
		}

		return c.Next()
	}
}
