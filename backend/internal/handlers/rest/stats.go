package rest

import (
	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/ws"
	"gorm.io/gorm"
)

type SubmitStatRequest struct {
	Mode             string `json:"mode"`
	Difficulty       string `json:"difficulty"`
	Score            int    `json:"score"`
	Time             int    `json:"time"`
	Won              bool   `json:"won"`
	BountyCoins      int    `json:"bounty_coins,omitempty"`
	RoomID           string `json:"room_id,omitempty"`
	OpponentUsername string `json:"opponent_username,omitempty"`
	OpponentScore    int    `json:"opponent_score,omitempty"`
	OpponentTime     int    `json:"opponent_time,omitempty"`
}

// GetStats returns the personal best stats for the current user and a specific game
func GetStats(c fiber.Ctx) error {
	gameID := c.Params("game_id")
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userID := uint(userIDVal.(float64)) // JWT claims are parsed as float64

	var stats []domain.UserGameStat
	var result *gorm.DB

	if gameID == "all" {
		result = db.DB.Where("user_id = ?", userID).Find(&stats)
	} else {
		result = db.DB.Where("user_id = ? AND game_id = ?", userID, gameID).Find(&stats)
	}

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch stats"})
	}

	return c.JSON(fiber.Map{"stats": stats})
}

// SubmitStat updates or creates a personal best stat record
func SubmitStat(c fiber.Ctx) error {
	gameID := c.Params("game_id")
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var req SubmitStatRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Find existing stat
	var stat domain.UserGameStat
	result := db.DB.Where("user_id = ? AND game_id = ? AND mode = ? AND difficulty = ?",
		userID, gameID, req.Mode, req.Difficulty).First(&stat)

	isNewRecord := false

	if result.Error != nil {
		// Create new stat
		stat = domain.UserGameStat{
			UserID:     userID,
			GameID:     gameID,
			Mode:       req.Mode,
			Difficulty: req.Difficulty,
			PlayCount:  1,
			Rating:     1000,
		}
		if req.Won {
			stat.WinCount = 1
		}

		// If it's a score based game
		if req.Score > 0 {
			stat.BestScore = req.Score
			isNewRecord = true
		}

		// If it's a time based game
		if req.Time > 0 && req.Won {
			stat.BestTime = req.Time
			isNewRecord = true
		}

		db.DB.Create(&stat)
	} else {
		// Update existing stat
		stat.PlayCount++
		if req.Won {
			stat.WinCount++
		}

		// Update Best Score if applicable
		if req.Score > stat.BestScore {
			stat.BestScore = req.Score
			isNewRecord = true
		}

		// Update Best Time if applicable (lower is better, but 0 means not set)
		if req.Time > 0 && req.Won {
			if stat.BestTime == 0 || req.Time < stat.BestTime {
				stat.BestTime = req.Time
				isNewRecord = true
			}
		}

		db.DB.Save(&stat)
	}

	isPK := service.IsPKMode(req.Mode)
	if isPK {
		if req.Won {
			stat.Rating += 25
		} else {
			stat.Rating -= 15
			if stat.Rating < 0 {
				stat.Rating = 0
			}
		}
		db.DB.Save(&stat)
	}

	// Award XP & Brain Coins
	xpAmount := service.CalcEventXP(isPK, req.Won)
	xpResult := service.AddXP(userID, xpAmount)

	coinsEarned := 0
	bountyPrize := 0
	if isPK && req.BountyCoins > 0 {
		if req.Won {
			// Total pool = 2 * BountyCoins, 10% burned by system, winner takes 90% (1.8 * BountyCoins)
			// Net profit = 1.8 * BountyCoins - 1.0 * BountyCoins (stake) = 0.8 * BountyCoins
			// Plus base PK win reward from dynamic config
			bountyPrize = int(float64(req.BountyCoins*2) * 0.9)
			netProfit := bountyPrize - req.BountyCoins
			basePKCoins := service.CalcRewardCoins(true, req.Difficulty, true)
			coinsEarned = basePKCoins + netProfit
		} else {
			// Loser forfeits their staked bounty coins
			coinsEarned = -req.BountyCoins
		}
	} else {
		coinsEarned = service.CalcRewardCoins(isPK, req.Difficulty, req.Won)
	}
	currentCoins, _ := service.AddCoins(userID, coinsEarned)

	// Record match history
	service.RecordMatch(userID, gameID, req.Mode, req.Difficulty, req.Won, req.Score, req.Time, xpAmount)

	// Record head-to-head PK battle if this was a member-vs-member match
	if isPK && req.OpponentUsername != "" {
		service.TryRecordPKBattle(
			req.RoomID, gameID, req.Mode, req.Difficulty,
			userID, req.OpponentUsername,
			req.Score, req.OpponentScore,
			req.Time, req.OpponentTime,
			req.Won, req.BountyCoins,
		)
	}

	// Check achievements
	newAchievements := service.CheckAchievements(service.AchievementContext{
		UserID: userID, GameID: gameID, Mode: req.Mode, Won: req.Won,
	})

	// Progress daily quests
	if isPK {
		service.ProgressDailyQuest(userID, "pk_play", 1)
	} else {
		service.ProgressDailyQuest(userID, "solo_play", 1)
	}
	if req.Won || isNewRecord {
		service.ProgressDailyQuest(userID, "win_game", 1)
	}

	// Check if this performance broke the All-Time Global Record (Hall of Fame)
	isGlobalRecord := false
	if isNewRecord && req.Difficulty != "" {
		var user domain.User
		if err := db.DB.Select("id, username, avatar, level, role").Where("id = ?", userID).First(&user).Error; err == nil && user.Role != "guest" {
			timeGames := map[string]bool{
				"minesweeper": true, "sudoku": true, "sliding": true,
				"codebreaker": true, "math24": true, "watersort": true,
				"sokoban": true, "lightsout": true, "nonogram": true,
				"connect": true, "hashi": true, "idiom": true, "tents": true,
			}
			isTimeGame := timeGames[gameID]

			if isTimeGame && req.Time > 0 && req.Won {
				var prevBestTime int
				db.DB.Table("gm_user_game_stats AS s").
					Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
					Where("s.game_id = ? AND s.difficulty = ? AND s.best_time > 0 AND s.user_id != ?", gameID, req.Difficulty, userID).
					Select("COALESCE(MIN(s.best_time), 0)").
					Scan(&prevBestTime)

				if prevBestTime == 0 || req.Time < prevBestTime {
					isGlobalRecord = true
				}
			} else if !isTimeGame && req.Score > 0 {
				var prevBestScore int
				db.DB.Table("gm_user_game_stats AS s").
					Joins("JOIN gm_users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.role != 'guest'").
					Where("s.game_id = ? AND s.difficulty = ? AND s.best_score > 0 AND s.user_id != ?", gameID, req.Difficulty, userID).
					Select("COALESCE(MAX(s.best_score), 0)").
					Scan(&prevBestScore)

				if prevBestScore == 0 || req.Score > prevBestScore {
					isGlobalRecord = true
				}
			}

			if isGlobalRecord {
				rankType := "score"
				if isTimeGame {
					rankType = "time"
				}
				go ws.Lobby.BroadcastMessage(map[string]interface{}{
					"type":       "global_record_broken",
					"game_id":    gameID,
					"difficulty": req.Difficulty,
					"user_id":    userID,
					"username":   user.Username,
					"avatar":     user.Avatar,
					"level":      user.Level,
					"best_time":  req.Time,
					"best_score": req.Score,
					"rank_type":  rankType,
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"message":          "Stat submitted successfully",
		"stat":             stat,
		"isNewRecord":      isNewRecord,
		"is_global_record": isGlobalRecord,
		"xp_result":        xpResult,
		"coins_earned":     coinsEarned,
		"bounty_prize":     bountyPrize,
		"brain_coins":      currentCoins,
		"new_achievements": newAchievements,
	})
}
