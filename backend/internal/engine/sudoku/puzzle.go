package sudoku

import (
	"math/rand"
	"strings"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

const (
	FallbackPuzzle   = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79"
	FallbackSolution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
)

// PickSudokuPuzzle selects an appropriate puzzle matching the requested difficulty.
// Priority is given to puzzles that the room host has not yet completed (in single player or PK).
func PickSudokuPuzzle(difficulty string, hostUsername string) (puzzle, solution string) {
	difficulty = strings.ToLower(strings.TrimSpace(difficulty))
	if difficulty == "" {
		difficulty = "medium"
	}

	if db.DB != nil {
		// 1. Try to find an unplayed/unfinished puzzle for the host
		if hostUsername != "" {
			var hostUser domain.User
			if err := db.DB.Where("LOWER(username) = LOWER(?)", hostUsername).First(&hostUser).Error; err == nil && hostUser.ID > 0 {
				var unplayedPuzzles []domain.SudokuPuzzle
				err := db.DB.Where(
					"difficulty = ? AND id NOT IN (SELECT puzzle_id FROM gm_user_sudoku_progresses WHERE user_id = ? AND status = ?)",
					difficulty, hostUser.ID, domain.SudokuStatusFinished,
				).Find(&unplayedPuzzles).Error

				if err == nil && len(unplayedPuzzles) > 0 {
					p := unplayedPuzzles[rand.Intn(len(unplayedPuzzles))]
					return p.Puzzle, p.Solution
				}
			}
		}

		// 2. Fallback: random puzzle of the requested difficulty
		var puzzles []domain.SudokuPuzzle
		if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err == nil && len(puzzles) > 0 {
			p := puzzles[rand.Intn(len(puzzles))]
			return p.Puzzle, p.Solution
		}
	}

	return FallbackPuzzle, FallbackSolution
}

