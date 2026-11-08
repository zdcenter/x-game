package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetNotifications returns notifications for the current authenticated user.
func GetNotifications(c fiber.Ctx) error {
	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}
	if currentUserID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var notifications []domain.Notification
	err := db.DB.Where("user_id = ?", currentUserID).
		Order("created_at DESC").
		Limit(30).
		Find(&notifications).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch notifications",
		})
	}

	var unreadCount int64
	db.DB.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = false", currentUserID).
		Count(&unreadCount)

	return c.JSON(fiber.Map{
		"notifications": notifications,
		"unread_count":  unreadCount,
	})
}

// MarkNotificationRead marks a single notification as read.
func MarkNotificationRead(c fiber.Ctx) error {
	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}
	if currentUserID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	type ReadReq struct {
		ID uint `json:"id"`
	}
	var req ReadReq
	if err := c.Bind().Body(&req); err != nil || req.ID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid notification ID",
		})
	}

	db.DB.Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", req.ID, currentUserID).
		Update("is_read", true)

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// MarkAllNotificationsRead marks all notifications for current user as read.
func MarkAllNotificationsRead(c fiber.Ctx) error {
	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}
	if currentUserID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	db.DB.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = false", currentUserID).
		Update("is_read", true)

	return c.JSON(fiber.Map{
		"success": true,
	})
}
