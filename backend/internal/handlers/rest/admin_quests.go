package rest

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/pkg/db"
)

type AdminQuestStatItem struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Icon           string `json:"icon"`
	XPAmount       int    `json:"xp_amount"`
	CompletedCount int64  `json:"completed_count"`
	ClaimedCount   int64  `json:"claimed_count"`
}

type AdminTopStreakUser struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Streak   int    `json:"streak"`
}

// GetAdminQuestStats returns automation monitoring metrics for daily quests
func GetAdminQuestStats(c fiber.Ctx) error {
	today := time.Now().Format("2006-01-02")

	// 1. Total distinct users interacting with quests today
	var activeUsersToday int64
	db.DB.Table("gm_user_daily_quests").
		Where("date = ?", today).
		Select("COUNT(DISTINCT user_id)").
		Scan(&activeUsersToday)

	// 2. Quest metrics
	questDefs := []struct {
		ID   string
		Name string
		Icon string
		XP   int
	}{
		{"solo_play", "单机热身 (Solo)", "🎮", 20},
		{"pk_play", "对战初试 (Live PK)", "⚔️", 30},
		{"win_game", "荣耀时刻 (Win/Record)", "👑", 50},
		{"daily_chest", "每日全清大宝箱 (Grand Chest)", "🎁", 50},
	}

	questStats := make([]AdminQuestStatItem, 0, len(questDefs))
	var totalXPClaimed int64

	for _, def := range questDefs {
		var compCount, claimCount int64
		db.DB.Table("gm_user_daily_quests").
			Where("date = ? AND quest_id = ? AND completed = true", today, def.ID).
			Count(&compCount)

		db.DB.Table("gm_user_daily_quests").
			Where("date = ? AND quest_id = ? AND claimed = true", today, def.ID).
			Count(&claimCount)

		totalXPClaimed += claimCount * int64(def.XP)

		questStats = append(questStats, AdminQuestStatItem{
			ID:             def.ID,
			Title:          def.Name,
			Icon:           def.Icon,
			XPAmount:       def.XP,
			CompletedCount: compCount,
			ClaimedCount:   claimCount,
		})
	}

	// 3. Top Streak users
	var topStreaks []AdminTopStreakUser
	db.DB.Table("gm_users").
		Select("id, username, login_streak AS streak").
		Where("role != 'guest' AND deleted_at IS NULL AND login_streak > 0").
		Order("login_streak DESC").
		Limit(10).
		Scan(&topStreaks)

	return c.JSON(fiber.Map{
		"status":                 "healthy",
		"mode":                   "fully_automated",
		"today":                  today,
		"active_users_today":     activeUsersToday,
		"quests":                 questStats,
		"total_xp_claimed_today": totalXPClaimed,
		"top_streaks":            topStreaks,
	})
}
