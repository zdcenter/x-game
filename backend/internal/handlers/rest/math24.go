package rest

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetMath24Levels returns all puzzles for a given difficulty and the user's progress.
func GetMath24Levels(c fiber.Ctx) error {
	difficulty := c.Params("difficulty")
	userID := uint(c.Locals("user_id").(float64))

	var puzzles []domain.Math24Puzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch puzzles"})
	}

	var progresses []domain.UserMath24Progress
	if err := db.DB.Where("user_id = ?", userID).Find(&progresses).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch progress"})
	}

	// Merge progress into puzzle list
	progressMap := make(map[string]domain.UserMath24Progress)
	for _, p := range progresses {
		progressMap[p.PuzzleID] = p
	}

	type LevelResponse struct {
		ID         string                    `json:"id"`
		Difficulty domain.Math24Difficulty   `json:"difficulty"`
		Cards      string                    `json:"cards"`
		Progress   domain.UserMath24Progress `json:"progress"` // empty if not started
	}

	var response []LevelResponse
	for _, p := range puzzles {
		resp := LevelResponse{
			ID:         p.ID,
			Difficulty: p.Difficulty,
			Cards:      p.Cards,
		}
		if prog, ok := progressMap[p.ID]; ok {
			resp.Progress = prog
		}
		response = append(response, resp)
	}

	return c.JSON(response)
}

// GetMath24Puzzle returns the puzzle string, and creates/fetches progress.
func GetMath24Puzzle(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userID := uint(c.Locals("user_id").(float64))

	var puzzle domain.Math24Puzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Puzzle not found"})
	}

	var progress domain.UserMath24Progress
	if err := db.DB.Where("user_id = ? AND puzzle_id = ?", userID, puzzleID).First(&progress).Error; err != nil {
		// Create new progress if not exists
		progress = domain.UserMath24Progress{
			UserID:   userID,
			PuzzleID: puzzleID,
			Status:   domain.Math24StatusPlaying,
		}
		db.DB.Create(&progress)
	}

	return c.JSON(fiber.Map{
		"puzzle":   puzzle,
		"progress": progress,
	})
}

type FinishMath24ProgressReq struct {
	TimeSpent int `json:"time_spent"`
	Stars     int `json:"stars"`
}

func FinishMath24(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userID := uint(c.Locals("user_id").(float64))

	var req FinishMath24ProgressReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	err := db.DB.Model(&domain.UserMath24Progress{}).
		Where("user_id = ? AND puzzle_id = ?", userID, puzzleID).
		Updates(map[string]interface{}{
			"status":     domain.Math24StatusFinished,
			"time_spent": req.TimeSpent,
			"stars":      req.Stars,
		}).Error

	if err != nil {
		log.Println("Error updating:", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to finish puzzle"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}
