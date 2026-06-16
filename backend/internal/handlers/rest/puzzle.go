package rest

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
)

// SavePayload is the union of all save-progress request bodies across games.
type SavePayload struct {
	CurrentState string `json:"current_state"` // sudoku
	Moves        int    `json:"moves"`          // sokoban
	TimeSpent    int    `json:"time_spent"`
}

// FinishPayload is the union of all finish-puzzle request bodies across games.
type FinishPayload struct {
	Moves      int    `json:"moves"`       // sokoban
	TimeSpent  int    `json:"time_spent"`
	Stars      int    `json:"stars"`
	Mode       string `json:"mode"`        // e.g. "single"
	Difficulty string `json:"difficulty"`  // e.g. "easy", "medium", "hard"
}

// PuzzleRepo abstracts game-specific DB operations for puzzle-based games.
// Implement this interface to add a new puzzle game — the shared handlers
// handle all HTTP plumbing (auth, error responses, guest short-circuits).
type PuzzleRepo interface {
	// GetLevels returns a game-specific []item slice for the given difficulty + optional user.
	GetLevels(difficulty string, userID *uint) (any, error)

	// GetPuzzle returns the puzzle and the user's progress row (creating one if needed).
	GetPuzzle(puzzleID string, userID *uint) (puzzle any, progress any, err error)

	// SaveProgress persists in-progress state. Only called when HasSave() returns true.
	SaveProgress(puzzleID string, userID uint, req SavePayload) error

	// Finish marks a puzzle as completed.
	Finish(puzzleID string, userID uint, req FinishPayload) error

	// HasSave controls whether the /puzzle/:id/save route is registered.
	HasSave() bool
}

// RegisterPuzzleRoutes wires the shared REST handlers onto a fiber.Router group.
// gameID is the canonical game identifier (e.g. "sudoku") used for stat tracking.
// Call this once per game in main.go after setting up auth middleware on the group.
func RegisterPuzzleRoutes(group fiber.Router, gameID string, repo PuzzleRepo) {
	group.Get("/levels/:difficulty", makeLevelsHandler(repo))
	group.Get("/puzzle/:id", makePuzzleHandler(repo))
	if repo.HasSave() {
		group.Post("/puzzle/:id/save", makeSaveHandler(repo))
	}
	group.Post("/puzzle/:id/finish", makeFinishHandler(gameID, repo))
}

// getUserID extracts the authenticated user ID from Fiber locals, or nil for guests.
func getUserID(c fiber.Ctx) *uint {
	if v := c.Locals("user_id"); v != nil {
		id := uint(v.(float64))
		return &id
	}
	return nil
}

func makeLevelsHandler(repo PuzzleRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		levels, err := repo.GetLevels(c.Params("difficulty"), getUserID(c))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch puzzles"})
		}
		return c.JSON(levels)
	}
}

func makePuzzleHandler(repo PuzzleRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		puzzle, progress, err := repo.GetPuzzle(c.Params("id"), getUserID(c))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Puzzle not found"})
		}
		return c.JSON(fiber.Map{"puzzle": puzzle, "progress": progress})
	}
}

func makeSaveHandler(repo PuzzleRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := getUserID(c)
		if userID == nil {
			return c.JSON(fiber.Map{"status": "ok", "message": "guest progress not saved to db"})
		}
		var req SavePayload
		if err := c.Bind().Body(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		if err := repo.SaveProgress(c.Params("id"), *userID, req); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save progress"})
		}
		return c.JSON(fiber.Map{"status": "ok"})
	}
}

func makeFinishHandler(gameID string, repo PuzzleRepo) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := getUserID(c)
		if userID == nil {
			return c.JSON(fiber.Map{"status": "ok", "message": "guest progress finished locally"})
		}
		var req FinishPayload
		if err := c.Bind().Body(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		if err := repo.Finish(c.Params("id"), *userID, req); err != nil {
			log.Printf("Failed to finish puzzle %s for user %d: %v", c.Params("id"), *userID, err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to finish puzzle"})
		}
		mode := req.Mode
		if mode == "" {
			mode = "single"
		}
		isNewRecord := upsertPuzzleStat(*userID, gameID, mode, req.Difficulty, req.Stars, req.TimeSpent)

		// Award XP (puzzle games are always single-player style, treat as single win)
		xpResult := service.AddXP(*userID, service.XPSingleWin)

		// Record match history
		service.RecordMatch(*userID, gameID, mode, req.Difficulty, true, req.Stars, req.TimeSpent, service.XPSingleWin)

		// Check achievements
		newAchievements := service.CheckAchievements(service.AchievementContext{
			UserID: *userID, GameID: gameID, Mode: mode, Won: true,
		})

		return c.JSON(fiber.Map{
			"status":           "ok",
			"isNewRecord":      isNewRecord,
			"xp_result":        xpResult,
			"new_achievements": newAchievements,
		})
	}
}

// upsertPuzzleStat writes a UserGameStat row on puzzle completion.
// Returns true if a personal best was improved.
func upsertPuzzleStat(userID uint, gameID, mode, difficulty string, stars, timeSpent int) bool {
	var stat domain.UserGameStat
	result := db.DB.Where("user_id = ? AND game_id = ? AND mode = ? AND difficulty = ?",
		userID, gameID, mode, difficulty).First(&stat)

	isNewRecord := false
	if result.Error != nil {
		stat = domain.UserGameStat{
			UserID:     userID,
			GameID:     gameID,
			Mode:       mode,
			Difficulty: difficulty,
			PlayCount:  1,
			WinCount:   1,
		}
		if timeSpent > 0 {
			stat.BestTime = timeSpent
			isNewRecord = true
		}
		if stars > 0 {
			stat.BestScore = stars
			isNewRecord = true
		}
		db.DB.Create(&stat)
	} else {
		stat.PlayCount++
		stat.WinCount++
		if timeSpent > 0 && (stat.BestTime == 0 || timeSpent < stat.BestTime) {
			stat.BestTime = timeSpent
			isNewRecord = true
		}
		if stars > stat.BestScore {
			stat.BestScore = stars
			isNewRecord = true
		}
		db.DB.Save(&stat)
	}
	return isNewRecord
}
