package rest

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("my_super_secret_key") // Use env var in production

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Register(c fiber.Ctx) error {
	var req RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	role := domain.RoleUser
	if req.Username == "admin" {
		role = domain.RoleAdmin
	}

	cfg := service.GetEconomyConfig()
	user := domain.User{
		Username:   req.Username,
		Password:   string(hashedPassword),
		Role:       role,
		Status:     domain.StatusActive,
		BrainCoins: cfg.RegisterBonus,
	}

	result := db.DB.Create(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user, might already exist"})
	}

	// Create JWT token for instant post-registration authentication
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"token":   t,
		"user":    user,
	})
}

func Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user domain.User
	result := db.DB.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	if user.Status == domain.StatusBanned {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Your account has been banned."})
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	bonusXP, streak, freezeUsed, freezesLeft := service.CheckLoginStreak(user.ID)
	db.DB.First(&user, user.ID)

	return c.JSON(fiber.Map{
		"token":        t,
		"user":         user,
		"login_streak": streak,
		"bonus_xp":     bonusXP,
		"freeze_used":  freezeUsed,
		"freezes_left": freezesLeft,
	})
}

func GuestLogin(c fiber.Ctx) error {
	// Generate random username and password for guest
	timestamp := time.Now().UnixMilli()
	username := fmt.Sprintf("guest_%s_%03d", time.Now().Format("0102150405"), timestamp%1000) // e.g. guest_0525164500_123

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(username+"_secret_guest_pass"), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user := domain.User{
		Username:   username,
		Password:   string(hashedPassword),
		Role:       domain.RoleGuest,
		Status:     domain.StatusActive,
		BrainCoins: 0,
	}

	result := db.DB.Create(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create guest user"})
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{"token": t, "user": user})
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func ChangePassword(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req ChangePasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 6 characters"})
	}

	if req.OldPassword == req.NewPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password cannot be identical to current password"})
	}

	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Role == domain.RoleGuest {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Guest accounts cannot change password"})
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Current password is incorrect"})
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	if err := db.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}
