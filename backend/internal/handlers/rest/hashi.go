package rest

import (
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type HashiRepo struct{}

func NewHashiRepo() PuzzleRepo { return &HashiRepo{} }

// HasSave determines if the game supports saving in-progress states
func (r *HashiRepo) HasSave() bool { return false }

// GetLevels returns a list of puzzles for a given difficulty and the user's progress
func (r *HashiRepo) GetLevels(difficulty string, userID *uint) (any, error) {
	var puzzles []domain.HashiPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return nil, err
	}

	progressMap := make(map[string]domain.UserHashiProgress)
	if userID != nil {
		var rows []domain.UserHashiProgress
		if err := db.DB.Where("user_id = ?", *userID).Find(&rows).Error; err == nil {
			for _, p := range rows {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type item struct {
		ID         string                   `json:"id"`
		Difficulty string                   `json:"difficulty"`
		Progress   domain.UserHashiProgress `json:"progress"`
	}
	out := make([]item, len(puzzles))
	for i, p := range puzzles {
		out[i] = item{ID: p.ID, Difficulty: p.Difficulty, Progress: progressMap[p.ID]}
	}
	return out, nil
}

// GetPuzzle returns the details of a single puzzle and the user's progress for it
func (r *HashiRepo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
	var puzzle domain.HashiPuzzle
	if err := db.DB.First(&puzzle, "id = ?", puzzleID).Error; err != nil {
		return nil, nil, err
	}
	var progress domain.UserHashiProgress
	if userID != nil {
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
			progress = domain.UserHashiProgress{UserID: *userID, PuzzleID: puzzleID, Status: "playing"}
			db.DB.Create(&progress)
		}
	}
	return puzzle, progress, nil
}

// SaveProgress saves the user's progress for a puzzle. Only called if HasSave is true.
func (r *HashiRepo) SaveProgress(puzzleID string, userID uint, req SavePayload) error {
	var p domain.UserHashiProgress
	return db.DB.Where(domain.UserHashiProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserHashiProgress{TimeSpent: req.TimeSpent}).
		FirstOrCreate(&p).Error
}

// Finish marks a puzzle as completed by the user
func (r *HashiRepo) Finish(puzzleID string, userID uint, req FinishPayload) error {
	var p domain.UserHashiProgress
	return db.DB.Where(domain.UserHashiProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserHashiProgress{Status: "finished", TimeSpent: req.TimeSpent, Stars: req.Stars}).
		FirstOrCreate(&p).Error
}
