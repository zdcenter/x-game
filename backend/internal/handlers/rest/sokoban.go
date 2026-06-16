package rest

import (
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type SokobanRepo struct{}

func NewSokobanRepo() PuzzleRepo { return &SokobanRepo{} }

func (r *SokobanRepo) HasSave() bool { return true }

func (r *SokobanRepo) GetLevels(difficulty string, userID *uint) (any, error) {
	var puzzles []domain.SokobanPuzzle
	if err := db.DB.Where("difficulty = ?", difficulty).Order("level_num asc").Find(&puzzles).Error; err != nil {
		return nil, err
	}

	progressMap := make(map[string]domain.UserSokobanProgress)
	if userID != nil {
		var rows []domain.UserSokobanProgress
		if err := db.DB.Where("user_id = ?", *userID).Find(&rows).Error; err == nil {
			for _, p := range rows {
				progressMap[p.PuzzleID] = p
			}
		}
	}

	type item struct {
		ID         string                     `json:"id"`
		Difficulty domain.SokobanDifficulty   `json:"difficulty"`
		LevelNum   int                        `json:"level_num"`
		Puzzle     string                     `json:"puzzle"`
		Progress   domain.UserSokobanProgress `json:"progress"`
	}
	out := make([]item, len(puzzles))
	for i, p := range puzzles {
		out[i] = item{ID: p.ID, Difficulty: p.Difficulty, LevelNum: p.LevelNum, Puzzle: p.Puzzle, Progress: progressMap[p.ID]}
	}
	return out, nil
}

func (r *SokobanRepo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
	var puzzle domain.SokobanPuzzle
	if err := db.DB.Where("id = ?", puzzleID).First(&puzzle).Error; err != nil {
		return nil, nil, err
	}
	var progress domain.UserSokobanProgress
	if userID != nil {
		if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
			progress = domain.UserSokobanProgress{UserID: *userID, PuzzleID: puzzleID, Status: domain.SokobanStatusPlaying}
			db.DB.Create(&progress)
		}
	}
	return puzzle, progress, nil
}

func (r *SokobanRepo) SaveProgress(puzzleID string, userID uint, req SavePayload) error {
	var progress domain.UserSokobanProgress
	return db.DB.Where(domain.UserSokobanProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSokobanProgress{Moves: req.Moves, TimeSpent: req.TimeSpent}).
		FirstOrCreate(&progress).Error
}

func (r *SokobanRepo) Finish(puzzleID string, userID uint, req FinishPayload) error {
	var progress domain.UserSokobanProgress
	return db.DB.Where(domain.UserSokobanProgress{UserID: userID, PuzzleID: puzzleID}).
		Assign(domain.UserSokobanProgress{Status: domain.SokobanStatusFinished, Moves: req.Moves, TimeSpent: req.TimeSpent, Stars: req.Stars}).
		FirstOrCreate(&progress).Error
}
