package rest

import (
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type Math24Repo struct{}

func NewMath24Repo() PuzzleRepo { return &Math24Repo{} }

func (r *Math24Repo) HasSave() bool { return false }

func (r *Math24Repo) GetLevels(difficulty string, userID *uint) (any, error) {
	var puzzles []domain.Math24Puzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return nil, err
	}

	progressMap := make(map[string]domain.UserMath24Progress)
	if userID != nil {
		var rows []domain.UserMath24Progress
		if err := db.DB.Where("user_id = ?", *userID).Find(&rows).Error; err == nil {
			for _, p := range rows {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type item struct {
		ID         string                    `json:"id"`
		Difficulty domain.Math24Difficulty   `json:"difficulty"`
		Cards      string                    `json:"cards"`
		Progress   domain.UserMath24Progress `json:"progress"`
	}
	out := make([]item, len(puzzles))
	for i, p := range puzzles {
		out[i] = item{ID: p.ID, Difficulty: p.Difficulty, Cards: p.Cards, Progress: progressMap[p.ID]}
	}
	return out, nil
}

func (r *Math24Repo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
	var puzzle domain.Math24Puzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return nil, nil, err
	}
	var progress domain.UserMath24Progress
	if userID != nil {
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
			progress = domain.UserMath24Progress{UserID: *userID, PuzzleID: puzzleID, Status: domain.Math24StatusPlaying}
			db.DB.Create(&progress)
		}
	}
	return puzzle, progress, nil
}

// SaveProgress is a no-op — math24 has no in-progress save endpoint.
func (r *Math24Repo) SaveProgress(_ string, _ uint, _ SavePayload) error { return nil }

func (r *Math24Repo) Finish(puzzleID string, userID uint, req FinishPayload) error {
	var progress domain.UserMath24Progress
	return db.DB.Where(domain.UserMath24Progress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserMath24Progress{Status: domain.Math24StatusFinished, TimeSpent: req.TimeSpent, Stars: req.Stars}).
		FirstOrCreate(&progress).Error
}
