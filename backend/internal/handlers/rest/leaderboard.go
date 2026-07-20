package rest

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type LeaderboardEntry struct {
	Rank          int    `json:"rank"`
	UserID        uint   `json:"user_id"`
	Username      string `json:"username"`
	BestTime      int    `json:"best_time"`
	BestScore     int    `json:"best_score"`
	PlayCount     int    `json:"play_count"`
	WinCount      int    `json:"win_count"`
	IsCurrentUser bool   `json:"is_current_user"`
}

// GetLeaderboard returns a ranked list for a specific game/mode/difficulty.
// Query params: mode, difficulty, type (time|score), period (all|weekly), limit (max 100)
func GetLeaderboard(c fiber.Ctx) error {
	gameID := c.Params("gameId")
	mode := c.Query("mode", "single")
	difficulty := c.Query("difficulty", "medium")
	rankType := c.Query("type", "time") // "time" or "score"
	period := c.Query("period", "all")  // "all" or "weekly"
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	// Determine current user (optional)
	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}

	// Build query
	q := db.DB.Table("gm_user_game_stats AS s").
		Select("s.user_id, u.username, s.best_time, s.best_score, s.play_count, s.win_count").
		Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
		Where("s.game_id = ? AND s.mode = ? AND s.difficulty = ?", gameID, mode, difficulty)

	if period == "weekly" {
		q = q.Where("s.updated_at > NOW() - INTERVAL '7 days'")
	}

	if rankType == "time" {
		q = q.Where("s.best_time > 0").Order("s.best_time ASC")
	} else {
		q = q.Where("s.best_score > 0").Order("s.best_score DESC")
	}

	type rawRow struct {
		UserID    uint   `gorm:"column:user_id"`
		Username  string `gorm:"column:username"`
		BestTime  int    `gorm:"column:best_time"`
		BestScore int    `gorm:"column:best_score"`
		PlayCount int    `gorm:"column:play_count"`
		WinCount  int    `gorm:"column:win_count"`
	}

	var rows []rawRow
	q.Limit(limit).Scan(&rows)

	entries := make([]LeaderboardEntry, 0, len(rows))
	myRank := 0
	for i, r := range rows {
		e := LeaderboardEntry{
			Rank:          i + 1,
			UserID:        r.UserID,
			Username:      r.Username,
			BestTime:      r.BestTime,
			BestScore:     r.BestScore,
			PlayCount:     r.PlayCount,
			WinCount:      r.WinCount,
			IsCurrentUser: r.UserID == currentUserID,
		}
		if e.IsCurrentUser {
			myRank = i + 1
		}
		entries = append(entries, e)
	}

	// If current user is authenticated but not in top list, fetch their rank
	if currentUserID > 0 && myRank == 0 {
		myRank = getUserRank(gameID, mode, difficulty, rankType, period, currentUserID)
	}

	return c.JSON(fiber.Map{
		"entries":    entries,
		"my_rank":    myRank,
		"game_id":    gameID,
		"mode":       mode,
		"difficulty": difficulty,
		"period":     period,
		"type":       rankType,
	})
}

func getUserRank(gameID, mode, difficulty, rankType, period string, userID uint) int {
	var stat domain.UserGameStat
	if err := db.DB.Where("user_id = ? AND game_id = ? AND mode = ? AND difficulty = ?",
		userID, gameID, mode, difficulty).First(&stat).Error; err != nil {
		return 0
	}

	q := db.DB.Table("gm_user_game_stats AS s").
		Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
		Where("s.game_id = ? AND s.mode = ? AND s.difficulty = ?", gameID, mode, difficulty)

	if period == "weekly" {
		q = q.Where("s.updated_at > NOW() - INTERVAL '7 days'")
	}

	var rank int64
	if rankType == "time" && stat.BestTime > 0 {
		q = q.Where("s.best_time > 0 AND s.best_time < ?", stat.BestTime)
	} else if rankType == "score" && stat.BestScore > 0 {
		q = q.Where("s.best_score > ?", stat.BestScore)
	} else {
		return 0
	}

	q.Count(&rank)
	return int(rank) + 1
}

// GetMyRanks returns the current user's rank across all games they've played.
func GetMyRanks(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var stats []domain.UserGameStat
	db.DB.Where("user_id = ?", userID).Find(&stats)

	type RankEntry struct {
		GameID     string `json:"game_id"`
		Mode       string `json:"mode"`
		Difficulty string `json:"difficulty"`
		Rank       int    `json:"rank"`
		BestTime   int    `json:"best_time"`
		BestScore  int    `json:"best_score"`
	}

	ranks := make([]RankEntry, 0, len(stats))
	for _, s := range stats {
		rankType := "score"
		if s.BestTime > 0 {
			rankType = "time"
		}
		rank := getUserRank(s.GameID, s.Mode, s.Difficulty, rankType, "all", userID)
		if rank > 0 {
			ranks = append(ranks, RankEntry{
				GameID: s.GameID, Mode: s.Mode, Difficulty: s.Difficulty,
				Rank: rank, BestTime: s.BestTime, BestScore: s.BestScore,
			})
		}
	}

	return c.JSON(fiber.Map{"ranks": ranks})
}

// AdminGetLeaderboard — admin view without role filtering.
func AdminGetLeaderboard(c fiber.Ctx) error {
	return GetLeaderboard(c)
}

// AdminDeleteLeaderboardEntry removes a cheating stat entry.
func AdminDeleteLeaderboardEntry(c fiber.Ctx) error {
	statID := c.Params("statId")
	if err := db.DB.Delete(&domain.UserGameStat{}, statID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}


// GetGlobalLeaderboard returns a ranked list of all users based on XP.
// Query params: limit (max 100)
func GetGlobalLeaderboard(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}

	type rawRow struct {
		UserID   uint   `gorm:"column:id"`
		Username string `gorm:"column:username"`
		XP       int    `gorm:"column:xp"`
		Level    int    `gorm:"column:level"`
	}

	var rows []rawRow
	db.DB.Table("gm_users").
		Select("id, username, xp, level").
		Where("deleted_at IS NULL AND role != 'guest' AND xp > 0").
		Order("xp DESC").
		Limit(limit).
		Scan(&rows)

	entries := make([]fiber.Map, 0, len(rows))
	myRank := 0
	for i, r := range rows {
		isCurrentUser := r.UserID == currentUserID
		if isCurrentUser {
			myRank = i + 1
		}
		entries = append(entries, fiber.Map{
			"rank":            i + 1,
			"user_id":         r.UserID,
			"username":        r.Username,
			"xp":              r.XP,
			"level":           r.Level,
			"is_current_user": isCurrentUser,
		})
	}

	if currentUserID > 0 && myRank == 0 {
		var user domain.User
		if err := db.DB.Where("id = ?", currentUserID).First(&user).Error; err == nil && user.XP > 0 {
			var rank int64
			db.DB.Table("gm_users").
				Where("deleted_at IS NULL AND role != 'guest' AND xp > ?", user.XP).
				Count(&rank)
			myRank = int(rank) + 1
		}
	}

	return c.JSON(fiber.Map{
		"entries": entries,
		"my_rank": myRank,
		"game_id": "global",
	})
}
