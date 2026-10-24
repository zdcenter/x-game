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
	Rating        int    `json:"rating"`
	BrainCoins    int    `json:"brain_coins"`
	IsCurrentUser bool   `json:"is_current_user"`
}

// GetLeaderboard returns a ranked list for a specific game/mode/difficulty.
// Query params: mode, difficulty, type (time|score), period (all|weekly), limit (max 100)
func GetLeaderboard(c fiber.Ctx) error {
	gameID := c.Params("gameId")
	mode := c.Query("mode", "")
	difficulty := c.Query("difficulty", "")
	rankType := c.Query("type", "")
	period := c.Query("period", "all") // "all" or "weekly"
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit <= 0 || limit > 20 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Determine time-focused games
	timeGames := map[string]bool{
		"minesweeper": true, "sudoku": true, "sliding": true,
		"codebreaker": true, "math24": true, "watersort": true,
		"sokoban": true, "lightsout": true,
	}
	if rankType == "" {
		if timeGames[gameID] {
			rankType = "time"
		} else {
			rankType = "score"
		}
	}

	// Determine current user (optional)
	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}

	type rawRow struct {
		UserID     uint   `gorm:"column:user_id"`
		Username   string `gorm:"column:username"`
		BestTime   int    `gorm:"column:best_time"`
		BestScore  int    `gorm:"column:best_score"`
		PlayCount  int    `gorm:"column:play_count"`
		WinCount   int    `gorm:"column:win_count"`
		Rating     int    `gorm:"column:rating"`
		BrainCoins int    `gorm:"column:brain_coins"`
	}

	var total int64
	var rows []rawRow

	if mode != "" && difficulty != "" {
		q := db.DB.Table("gm_user_game_stats AS s").
			Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
			Where("s.game_id = ? AND s.mode = ? AND s.difficulty = ?", gameID, mode, difficulty)

		if period == "weekly" {
			q = q.Where("s.updated_at > NOW() - INTERVAL '7 days'")
		}

		if rankType == "time" {
			q = q.Where("s.best_time > 0").Order("s.best_time ASC")
		} else if rankType == "rating" {
			q = q.Order("s.rating DESC")
		} else {
			q = q.Where("s.best_score > 0").Order("s.best_score DESC")
		}

		q.Count(&total)
		q.Select("s.user_id, u.username, s.best_time, s.best_score, s.play_count, s.win_count, s.rating, COALESCE(u.brain_coins, 0) AS brain_coins").
			Offset(offset).Limit(limit).Scan(&rows)
	} else {
		// Unified game ranking: aggregate all modes and difficulties per user
		countQ := db.DB.Table("gm_user_game_stats AS s").
			Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
			Where("s.game_id = ?", gameID)

		if period == "weekly" {
			countQ = countQ.Where("s.updated_at > NOW() - INTERVAL '7 days'")
		}
		if rankType == "time" {
			countQ = countQ.Where("s.best_time > 0")
		} else if rankType != "rating" {
			countQ = countQ.Where("s.best_score > 0")
		}
		countQ.Select("COUNT(DISTINCT s.user_id)").Scan(&total)

		q := db.DB.Table("gm_user_game_stats AS s").
			Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
			Where("s.game_id = ?", gameID)

		if period == "weekly" {
			q = q.Where("s.updated_at > NOW() - INTERVAL '7 days'")
		}

		if rankType == "time" {
			q = q.Where("s.best_time > 0").
				Group("s.user_id, u.username, u.brain_coins").
				Order("best_time ASC")
		} else if rankType == "rating" {
			q = q.Group("s.user_id, u.username, u.brain_coins").
				Order("rating DESC")
		} else {
			q = q.Where("s.best_score > 0").
				Group("s.user_id, u.username, u.brain_coins").
				Order("best_score DESC")
		}

		q.Select("s.user_id, u.username, " +
			"COALESCE(MIN(CASE WHEN s.best_time > 0 THEN s.best_time ELSE NULL END), 0) AS best_time, " +
			"COALESCE(MAX(s.best_score), 0) AS best_score, " +
			"COALESCE(SUM(s.play_count), 0) AS play_count, " +
			"COALESCE(SUM(s.win_count), 0) AS win_count, " +
			"COALESCE(MAX(s.rating), 1000) AS rating, " +
			"COALESCE(u.brain_coins, 0) AS brain_coins").
			Offset(offset).Limit(limit).Scan(&rows)
	}

	entries := make([]LeaderboardEntry, 0, len(rows))
	myRank := 0
	for i, r := range rows {
		rankNumber := offset + i + 1
		e := LeaderboardEntry{
			Rank:          rankNumber,
			UserID:        r.UserID,
			Username:      r.Username,
			BestTime:      r.BestTime,
			BestScore:     r.BestScore,
			PlayCount:     r.PlayCount,
			WinCount:      r.WinCount,
			Rating:        r.Rating,
			BrainCoins:    r.BrainCoins,
			IsCurrentUser: r.UserID == currentUserID,
		}
		if e.IsCurrentUser {
			myRank = rankNumber
		}
		entries = append(entries, e)
	}

	// If current user is authenticated but not on current page, fetch their rank
	if currentUserID > 0 && myRank == 0 {
		myRank = getUserRank(gameID, mode, difficulty, rankType, period, currentUserID)
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages == 0 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"entries":      entries,
		"total":        total,
		"page":         page,
		"limit":        limit,
		"total_pages":  totalPages,
		"my_rank":      myRank,
		"game_id":      gameID,
		"mode":         mode,
		"difficulty":   difficulty,
		"period":       period,
		"type":         rankType,
	})
}

func getUserRank(gameID, mode, difficulty, rankType, period string, userID uint) int {
	if mode != "" && difficulty != "" {
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
		} else if rankType == "rating" {
			q = q.Where("s.rating > ?", stat.Rating)
		} else {
			return 0
		}

		q.Count(&rank)
		return int(rank) + 1
	}

	// Unified game rank
	var stat struct {
		BestTime  int `gorm:"column:best_time"`
		BestScore int `gorm:"column:best_score"`
		Rating    int `gorm:"column:rating"`
	}
	err := db.DB.Table("gm_user_game_stats").
		Select("COALESCE(MIN(CASE WHEN best_time > 0 THEN best_time ELSE NULL END), 0) AS best_time, " +
			"COALESCE(MAX(best_score), 0) AS best_score, " +
			"COALESCE(MAX(rating), 1000) AS rating").
		Where("user_id = ? AND game_id = ?", userID, gameID).
		Scan(&stat).Error
	if err != nil {
		return 0
	}

	q := db.DB.Table("gm_user_game_stats AS s").
		Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
		Where("s.game_id = ?", gameID)

	if period == "weekly" {
		q = q.Where("s.updated_at > NOW() - INTERVAL '7 days'")
	}

	if rankType == "time" && stat.BestTime > 0 {
		q = q.Where("s.best_time > 0").
			Group("s.user_id").
			Having("MIN(s.best_time) < ?", stat.BestTime)
	} else if rankType != "time" && rankType != "rating" && stat.BestScore > 0 {
		q = q.Where("s.best_score > 0").
			Group("s.user_id").
			Having("MAX(s.best_score) > ?", stat.BestScore)
	} else if rankType == "rating" {
		q = q.Group("s.user_id").
			Having("MAX(s.rating) > ?", stat.Rating)
	} else {
		return 0
	}

	var count int64
	db.DB.Table("(?) as sub", q).Count(&count)
	return int(count) + 1
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
// Query params: page, limit (max 100)
func GetGlobalLeaderboard(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit <= 0 || limit > 20 {
		limit = 20
	}
	offset := (page - 1) * limit

	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}

	q := db.DB.Table("gm_users").
		Where("deleted_at IS NULL AND role != 'guest' AND xp > 0")

	var total int64
	q.Count(&total)

	type rawRow struct {
		UserID     uint   `gorm:"column:id"`
		Username   string `gorm:"column:username"`
		XP         int    `gorm:"column:xp"`
		Level      int    `gorm:"column:level"`
		BrainCoins int    `gorm:"column:brain_coins"`
	}

	var rows []rawRow
	q.Select("id, username, xp, level, COALESCE(brain_coins, 0) AS brain_coins").
		Order("xp DESC").
		Offset(offset).
		Limit(limit).
		Scan(&rows)

	entries := make([]fiber.Map, 0, len(rows))
	myRank := 0
	for i, r := range rows {
		rankNumber := offset + i + 1
		isCurrentUser := r.UserID == currentUserID
		if isCurrentUser {
			myRank = rankNumber
		}
		entries = append(entries, fiber.Map{
			"rank":            rankNumber,
			"user_id":         r.UserID,
			"username":        r.Username,
			"xp":              r.XP,
			"level":           r.Level,
			"brain_coins":     r.BrainCoins,
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

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages == 0 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"entries":      entries,
		"total":        total,
		"page":         page,
		"limit":        limit,
		"total_pages":  totalPages,
		"my_rank":      myRank,
		"game_id":      "global",
	})
}

