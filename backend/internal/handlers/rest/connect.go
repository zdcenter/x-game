package rest

import (
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type ConnectRepo struct{}

func NewConnectRepo() PuzzleRepo { return &ConnectRepo{} }

func (r *ConnectRepo) HasSave() bool { return true }

func (r *ConnectRepo) GetLevels(difficulty string, userID *uint) (any, error) {
	var puzzles []domain.ConnectPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
		return nil, err
	}

	progressMap := make(map[string]domain.UserConnectProgress)
	if userID != nil {
		var rows []domain.UserConnectProgress
		if err := db.DB.Where("user_id = ?", *userID).Find(&rows).Error; err == nil {
			for _, p := range rows {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type item struct {
		ID         string                     `json:"id"`
		Difficulty domain.ConnectDifficulty   `json:"difficulty"`
		Progress   domain.UserConnectProgress `json:"progress"`
	}
	out := make([]item, len(puzzles))
	for i, p := range puzzles {
		out[i] = item{ID: p.ID, Difficulty: p.Difficulty, Progress: progressMap[p.ID]}
	}
	return out, nil
}

func (r *ConnectRepo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
	var puzzle domain.ConnectPuzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return nil, nil, err
	}
	var progress domain.UserConnectProgress
	if userID != nil {
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
			progress = domain.UserConnectProgress{UserID: *userID, PuzzleID: puzzleID, Status: domain.ConnectStatusPlaying}
			db.DB.Create(&progress)
		}
	}
	return puzzle, progress, nil
}

func (r *ConnectRepo) SaveProgress(puzzleID string, userID uint, req SavePayload) error {
	var progress domain.UserConnectProgress
	return db.DB.Where(domain.UserConnectProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserConnectProgress{CurrentState: req.CurrentState, TimeSpent: req.TimeSpent}).
		FirstOrCreate(&progress).Error
}

func (r *ConnectRepo) Finish(puzzleID string, userID uint, req FinishPayload) error {
	var progress domain.UserConnectProgress
	return db.DB.Where(domain.UserConnectProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserConnectProgress{Status: domain.ConnectStatusFinished, TimeSpent: req.TimeSpent, Stars: req.Stars}).
		FirstOrCreate(&progress).Error
}
