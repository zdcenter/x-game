package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetActiveAnnouncements returns all active announcements sorted by SortOrder
func GetActiveAnnouncements(c fiber.Ctx) error {
	var announcements []domain.Announcement
	db.DB.Where("is_active = ?", true).Order("sort_order asc, created_at desc").Find(&announcements)
	return c.JSON(announcements)
}

// AdminGetAllAnnouncements returns all announcements
func AdminGetAllAnnouncements(c fiber.Ctx) error {
	var announcements []domain.Announcement
	db.DB.Order("sort_order asc, created_at desc").Find(&announcements)
	return c.JSON(announcements)
}

// AdminCreateAnnouncement creates a new announcement
func AdminCreateAnnouncement(c fiber.Ctx) error {
	var ann domain.Announcement
	if err := c.Bind().JSON(&ann); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := db.DB.Create(&ann).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create announcement"})
	}

	return c.JSON(ann)
}

// AdminUpdateAnnouncement updates an existing announcement
func AdminUpdateAnnouncement(c fiber.Ctx) error {
	id := c.Params("id")
	var ann domain.Announcement

	if err := db.DB.First(&ann, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Announcement not found"})
	}

	// Parse new data
	type UpdateData struct {
		Content   *string `json:"content"`
		IsActive  *bool   `json:"is_active"`
		SortOrder *int    `json:"sort_order"`
	}
	var data UpdateData
	if err := c.Bind().JSON(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if data.Content != nil {
		ann.Content = *data.Content
	}
	if data.IsActive != nil {
		ann.IsActive = *data.IsActive
	}
	if data.SortOrder != nil {
		ann.SortOrder = *data.SortOrder
	}

	db.DB.Save(&ann)

	return c.JSON(ann)
}

// AdminDeleteAnnouncement deletes an announcement
func AdminDeleteAnnouncement(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.Announcement{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete announcement"})
	}
	return c.JSON(fiber.Map{"message": "Deleted successfully"})
}
