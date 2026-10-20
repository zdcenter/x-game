package service

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

// XP default rewards per event type
const (
	DefaultXPSinglePlay     = 0
	DefaultXPSingleWin      = 5
	DefaultXPSingleDefeat   = 0
	DefaultXPPKPlay         = 0
	DefaultXPPKWin          = 15
	DefaultXPDailyChallenge = 30
	DefaultXPPKDefeat       = 0

	// Legacy exported constants for compatibility
	XPSinglePlay     = 0
	XPSingleWin      = 5
	XPPKPlay         = 0
	XPPKWin          = 15
	XPDailyChallenge = 30
)

// Setting keys in database
const (
	KeyXPSingleWin     = "xp.single_win"
	KeyXPSingleDefeat  = "xp.single_defeat"
	KeyXPPKWin         = "xp.pk_win"
	KeyXPPKDefeat      = "xp.pk_defeat"
	KeyXPDailyComplete = "xp.daily_complete"
	KeyXPSinglePlay    = "xp.single_play"
	KeyXPPKPlay        = "xp.pk_play"
)

// AllXPKeys lists all XP configuration keys
var AllXPKeys = []string{
	KeyXPSingleWin,
	KeyXPSingleDefeat,
	KeyXPPKWin,
	KeyXPPKDefeat,
	KeyXPDailyComplete,
	KeyXPSinglePlay,
	KeyXPPKPlay,
}

type XPConfig struct {
	SingleWin     int `json:"single_win"`
	SingleDefeat  int `json:"single_defeat"`
	PKWin         int `json:"pk_win"`
	PKDefeat      int `json:"pk_defeat"`
	DailyComplete int `json:"daily_complete"`
}

// GetXPConfig retrieves current XP settings from database with fallbacks
func GetXPConfig() XPConfig {
	cfg := XPConfig{
		SingleWin:     DefaultXPSingleWin,
		SingleDefeat:  DefaultXPSingleDefeat,
		PKWin:         DefaultXPPKWin,
		PKDefeat:      DefaultXPPKDefeat,
		DailyComplete: DefaultXPDailyChallenge,
	}

	var settings []domain.SystemSetting
	if err := db.DB.Where("key IN ?", AllXPKeys).Find(&settings).Error; err != nil {
		return cfg
	}

	for _, s := range settings {
		val, err := strconv.Atoi(strings.TrimSpace(s.Value))
		if err != nil || val < 0 {
			continue
		}
		switch s.Key {
		case KeyXPSingleWin:
			cfg.SingleWin = val
		case KeyXPSingleDefeat:
			cfg.SingleDefeat = val
		case KeyXPPKWin:
			cfg.PKWin = val
		case KeyXPPKDefeat:
			cfg.PKDefeat = val
		case KeyXPDailyComplete:
			cfg.DailyComplete = val
		}
	}
	return cfg
}

// SeedXPSettings ensures default XP settings exist in the database
func SeedXPSettings() {
	defaults := map[string]string{
		KeyXPSingleWin:     strconv.Itoa(DefaultXPSingleWin),
		KeyXPSingleDefeat:  strconv.Itoa(DefaultXPSingleDefeat),
		KeyXPPKWin:         strconv.Itoa(DefaultXPPKWin),
		KeyXPPKDefeat:      strconv.Itoa(DefaultXPPKDefeat),
		KeyXPDailyComplete: strconv.Itoa(DefaultXPDailyChallenge),
		KeyXPSinglePlay:    strconv.Itoa(DefaultXPSinglePlay),
		KeyXPPKPlay:        strconv.Itoa(DefaultXPPKPlay),
	}

	for k, v := range defaults {
		var existing domain.SystemSetting
		if err := db.DB.Where("key = ?", k).First(&existing).Error; err != nil {
			db.DB.Create(&domain.SystemSetting{Key: k, Value: v})
		}
	}
}

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

// CalcEventXP returns the dynamic XP amount for a game event based on mode and win status.
func CalcEventXP(isPK, won bool) int {
	cfg := GetXPConfig()
	if isPK {
		if won {
			return cfg.PKWin
		}
		return cfg.PKDefeat
	}
	if won {
		return cfg.SingleWin
	}
	return cfg.SingleDefeat
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
// Supports automatic streak freeze protection if yesterday was missed!
// Returns (bonusXP, currentStreak, freezeUsed, freezesLeft).
func CheckLoginStreak(userID uint) (int, int, bool, int) {
	var user domain.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return 0, 0, false, 0
	}

	today := time.Now().Format("2006-01-02")
	if user.LastLoginDate == today {
		return 0, user.LoginStreak, false, user.StreakFreezes
	}

	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	twoDaysAgo := time.Now().AddDate(0, 0, -2).Format("2006-01-02")

	freezeUsed := false

	if user.LastLoginDate == yesterday {
		user.LoginStreak++
	} else if user.LastLoginDate == twoDaysAgo && user.StreakFreezes > 0 {
		// Missed yesterday! Streak freeze saves the streak!
		user.StreakFreezes--
		user.LoginStreak++
		freezeUsed = true
	} else {
		// First login or missed 2+ days
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
		"streak_freezes":  user.StreakFreezes,
	})

	return bonus, user.LoginStreak, freezeUsed, user.StreakFreezes
}
