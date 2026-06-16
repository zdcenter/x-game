package rest

import (
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type SudokuRepo struct{}

func NewSudokuRepo() PuzzleRepo { return &SudokuRepo{} }

func (r *SudokuRepo) HasSave() bool { return true }

func (r *SudokuRepo) GetLevels(difficulty string, userID *uint) (any, error) {
	var puzzles []domain.SudokuPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return nil, err
	}

	progressMap := make(map[string]domain.UserSudokuProgress)
	if userID != nil {
		var rows []domain.UserSudokuProgress
		if err := db.DB.Where("user_id = ?", *userID).Find(&rows).Error; err == nil {
			for _, p := range rows {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type item struct {
		ID         string                    `json:"id"`
		Difficulty domain.SudokuDifficulty   `json:"difficulty"`
		Progress   domain.UserSudokuProgress `json:"progress"`
	}
	out := make([]item, len(puzzles))
	for i, p := range puzzles {
		out[i] = item{ID: p.ID, Difficulty: p.Difficulty, Progress: progressMap[p.ID]}
	}
	return out, nil
}

func (r *SudokuRepo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
	var puzzle domain.SudokuPuzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return nil, nil, err
	}
	var progress domain.UserSudokuProgress
	if userID != nil {
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
			progress = domain.UserSudokuProgress{UserID: *userID, PuzzleID: puzzleID, Status: domain.SudokuStatusPlaying}
			db.DB.Create(&progress)
		}
	}
	return puzzle, progress, nil
}

func (r *SudokuRepo) SaveProgress(puzzleID string, userID uint, req SavePayload) error {
	var progress domain.UserSudokuProgress
	return db.DB.Where(domain.UserSudokuProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSudokuProgress{CurrentState: req.CurrentState, TimeSpent: req.TimeSpent}).
		FirstOrCreate(&progress).Error
}

func (r *SudokuRepo) Finish(puzzleID string, userID uint, req FinishPayload) error {
	var progress domain.UserSudokuProgress
	return db.DB.Where(domain.UserSudokuProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSudokuProgress{Status: domain.SudokuStatusFinished, TimeSpent: req.TimeSpent, Stars: req.Stars}).
		FirstOrCreate(&progress).Error
}
