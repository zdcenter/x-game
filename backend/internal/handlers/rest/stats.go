package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"gorm.io/gorm"
)

type SubmitStatRequest struct {
	Mode       string `json:"mode"`
	Difficulty string `json:"difficulty"`
	Score      int    `json:"score"`
	Time       int    `json:"time"`
	Won        bool   `json:"won"`
}

// GetStats returns the personal best stats for the current user and a specific game
func GetStats(c fiber.Ctx) error {
	gameID := c.Params("game_id")
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userID := uint(userIDVal.(float64)) // JWT claims are parsed as float64

	var stats []domain.UserGameStat
	var result *gorm.DB

	if gameID == "all" {
		result = db.DB.Where("user_id = ?", userID).Find(&stats)
	} else {
		result = db.DB.Where("user_id = ? AND game_id = ?", userID, gameID).Find(&stats)
	}

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch stats"})
	}

	return c.JSON(fiber.Map{"stats": stats})
}

// SubmitStat updates or creates a personal best stat record
func SubmitStat(c fiber.Ctx) error {
	gameID := c.Params("game_id")
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req SubmitStatRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Find existing stat
	var stat domain.UserGameStat
	result := db.DB.Where("user_id = ? AND game_id = ? AND mode = ? AND difficulty = ?",
		userID, gameID, req.Mode, req.Difficulty).First(&stat)

	isNewRecord := false

	if result.Error != nil {
		// Create new stat
		stat = domain.UserGameStat{
			UserID:     userID,
			GameID:     gameID,
			Mode:       req.Mode,
			Difficulty: req.Difficulty,
			PlayCount:  1,
		}
		if req.Won {
			stat.WinCount = 1
		}

		// If it's a score based game
		if req.Score > 0 {
			stat.BestScore = req.Score
			isNewRecord = true
		}

		// If it's a time based game
		if req.Time > 0 && req.Won {
			stat.BestTime = req.Time
			isNewRecord = true
		}

		db.DB.Create(&stat)
	} else {
		// Update existing stat
		stat.PlayCount++
		if req.Won {
			stat.WinCount++
		}

		// Update Best Score if applicable
		if req.Score > stat.BestScore {
			stat.BestScore = req.Score
			isNewRecord = true
		}

		// Update Best Time if applicable (lower is better, but 0 means not set)
		if req.Time > 0 && req.Won {
			if stat.BestTime == 0 || req.Time < stat.BestTime {
				stat.BestTime = req.Time
				isNewRecord = true
			}
		}

		db.DB.Save(&stat)
	}

	return c.JSON(fiber.Map{
		"message":     "Stat submitted successfully",
		"stat":        stat,
		"isNewRecord": isNewRecord,
	})
}
