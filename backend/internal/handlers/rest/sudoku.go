package rest

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// GetSudokuLevels returns all puzzles for a given difficulty and the user's progress.
func GetSudokuLevels(c fiber.Ctx) error {
	difficulty := c.Params("difficulty")

	var puzzles []domain.SudokuPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch puzzles"})
	}

	progressMap := make(map[string]domain.UserSudokuProgress)
	
	if userIDStr := c.Locals("user_id"); userIDStr != nil {
		userID := uint(userIDStr.(float64))
		var progresses []domain.UserSudokuProgress
		if err := db.DB.Where("user_id = ?", userID).Find(&progresses).Error; err == nil {
			for _, p := range progresses {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type LevelResponse struct {
		ID         string                    `json:"id"`
		Difficulty domain.SudokuDifficulty   `json:"difficulty"`
		Progress   domain.UserSudokuProgress `json:"progress"` // empty if not started
	}

	var response []LevelResponse
	for _, p := range puzzles {
		resp := LevelResponse{
			ID:         p.ID,
			Difficulty: p.Difficulty,
		}
		if prog, ok := progressMap[p.ID]; ok {
			resp.Progress = prog
		}
		response = append(response, resp)
	}

	return c.JSON(response)
}

// GetSudokuPuzzle returns the puzzle string, and creates/fetches progress.
func GetSudokuPuzzle(c fiber.Ctx) error {
	puzzleID := c.Params("id")

	var puzzle domain.SudokuPuzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Puzzle not found"})
	}

	var progress domain.UserSudokuProgress
	if userIDStr := c.Locals("user_id"); userIDStr != nil {
		userID := uint(userIDStr.(float64))
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", userID, puzzleID).First(&progress).Error; err != nil {
			// Create new progress if not exists
			progress = domain.UserSudokuProgress{
				UserID:   userID,
				PuzzleID: puzzleID,
				Status:   domain.SudokuStatusPlaying,
			}
			db.DB.Create(&progress)
		}
	}

	return c.JSON(fiber.Map{
		"puzzle":   puzzle,
		"progress": progress,
	})
}

type SaveProgressReq struct {
	CurrentState string `json:"current_state"`
	TimeSpent    int    `json:"time_spent"`
}

func SaveSudokuProgress(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userIDStr := c.Locals("user_id")

	if userIDStr == nil {
		return c.JSON(fiber.Map{"status": "ok", "message": "guest progress not saved to db"})
	}

	userID := uint(userIDStr.(float64))

	var req SaveProgressReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	var progress domain.UserSudokuProgress
	err := db.DB.Where(domain.UserSudokuProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSudokuProgress{
			CurrentState: req.CurrentState,
			TimeSpent:    req.TimeSpent,
		}).FirstOrCreate(&progress).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save progress"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

type FinishProgressReq struct {
	TimeSpent int `json:"time_spent"`
	Stars     int `json:"stars"`
}

func FinishSudoku(c fiber.Ctx) error {
	puzzleID := c.Params("id")
	userIDStr := c.Locals("user_id")

	if userIDStr == nil {
		return c.JSON(fiber.Map{"status": "ok", "message": "guest progress finished locally"})
	}

	userID := uint(userIDStr.(float64))

	var req FinishProgressReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Verify solution server side optionally, but for now just update status
	var progress domain.UserSudokuProgress
	err := db.DB.Where(domain.UserSudokuProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSudokuProgress{
			Status:    domain.SudokuStatusFinished,
			TimeSpent: req.TimeSpent,
			Stars:     req.Stars,
		}).FirstOrCreate(&progress).Error

	if err != nil {
		log.Println("Error updating:", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to finish puzzle"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}
