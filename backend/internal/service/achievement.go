package service

import (
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// Condition type constants
const (
	CondFirstGameComplete  = "first_game_complete"
	CondFirstPKWin         = "first_pk_win"
	CondFirstDailyChallenge = "first_daily_challenge"
	CondGameExpertClear    = "game_expert_clear"    // params: {"game_id": "minesweeper"}
	CondPKWinStreak        = "pk_win_streak"        // params: {"count": 3}
	CondTotalPlayCount     = "total_play_count"     // params: {"count": 10}
	CondTotalWinCount      = "total_win_count"      // params: {"count": 10}
	CondDailyChallengeCount = "daily_challenge_count" // params: {"count": 7}
	CondAllGamesPlayed     = "all_games_played"     // params: {"count": 13}
	CondAllGamesWon        = "all_games_won"
	CondAchievementCount   = "achievement_count"    // params: {"count": 10}
	CondSpecificGameWin    = "specific_game_win"    // params: {"game_id": "gomoku"}
)

// AchievementContext carries context for a single achievement-check trigger.
type AchievementContext struct {
	UserID  uint
	GameID  string
	Mode    string
	Won     bool
	IsDaily bool
}

// AchievementWithStatus extends Achievement with user unlock info.
type AchievementWithStatus struct {
	domain.Achievement
	UnlockedAt *time.Time `json:"unlocked_at"`
}

// CheckAchievements checks all active, un-unlocked achievements for a user
// after a game event, unlocks newly met ones, and returns them.
func CheckAchievements(ctx AchievementContext) []domain.Achievement {
	// Fetch all active achievements not yet unlocked by this user
	var lockedAchievements []domain.Achievement
	db.DB.Where("is_active = true AND id NOT IN (?)",
		db.DB.Model(&domain.UserAchievement{}).Select("achievement_id").Where("user_id = ?", ctx.UserID),
	).Find(&lockedAchievements)

	var unlocked []domain.Achievement
	for _, a := range lockedAchievements {
		if checkCondition(a, ctx) {
			unlockAchievement(ctx.UserID, a)
			unlocked = append(unlocked, a)
		}
	}
	return unlocked
}

// CheckAchievementsForDaily checks achievements specifically after a daily challenge completion.
func CheckAchievementsForDaily(userID uint) []domain.Achievement {
	return CheckAchievements(AchievementContext{UserID: userID, IsDaily: true})
}

func unlockAchievement(userID uint, a domain.Achievement) {
	ua := domain.UserAchievement{
		UserID:        userID,
		AchievementID: a.ID,
		UnlockedAt:    time.Now(),
	}
	db.DB.Create(&ua)
	// Award XP for the achievement
	AddXP(userID, a.XPReward)
}

// checkCondition evaluates whether a single achievement's condition is met.
func checkCondition(a domain.Achievement, ctx AchievementContext) bool {
	params := parseParams(a.ConditionParams)

	switch a.ConditionType {
	case CondFirstGameComplete:
		// True if user has at least 1 play_count across any game
		var count int64
		db.DB.Model(&domain.UserGameStat{}).Where("user_id = ? AND play_count >= 1", ctx.UserID).Count(&count)
		return count >= 1

	case CondFirstPKWin:
		return IsPKMode(ctx.Mode) && ctx.Won

	case CondFirstDailyChallenge:
		return ctx.IsDaily

	case CondGameExpertClear:
		gameID := paramStr(params, "game_id")
		var count int64
		db.DB.Model(&domain.UserGameStat{}).Where(
			"user_id = ? AND game_id = ? AND difficulty IN ('expert','master') AND win_count >= 1",
			ctx.UserID, gameID,
		).Count(&count)
		return count >= 1

	case CondSpecificGameWin:
		gameID := paramStr(params, "game_id")
		return ctx.GameID == gameID && ctx.Won

	case CondPKWinStreak:
		required := paramInt(params, "count", 3)
		// Count consecutive PK wins from most recent history
		var histories []domain.MatchHistory
		db.DB.Where("user_id = ? AND mode != 'single'", ctx.UserID).
			Order("played_at desc").Limit(required).Find(&histories)
		if len(histories) < required {
			return false
		}
		for _, h := range histories {
			if h.Result != "win" {
				return false
			}
		}
		return true

	case CondTotalPlayCount:
		required := paramInt(params, "count", 10)
		var total int64
		db.DB.Model(&domain.MatchHistory{}).Where("user_id = ?", ctx.UserID).Count(&total)
		return int(total) >= required

	case CondTotalWinCount:
		required := paramInt(params, "count", 10)
		var total int64
		db.DB.Model(&domain.MatchHistory{}).Where("user_id = ? AND result = 'win'", ctx.UserID).Count(&total)
		return int(total) >= required

	case CondDailyChallengeCount:
		required := paramInt(params, "count", 7)
		var total int64
		db.DB.Model(&domain.UserDailyChallenge{}).Where("user_id = ?", ctx.UserID).Count(&total)
		return int(total) >= required

	case CondAllGamesPlayed:
		required := paramInt(params, "count", 13)
		var distinctGames int64
		db.DB.Model(&domain.MatchHistory{}).Where("user_id = ?", ctx.UserID).
			Distinct("game_id").Count(&distinctGames)
		return int(distinctGames) >= required

	case CondAllGamesWon:
		required := paramInt(params, "count", 13)
		var distinctWins int64
		db.DB.Model(&domain.MatchHistory{}).Where("user_id = ? AND result = 'win'", ctx.UserID).
			Distinct("game_id").Count(&distinctWins)
		return int(distinctWins) >= required

	case CondAchievementCount:
		required := paramInt(params, "count", 10)
		var total int64
		db.DB.Model(&domain.UserAchievement{}).Where("user_id = ?", ctx.UserID).Count(&total)
		return int(total) >= required
	}

	return false
}

// GetAchievementsWithStatus returns all achievements with unlock status for a user.
func GetAchievementsWithStatus(userID uint) []AchievementWithStatus {
	var achievements []domain.Achievement
	db.DB.Where("is_active = true").Order("sort_order asc, id asc").Find(&achievements)

	// Build a map of unlocked
	var unlocked []domain.UserAchievement
	db.DB.Where("user_id = ?", userID).Find(&unlocked)
	unlockedMap := make(map[string]time.Time)
	for _, ua := range unlocked {
		unlockedMap[ua.AchievementID] = ua.UnlockedAt
	}

	result := make([]AchievementWithStatus, 0, len(achievements))
	for _, a := range achievements {
		aws := AchievementWithStatus{Achievement: a}
		if t, ok := unlockedMap[a.ID]; ok {
			aws.UnlockedAt = &t
		}
		result = append(result, aws)
	}
	return result
}

// --- helpers ---

func parseParams(raw string) map[string]any {
	var m map[string]any
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return map[string]any{}
	}
	return m
}

func paramStr(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func paramInt(m map[string]any, key string, defaultVal int) int {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		}
	}
	return defaultVal
}
