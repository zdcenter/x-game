package service

import (
	"log"
	"math"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/ws"
)

// MyPKStatsSummary provides an aggregated view of a member's PK career.
type MyPKStatsSummary struct {
	TotalMatches    int     `json:"total_matches"`
	Wins            int     `json:"wins"`
	Losses          int     `json:"losses"`
	WinRate         float64 `json:"win_rate"`
	TotalBountyWon  int     `json:"total_bounty_won"`
}

// TryRecordPKBattle checks if BOTH players are registered members.
// If both are valid non-guest members, it persists the head-to-head battle outcome.
func TryRecordPKBattle(
	roomID, gameID, mode, difficulty string,
	userAID uint,
	opponentUsername string,
	scoreA, scoreB, timeA, timeB int,
	wonA bool,
	bounty int,
) bool {
	if userAID == 0 || opponentUsername == "" {
		return false
	}

	// 1. Fetch User A
	var userA domain.User
	if err := db.DB.Where("id = ? AND deleted_at IS NULL", userAID).First(&userA).Error; err != nil {
		return false
	}
	if userA.Role == domain.RoleGuest {
		// Rule: Only record when both sides are members!
		return false
	}

	// 2. Fetch Opponent (User B)
	var userB domain.User
	if err := db.DB.Where("username = ? AND deleted_at IS NULL", opponentUsername).First(&userB).Error; err != nil {
		// Opponent not found or is a transient guest name
		return false
	}
	if userB.Role == domain.RoleGuest || userB.ID == userA.ID {
		// Opponent is guest or same user
		return false
	}

	// 3. Idempotency check: Ensure we don't insert duplicate battles if both players submit for the same round
	if roomID != "" {
		var existingCount int64
		dedupWindow := time.Now().Add(-15 * time.Second)
		db.DB.Model(&domain.PKBattle{}).
			Where("room_id = ? AND played_at > ?", roomID, dedupWindow).
			Count(&existingCount)
		if existingCount > 0 {
			return true // Already recorded
		}
	}

	// 4. Assign Winner and Loser
	var winnerID, loserID uint
	var winnerScore, loserScore, winnerTime, loserTime int

	if wonA {
		winnerID = userA.ID
		winnerScore = scoreA
		winnerTime = timeA
		loserID = userB.ID
		loserScore = scoreB
		loserTime = timeB
	} else {
		winnerID = userB.ID
		winnerScore = scoreB
		winnerTime = timeB
		loserID = userA.ID
		loserScore = scoreA
		loserTime = timeA
	}

	// 5. Margin calculation
	margin := 0
	if winnerTime > 0 && loserTime > 0 {
		margin = int(math.Abs(float64(loserTime - winnerTime)))
	} else if winnerScore > 0 || loserScore > 0 {
		margin = int(math.Abs(float64(winnerScore - loserScore)))
	}

	battle := domain.PKBattle{
		RoomID:      roomID,
		GameID:      gameID,
		Mode:        mode,
		Difficulty:  difficulty,
		WinnerID:    winnerID,
		WinnerScore: winnerScore,
		WinnerTime:  winnerTime,
		LoserID:     loserID,
		LoserScore:  loserScore,
		LoserTime:   loserTime,
		Margin:      margin,
		BountyCoins: bounty,
		PlayedAt:    time.Now(),
	}

	if err := db.DB.Create(&battle).Error; err != nil {
		log.Printf("[PKBattle] Failed to record match between %s and %s: %v", userA.Username, userB.Username, err)
		return false
	}

	// Broadcast live battle outcome to lobby so spectators & players see real-time commentary
	go func() {
		ws.Lobby.BroadcastMessage(map[string]interface{}{
			"type": "live_battle_finished",
			"battle": map[string]interface{}{
				"id":           battle.ID,
				"room_id":      roomID,
				"game_id":      gameID,
				"mode":         mode,
				"difficulty":   difficulty,
				"winner": map[string]interface{}{
					"id":       userA.ID,
					"username": userA.Username,
				},
				"loser": map[string]interface{}{
					"id":       userB.ID,
					"username": userB.Username,
				},
				"winner_score": winnerScore,
				"loser_score":  loserScore,
				"winner_time":  winnerTime,
				"loser_time":   loserTime,
				"margin":       margin,
				"bounty_coins": bounty,
				"played_at":    battle.PlayedAt.Format(time.RFC3339),
			},
		})
		ws.Lobby.BroadcastLobbyUpdate()
	}()

	log.Printf("[PKBattle] Successfully recorded battle: %s beat %s in %s (%s)", userA.Username, userB.Username, gameID, difficulty)
	return true
}

// GetRecentPKBattles returns the latest public member PK matches.
func GetRecentPKBattles(limit int) []domain.PKBattle {
	if limit <= 0 || limit > 50 {
		limit = 15
	}

	var battles []domain.PKBattle
	db.DB.Preload("Winner").Preload("Loser").
		Order("played_at desc").
		Limit(limit).
		Find(&battles)

	// Clean out sensitive fields
	for i := range battles {
		if battles[i].Winner != nil {
			battles[i].Winner.Password = ""
		}
		if battles[i].Loser != nil {
			battles[i].Loser.Password = ""
		}
	}
	return battles
}

// GetMyPKBattles returns the paginated PK history for a specific member.
func GetMyPKBattles(userID uint, limit, offset int, gameID, result string) ([]domain.PKBattle, int64, MyPKStatsSummary) {
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	if offset < 0 {
		offset = 0
	}

	// 1. Calculate overall summary for this user
	var totalMatches int64
	var totalWins int64
	var totalLosses int64
	var totalBounty int64

	db.DB.Model(&domain.PKBattle{}).
		Where("winner_id = ? OR loser_id = ?", userID, userID).
		Count(&totalMatches)

	db.DB.Model(&domain.PKBattle{}).
		Where("winner_id = ?", userID).
		Count(&totalWins)

	totalLosses = totalMatches - totalWins
	winRate := 0.0
	if totalMatches > 0 {
		winRate = math.Round((float64(totalWins)/float64(totalMatches))*1000) / 10
	}

	db.DB.Model(&domain.PKBattle{}).
		Where("winner_id = ?", userID).
		Select("COALESCE(SUM(bounty_coins), 0)").
		Scan(&totalBounty)

	summary := MyPKStatsSummary{
		TotalMatches:   int(totalMatches),
		Wins:           int(totalWins),
		Losses:         int(totalLosses),
		WinRate:        winRate,
		TotalBountyWon: int(totalBounty),
	}

	// 2. Query filtered list
	q := db.DB.Model(&domain.PKBattle{}).
		Preload("Winner").Preload("Loser")

	if result == "win" {
		q = q.Where("winner_id = ?", userID)
	} else if result == "loss" {
		q = q.Where("loser_id = ?", userID)
	} else {
		q = q.Where("winner_id = ? OR loser_id = ?", userID, userID)
	}

	if gameID != "" && gameID != "all" {
		q = q.Where("game_id = ?", gameID)
	}

	var totalFiltered int64
	q.Count(&totalFiltered)

	var battles []domain.PKBattle
	q.Order("played_at desc").Offset(offset).Limit(limit).Find(&battles)

	for i := range battles {
		if battles[i].Winner != nil {
			battles[i].Winner.Password = ""
		}
		if battles[i].Loser != nil {
			battles[i].Loser.Password = ""
		}
	}

	return battles, totalFiltered, summary
}

// SeedInitialPKBattlesIfNeeded inserts sample match records if database is empty,
// ensuring the community feed looks lively from day one.
func SeedInitialPKBattlesIfNeeded() {
	var count int64
	db.DB.Model(&domain.PKBattle{}).Count(&count)
	if count > 0 {
		return
	}

	// Find any two active users to anchor seed data
	var users []domain.User
	db.DB.Where("role != 'guest' AND deleted_at IS NULL").Limit(4).Find(&users)
	if len(users) < 1 {
		return
	}

	userA := users[0]
	userB := userA
	if len(users) >= 2 {
		userB = users[1]
	}

	now := time.Now()
	seeds := []domain.PKBattle{
		{
			RoomID:      "seed-room-1",
			GameID:      "nonogram",
			Mode:        "speed",
			Difficulty:  "medium",
			WinnerID:    userA.ID,
			WinnerTime:  42,
			WinnerScore: 100,
			LoserID:     userB.ID,
			LoserTime:   58,
			LoserScore:  70,
			Margin:      16,
			BountyCoins: 50,
			PlayedAt:    now.Add(-7 * time.Minute),
		},
		{
			RoomID:      "seed-room-2",
			GameID:      "minesweeper",
			Mode:        "speed",
			Difficulty:  "easy",
			WinnerID:    userB.ID,
			WinnerTime:  14,
			WinnerScore: 10,
			LoserID:     userA.ID,
			LoserTime:   22,
			LoserScore:  8,
			Margin:      8,
			BountyCoins: 0,
			PlayedAt:    now.Add(-22 * time.Minute),
		},
		{
			RoomID:      "seed-room-3",
			GameID:      "sudoku",
			Mode:        "speed",
			Difficulty:  "medium",
			WinnerID:    userA.ID,
			WinnerTime:  95,
			WinnerScore: 300,
			LoserID:     userB.ID,
			LoserTime:   128,
			LoserScore:  240,
			Margin:      33,
			BountyCoins: 100,
			PlayedAt:    now.Add(-48 * time.Minute),
		},
		{
			RoomID:      "seed-room-4",
			GameID:      "nonogram",
			Mode:        "speed",
			Difficulty:  "hard",
			WinnerID:    userB.ID,
			WinnerTime:  112,
			WinnerScore: 225,
			LoserID:     userA.ID,
			LoserTime:   145,
			LoserScore:  180,
			Margin:      33,
			BountyCoins: 50,
			PlayedAt:    now.Add(-90 * time.Minute),
		},
	}

	for _, s := range seeds {
		db.DB.Create(&s)
	}
	log.Printf("[PKBattle] Seeded %d initial battle records for active community vibe.", len(seeds))
}

