package service

import (
	"math"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// XP rewards per event type
const (
	XPSinglePlay     = 2
	XPSingleWin      = 5
	XPPKPlay         = 5
	XPPKWin          = 15
	XPDailyChallenge = 30
)

// LoginStreakXP: bonus XP per consecutive login day (index = day-1, capped at last value)
var loginStreakXP = []int{3, 3, 3, 3, 3, 3, 20, 10, 10, 10, 10, 10, 10, 20, 10, 10, 10, 10, 10, 10, 20, 10, 10, 10, 10, 10, 10, 20, 10, 50}

type XPResult struct {
	XPEarned  int  `json:"xp_earned"`
	XP        int  `json:"xp"`
	Level     int  `json:"level"`
	LeveledUp bool `json:"leveled_up"`
}

// CalcLevel returns the level for a given XP amount.
// Formula: level = floor(sqrt(xp/100)) + 1
// Level 1 = 0 xp, Level 2 = 100 xp, Level 10 = 8100 xp, Level 20 = 36100 xp
func CalcLevel(xp int) int {
	if xp <= 0 {
		return 1
	}
	return int(math.Sqrt(float64(xp)/100.0)) + 1
}

// XPForLevel returns the minimum XP needed to reach a given level.
func XPForLevel(level int) int {
	if level <= 1 {
		return 0
	}
	return (level - 1) * (level - 1) * 100
}

// AddXP atomically adds XP to a user and recalculates their level.
func AddXP(userID uint, amount int) XPResult {
	if amount <= 0 {
		var user domain.User
		db.DB.Select("xp", "level").First(&user, userID)
		return XPResult{XPEarned: 0, XP: user.XP, Level: user.Level, LeveledUp: false}
	}

	var user domain.User
	db.DB.First(&user, userID)

	oldLevel := user.Level
	user.XP += amount
	user.Level = CalcLevel(user.XP)
	db.DB.Model(&user).Updates(map[string]any{"xp": user.XP, "level": user.Level})

	return XPResult{
		XPEarned:  amount,
		XP:        user.XP,
		Level:     user.Level,
		LeveledUp: user.Level > oldLevel,
	}
}

// CalcEventXP returns the XP amount for a game event.
// isPK: whether this is a multiplayer mode (speed/steal/score/battle).
func CalcEventXP(isPK, won bool) int {
	if isPK {
		if won {
			return XPPKWin
		}
		return XPPKPlay
	}
	if won {
		return XPSingleWin
	}
	return XPSinglePlay
}

// IsPKMode returns true for multiplayer game modes.
func IsPKMode(mode string) bool {
	switch mode {
	case "speed", "steal", "score", "battle":
		return true
	}
	return false
}

// LevelProgress holds XP progress within the current level.
type LevelProgress struct {
	Level   int `json:"level"`
	XP      int `json:"xp"`
	Current int `json:"current"` // xp within current level
	Total   int `json:"total"`   // xp needed for this level span
	Pct     int `json:"pct"`     // 0-100
}

// GetLevelProgress returns detailed level progress for display.
func GetLevelProgress(xp int) LevelProgress {
	level := CalcLevel(xp)
	start := XPForLevel(level)
	end := XPForLevel(level + 1)
	current := xp - start
	total := end - start
	pct := 0
	if total > 0 {
		pct = current * 100 / total
	}
	return LevelProgress{Level: level, XP: xp, Current: current, Total: total, Pct: pct}
}

// CheckLoginStreak detects consecutive logins and awards bonus XP.
// Returns (bonusXP, currentStreak). Safe to call on every authenticated request;
// it updates only once per calendar day.
func CheckLoginStreak(userID uint) (int, int) {
	var user domain.User
	db.DB.First(&user, userID)

	today := time.Now().Format("2006-01-02")
	if user.LastLoginDate == today {
		return 0, user.LoginStreak
	}

	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	if user.LastLoginDate == yesterday {
		user.LoginStreak++
	} else {
		user.LoginStreak = 1
	}

	// Streak bonus XP (capped at last entry)
	idx := user.LoginStreak - 1
	if idx >= len(loginStreakXP) {
		idx = len(loginStreakXP) - 1
	}
	bonus := loginStreakXP[idx]

	user.LastLoginDate = today
	user.XP += bonus
	user.Level = CalcLevel(user.XP)
	db.DB.Model(&user).Updates(map[string]any{
		"xp":              user.XP,
		"level":           user.Level,
		"login_streak":    user.LoginStreak,
		"last_login_date": user.LastLoginDate,
	})

	return bonus, user.LoginStreak
}
