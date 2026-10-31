package rest

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/simulator"
	"golang.org/x/crypto/bcrypt"
)

type ToggleStatusRequest struct {
	Status domain.Status `json:"status"` // "active" or "banned"
}

func GetUsers(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "15"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 15
	}
	search := strings.TrimSpace(c.Query("search", ""))
	sortBy := strings.ToLower(strings.TrimSpace(c.Query("sortBy", "created_at")))
	order := strings.ToUpper(strings.TrimSpace(c.Query("order", "DESC")))
	if order != "ASC" && order != "DESC" {
		order = "DESC"
	}

	validSortFields := map[string]string{
		"brain_coins": "brain_coins",
		"xp":          "xp",
		"level":       "level",
		"created_at":  "created_at",
		"username":    "username",
		"id":          "id",
	}

	sortField, ok := validSortFields[sortBy]
	if !ok {
		sortField = "created_at"
	}

	var users []domain.User
	var total int64

	countQuery := db.DB.Model(&domain.User{})
	listQuery := db.DB.Model(&domain.User{})

	if search != "" {
		pattern := "%" + search + "%"
		if idVal, err := strconv.ParseInt(search, 10, 64); err == nil && idVal > 0 {
			countQuery = countQuery.Where("username ILIKE ? OR id = ?", pattern, idVal)
			listQuery = listQuery.Where("username ILIKE ? OR id = ?", pattern, idVal)
		} else {
			countQuery = countQuery.Where("username ILIKE ?", pattern)
			listQuery = listQuery.Where("username ILIKE ?", pattern)
		}
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count users"})
	}

	orderClause := fmt.Sprintf("%s %s", sortField, order)
	if sortField != "id" {
		orderClause += ", id DESC"
	}

	offset := (page - 1) * pageSize
	result := listQuery.Select("id", "username", "avatar", "role", "status", "xp", "level", "brain_coins", "created_at").
		Order(orderClause).
		Offset(offset).
		Limit(pageSize).
		Find(&users)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}

	return c.JSON(fiber.Map{
		"users":      users,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
		"sort_by":    sortField,
		"sort_order": order,
	})
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

type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func AdminResetPassword(c fiber.Ctx) error {
	id := c.Params("id")
	var req AdminResetPasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}

	var user domain.User
	if err := db.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	if err := db.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	return c.JSON(fiber.Map{"message": "Password reset successfully"})
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
