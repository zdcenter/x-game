package service

import (
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// RecordMatch persists a match result for a user.
func RecordMatch(userID uint, gameID, mode, difficulty string, won bool, score, timeTaken, xpEarned int) {
	result := "completed"
	if mode != "single" {
		if won {
			result = "win"
		} else {
			result = "lose"
		}
	}

	h := domain.MatchHistory{
		UserID:     userID,
		GameID:     gameID,
		Mode:       mode,
		Difficulty: difficulty,
		Result:     result,
		Score:      score,
		TimeTaken:  timeTaken,
		Opponents:  "[]",
		XPEarned:   xpEarned,
		PlayedAt:   time.Now(),
	}
	db.DB.Create(&h)
}

// GetMatchHistory returns recent match history for a user, with optional filters.
func GetMatchHistory(userID uint, limit int, gameID, mode string) []domain.MatchHistory {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	q := db.DB.Where("user_id = ?", userID)
	if gameID != "" {
		q = q.Where("game_id = ?", gameID)
	}
	if mode != "" {
		q = q.Where("mode = ?", mode)
	}

	var histories []domain.MatchHistory
	q.Order("played_at desc").Limit(limit).Find(&histories)
	return histories
}
