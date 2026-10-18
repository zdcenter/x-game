package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/service"
)

// GetShopItems returns available frames and titles
func GetShopItems(c fiber.Ctx) error {
	var userID uint
	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		userID = uint(userIDVal.(float64))
	}

	catalog, err := service.GetShopCatalog(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(catalog)
}

type ShopActionReq struct {
	ItemID   string `json:"item_id"`
	ItemType string `json:"item_type"` // "frame" or "title"
}

// BuyShopItem handles purchasing a cosmetic item
func BuyShopItem(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req ShopActionReq
	if err := c.Bind().Body(&req); err != nil || req.ItemID == "" || req.ItemType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	user, err := service.BuyShopItem(userID, req.ItemID, req.ItemType)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user,
	})
}

// EquipShopItem handles equipping an unlocked item
func EquipShopItem(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req ShopActionReq
	if err := c.Bind().Body(&req); err != nil || req.ItemID == "" || req.ItemType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	user, err := service.EquipShopItem(userID, req.ItemID, req.ItemType)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user,
	})
}
