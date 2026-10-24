package rest

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type SubmitFeedbackRequest struct {
	GameID     string `json:"game_id"`
	Level      string `json:"level"`
	Type       string `json:"type"` // bug, suggestion, wrong_answer, other
	Content    string `json:"content"`
	DeviceInfo string `json:"device_info"`
	Contact    string `json:"contact"`
}

// SubmitFeedback allows players (guest or authenticated) to submit feedback or bug reports
func SubmitFeedback(c fiber.Ctx) error {
	var req SubmitFeedbackRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	trimmedContent := strings.TrimSpace(req.Content)
	if len(trimmedContent) < 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Feedback content is too short"})
	}
	if len(trimmedContent) > 3000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Feedback content is too long"})
	}

	fbType := strings.TrimSpace(req.Type)
	if fbType == "" {
		fbType = "bug"
	}

	feedback := domain.Feedback{
		GameID:     strings.TrimSpace(req.GameID),
		Level:      strings.TrimSpace(req.Level),
		Type:       fbType,
		Content:    trimmedContent,
		DeviceInfo: strings.TrimSpace(req.DeviceInfo),
		Contact:    strings.TrimSpace(req.Contact),
		Status:     "pending",
	}

	// Check if user is authenticated
	if uidVal := c.Locals("user_id"); uidVal != nil {
		if uidStr, ok := uidVal.(string); ok {
			if parsedUUID, err := uuid.Parse(uidStr); err == nil {
				feedback.UserID = &parsedUUID
				var user domain.User
				if err := db.DB.Select("id, username").First(&user, "id = ?", parsedUUID).Error; err == nil {
					feedback.Username = user.Username
				}
			}
		}
	}

	if err := db.DB.Create(&feedback).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to submit feedback"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Feedback submitted successfully",
		"id":      feedback.ID,
	})
}

// AdminListFeedbacks retrieves feedback list with filters and pagination
func AdminListFeedbacks(c fiber.Ctx) error {
	gameID := c.Query("game_id")
	fbType := c.Query("type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&domain.Feedback{})
	if gameID != "" {
		query = query.Where("game_id = ?", gameID)
	}
	if fbType != "" {
		query = query.Where("type = ?", fbType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var feedbacks []domain.Feedback
	if err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&feedbacks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load feedbacks"})
	}

	return c.JSON(fiber.Map{
		"data":  feedbacks,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// AdminUpdateFeedback updates the status or admin note of a feedback
func AdminUpdateFeedback(c fiber.Ctx) error {
	id := c.Params("id")
	var fb domain.Feedback
	if err := db.DB.First(&fb, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Feedback not found"})
	}

	type UpdateReq struct {
		Status    *string `json:"status"`
		AdminNote *string `json:"admin_note"`
	}
	var req UpdateReq
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	if req.Status != nil {
		fb.Status = *req.Status
	}
	if req.AdminNote != nil {
		fb.AdminNote = *req.AdminNote
	}

	if err := db.DB.Save(&fb).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update feedback"})
	}

	return c.JSON(fb)
}

// AdminDeleteFeedback deletes a feedback entry
func AdminDeleteFeedback(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.Feedback{}, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete feedback"})
	}
	return c.JSON(fiber.Map{"message": "Feedback deleted successfully"})
}
