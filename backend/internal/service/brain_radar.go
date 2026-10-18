package service

import (
	"math"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type BrainDimension struct {
	Key     string   `json:"key"`
	NameKey string   `json:"name_key"`
	Icon    string   `json:"icon"`
	Score   int      `json:"score"`
	Max     int      `json:"max"`
	Pct     int      `json:"pct"`
	Games   []string `json:"games"`
}

type BrainRadarResult struct {
	BQ          int              `json:"bq"`
	MaxBQ       int              `json:"max_bq"`
	TierKey     string           `json:"tier_key"`
	TierName    string           `json:"tier_name"`
	Dimensions  []BrainDimension `json:"dimensions"`
	TotalPlayed int              `json:"total_played"`
	TotalWins   int              `json:"total_wins"`
}

var dimensionGameMap = map[string][]string{
	"logic":       {"minesweeper", "sudoku", "hashi"},
	"spatial":     {"tetris", "sliding", "sokoban"},
	"calculation": {"classic_2048", "math24", "drop2048"},
	"focus":       {"hexa", "block", "connect"},
	"strategy":    {"gomoku", "water_sort", "codebreaker", "idiom", "lightsout"},
}

// GetUserBrainRadar calculates the user's 5-dimensional brain stats and BQ score
func GetUserBrainRadar(userID uint) BrainRadarResult {
	result := BrainRadarResult{
		MaxBQ: 1000,
		Dimensions: []BrainDimension{
			{Key: "logic", NameKey: "brain.dim_logic", Icon: "🧩", Max: 200, Games: dimensionGameMap["logic"]},
			{Key: "spatial", NameKey: "brain.dim_spatial", Icon: "📐", Max: 200, Games: dimensionGameMap["spatial"]},
			{Key: "calculation", NameKey: "brain.dim_calc", Icon: "🔢", Max: 200, Games: dimensionGameMap["calculation"]},
			{Key: "focus", NameKey: "brain.dim_focus", Icon: "⚡", Max: 200, Games: dimensionGameMap["focus"]},
			{Key: "strategy", NameKey: "brain.dim_strategy", Icon: "♟️", Max: 200, Games: dimensionGameMap["strategy"]},
		},
	}

	if userID == 0 {
		for i := range result.Dimensions {
			result.Dimensions[i].Score = 50
			result.Dimensions[i].Pct = 25
		}
		result.BQ = 250
		result.TierKey = "brain.tier_curious"
		result.TierName = "启智学者"
		return result
	}

	var stats []domain.UserGameStat
	db.DB.Where("user_id = ?", userID).Find(&stats)

	statsMap := make(map[string]domain.UserGameStat)
	totalPlayed := 0
	totalWins := 0

	for _, s := range stats {
		statsMap[s.GameID] = s
		totalPlayed += s.PlayCount
		totalWins += s.WinCount
	}

	result.TotalPlayed = totalPlayed
	result.TotalWins = totalWins

	totalBQ := 0

	for i, dim := range result.Dimensions {
		dimScore := 50 // Base score

		for _, gameID := range dim.Games {
			if stat, ok := statsMap[gameID]; ok && stat.PlayCount > 0 {
				dimScore += 15 // Unlocked game
				// Play count bonus: up to 20
				playBonus := stat.PlayCount * 2
				if playBonus > 20 {
					playBonus = 20
				}
				dimScore += playBonus

				// Win count bonus: up to 25
				winBonus := stat.WinCount * 4
				if winBonus > 25 {
					winBonus = 25
				}
				dimScore += winBonus

				// Performance bonus: up to 15
				if stat.BestScore > 0 || stat.BestTime > 0 {
					dimScore += 10
				}
			}
		}

		if dimScore > 200 {
			dimScore = 200
		}
		result.Dimensions[i].Score = dimScore
		result.Dimensions[i].Pct = int(math.Round(float64(dimScore) / 200.0 * 100.0))
		totalBQ += dimScore
	}

	result.BQ = totalBQ

	// Tier calculation
	if totalBQ < 400 {
		result.TierKey = "brain.tier_curious"
		result.TierName = "启智学者"
	} else if totalBQ < 600 {
		result.TierKey = "brain.tier_sharp"
		result.TierName = "敏锐探求者"
	} else if totalBQ < 800 {
		result.TierKey = "brain.tier_expert"
		result.TierName = "益智达人"
	} else if totalBQ < 950 {
		result.TierKey = "brain.tier_master"
		result.TierName = "策略宗师"
	} else {
		result.TierKey = "brain.tier_apex"
		result.TierName = "脑力巅峰"
	}

	return result
}
