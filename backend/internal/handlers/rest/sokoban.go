package rest

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetSokobanLevels returns all puzzles for a given difficulty and the user's progress.
func GetSokobanLevels(c fiber.Ctx) error {
	difficulty := c.Params("difficulty")

	var puzzles []domain.SokobanPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Order("level_num asc").Find(&puzzles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch puzzles"})
	}

	progressMap := make(map[string]domain.UserSokobanProgress)

	if userIDStr := c.Locals("user_id"); userIDStr != nil {
		userID := uint(userIDStr.(float64))
		var progresses []domain.UserSokobanProgress
		if err := db.DB.Where("user_id = ?", userID).Find(&progresses).Error; err == nil {
			for _, p := range progresses {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type LevelResponse struct {
		ID         string                     `json:"id"`
		Difficulty domain.SokobanDifficulty   `json:"difficulty"`
		LevelNum   int                        `json:"level_num"`
		Puzzle     string                     `json:"puzzle"`
		Progress   domain.UserSokobanProgress `json:"progress"` // empty if not started
	}

	var response []LevelResponse
	for _, p := range puzzles {
		resp := LevelResponse{
			ID:         p.ID,
			Difficulty: p.Difficulty,
			LevelNum:   p.LevelNum,
			Puzzle:     p.Puzzle,
		}
		if prog, ok := progressMap[p.ID]; ok {
			resp.Progress = prog
		}
		response = append(response, resp)
	}

	return c.JSON(response)
}

// GetSokobanPuzzle returns the puzzle string, and creates/fetches progress.
func GetSokobanPuzzle(c fiber.Ctx) error {
	puzzleID := c.Params("id")

	var puzzle domain.SokobanPuzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Puzzle not found"})
	}

	var progress domain.UserSokobanProgress
	if userIDStr := c.Locals("user_id"); userIDStr != nil {
		userID := uint(userIDStr.(float64))
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", userID, puzzleID).First(&progress).Error; err != nil {
			// Create new progress if not exists
			progress = domain.UserSokobanProgress{
				UserID:   userID,
				PuzzleID: puzzleID,
				Status:   domain.SokobanStatusPlaying,
			}
			db.DB.Create(&progress)
		}
	}

	return c.JSON(fiber.Map{
		"puzzle":   puzzle,
		"progress": progress,
	})
}

type SaveSokobanProgressReq struct {
	Moves     int `json:"moves"`
	TimeSpent int `json:"time_spent"`
}

func SaveSokobanProgress(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userIDStr := c.Locals("user_id")

	if userIDStr == nil {
		return c.JSON(fiber.Map{"status": "ok", "message": "guest progress not saved to db"})
	}

	userID := uint(userIDStr.(float64))

	var req SaveSokobanProgressReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var progress domain.UserSokobanProgress
	err := db.DB.Where(domain.UserSokobanProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSokobanProgress{
			Moves:     req.Moves,
			TimeSpent: req.TimeSpent,
		}).FirstOrCreate(&progress).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save progress"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

type FinishSokobanProgressReq struct {
	Moves     int `json:"moves"`
	TimeSpent int `json:"time_spent"`
	Stars     int `json:"stars"`
}

func FinishSokoban(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userIDStr := c.Locals("user_id")

	if userIDStr == nil {
		return c.JSON(fiber.Map{"status": "ok", "message": "guest progress finished locally"})
	}

	userID := uint(userIDStr.(float64))

	var req FinishSokobanProgressReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var progress domain.UserSokobanProgress
	err := db.DB.Where(domain.UserSokobanProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSokobanProgress{
			Status:    domain.SokobanStatusFinished,
			Moves:     req.Moves,
			TimeSpent: req.TimeSpent,
			Stars:     req.Stars,
		}).FirstOrCreate(&progress).Error

	if err != nil {
		log.Println("Error updating:", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to finish puzzle"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}
