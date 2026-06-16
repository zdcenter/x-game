package db

import (
	"github.com/x-game/backend/internal/domain"
)

// SeedAchievements inserts all achievement definitions idempotently.
func SeedAchievements() {
	achievements := []domain.Achievement{
		// ─── Starter (入门) ─────────────────────────────────────────
		{
			ID: "first_game", Category: "starter", TitleKey: "achievement.first_game.title",
			DescKey: "achievement.first_game.desc", IconEmoji: "🎮",
			Rarity: domain.RarityCommon, XPReward: 10, SortOrder: 1,
			ConditionType: "first_game_complete", ConditionParams: "{}",
		},
		{
			ID: "first_pk_win", Category: "starter", TitleKey: "achievement.first_pk_win.title",
			DescKey: "achievement.first_pk_win.desc", IconEmoji: "⚔️",
			Rarity: domain.RarityCommon, XPReward: 15, SortOrder: 2,
			ConditionType: "first_pk_win", ConditionParams: "{}",
		},
		{
			ID: "first_daily", Category: "starter", TitleKey: "achievement.first_daily.title",
			DescKey: "achievement.first_daily.desc", IconEmoji: "📅",
			Rarity: domain.RarityCommon, XPReward: 20, SortOrder: 3,
			ConditionType: "first_daily_challenge", ConditionParams: "{}",
		},

		// ─── Playtime / Veteran (游玩总量) ──────────────────────────
		{
			ID: "play_10", Category: "playtime", TitleKey: "achievement.play_10.title",
			DescKey: "achievement.play_10.desc", IconEmoji: "🕹️",
			Rarity: domain.RarityCommon, XPReward: 10, SortOrder: 10,
			ConditionType: "total_play_count", ConditionParams: `{"count":10}`,
		},
		{
			ID: "play_50", Category: "playtime", TitleKey: "achievement.play_50.title",
			DescKey: "achievement.play_50.desc", IconEmoji: "🎯",
			Rarity: domain.RarityCommon, XPReward: 15, SortOrder: 11,
			ConditionType: "total_play_count", ConditionParams: `{"count":50}`,
		},
		{
			ID: "play_100", Category: "playtime", TitleKey: "achievement.play_100.title",
			DescKey: "achievement.play_100.desc", IconEmoji: "💯",
			Rarity: domain.RarityRare, XPReward: 25, SortOrder: 12,
			ConditionType: "total_play_count", ConditionParams: `{"count":100}`,
		},
		{
			ID: "play_500", Category: "playtime", TitleKey: "achievement.play_500.title",
			DescKey: "achievement.play_500.desc", IconEmoji: "🏅",
			Rarity: domain.RarityEpic, XPReward: 35, SortOrder: 13,
			ConditionType: "total_play_count", ConditionParams: `{"count":500}`,
		},
		{
			ID: "play_1000", Category: "playtime", TitleKey: "achievement.play_1000.title",
			DescKey: "achievement.play_1000.desc", IconEmoji: "👑",
			Rarity: domain.RarityLegendary, XPReward: 50, SortOrder: 14,
			ConditionType: "total_play_count", ConditionParams: `{"count":1000}`,
		},

		// ─── Win Streak (连胜) ────────────────────────────────────────
		{
			ID: "streak_3", Category: "streak", TitleKey: "achievement.streak_3.title",
			DescKey: "achievement.streak_3.desc", IconEmoji: "🔥",
			Rarity: domain.RarityCommon, XPReward: 15, SortOrder: 20,
			ConditionType: "pk_win_streak", ConditionParams: `{"count":3}`,
		},
		{
			ID: "streak_5", Category: "streak", TitleKey: "achievement.streak_5.title",
			DescKey: "achievement.streak_5.desc", IconEmoji: "🔥🔥",
			Rarity: domain.RarityRare, XPReward: 25, SortOrder: 21,
			ConditionType: "pk_win_streak", ConditionParams: `{"count":5}`,
		},
		{
			ID: "streak_10", Category: "streak", TitleKey: "achievement.streak_10.title",
			DescKey: "achievement.streak_10.desc", IconEmoji: "⚡",
			Rarity: domain.RarityEpic, XPReward: 35, SortOrder: 22,
			ConditionType: "pk_win_streak", ConditionParams: `{"count":10}`,
		},
		{
			ID: "streak_20", Category: "streak", TitleKey: "achievement.streak_20.title",
			DescKey: "achievement.streak_20.desc", IconEmoji: "🌪️",
			Rarity: domain.RarityLegendary, XPReward: 50, SortOrder: 23,
			ConditionType: "pk_win_streak", ConditionParams: `{"count":20}`,
		},

		// ─── Daily Challenge (每日挑战) ───────────────────────────────
		{
			ID: "daily_7", Category: "daily", TitleKey: "achievement.daily_7.title",
			DescKey: "achievement.daily_7.desc", IconEmoji: "📆",
			Rarity: domain.RarityCommon, XPReward: 20, SortOrder: 30,
			ConditionType: "daily_challenge_count", ConditionParams: `{"count":7}`,
		},
		{
			ID: "daily_30", Category: "daily", TitleKey: "achievement.daily_30.title",
			DescKey: "achievement.daily_30.desc", IconEmoji: "🗓️",
			Rarity: domain.RarityRare, XPReward: 35, SortOrder: 31,
			ConditionType: "daily_challenge_count", ConditionParams: `{"count":30}`,
		},
		{
			ID: "daily_100", Category: "daily", TitleKey: "achievement.daily_100.title",
			DescKey: "achievement.daily_100.desc", IconEmoji: "🏆",
			Rarity: domain.RarityLegendary, XPReward: 50, SortOrder: 32,
			ConditionType: "daily_challenge_count", ConditionParams: `{"count":100}`,
		},

		// ─── All-Rounder (全能) ───────────────────────────────────────
		{
			ID: "all_games_played", Category: "allround", TitleKey: "achievement.all_games_played.title",
			DescKey: "achievement.all_games_played.desc", IconEmoji: "🌐",
			Rarity: domain.RarityRare, XPReward: 30, SortOrder: 40,
			ConditionType: "all_games_played", ConditionParams: `{"count":13}`,
		},
		{
			ID: "all_games_won", Category: "allround", TitleKey: "achievement.all_games_won.title",
			DescKey: "achievement.all_games_won.desc", IconEmoji: "🌟",
			Rarity: domain.RarityEpic, XPReward: 50, SortOrder: 41,
			ConditionType: "all_games_won", ConditionParams: `{"count":13}`,
		},
		{
			ID: "achieve_10", Category: "allround", TitleKey: "achievement.achieve_10.title",
			DescKey: "achievement.achieve_10.desc", IconEmoji: "🎖️",
			Rarity: domain.RarityRare, XPReward: 25, SortOrder: 42,
			ConditionType: "achievement_count", ConditionParams: `{"count":10}`,
		},
		{
			ID: "achieve_20", Category: "allround", TitleKey: "achievement.achieve_20.title",
			DescKey: "achievement.achieve_20.desc", IconEmoji: "🏅",
			Rarity: domain.RarityEpic, XPReward: 35, SortOrder: 43,
			ConditionType: "achievement_count", ConditionParams: `{"count":20}`,
		},
		{
			ID: "achieve_all", Category: "allround", TitleKey: "achievement.achieve_all.title",
			DescKey: "achievement.achieve_all.desc", IconEmoji: "💎",
			Rarity: domain.RarityLegendary, XPReward: 50, SortOrder: 44,
			ConditionType: "achievement_count", ConditionParams: `{"count":34}`,
		},

		// ─── Game Mastery (精通) — one per game ────────────────────────
		{
			ID: "master_minesweeper", Category: "mastery", TitleKey: "achievement.master_minesweeper.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "💣",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 50,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"minesweeper"}`,
		},
		{
			ID: "master_sudoku", Category: "mastery", TitleKey: "achievement.master_sudoku.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🔢",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 51,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"sudoku"}`,
		},
		{
			ID: "master_sliding", Category: "mastery", TitleKey: "achievement.master_sliding.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🔲",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 52,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"sliding"}`,
		},
		{
			ID: "master_hexa", Category: "mastery", TitleKey: "achievement.master_hexa.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🔶",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 53,
			ConditionType: "specific_game_win", ConditionParams: `{"game_id":"hexa"}`,
		},
		{
			ID: "master_tetris", Category: "mastery", TitleKey: "achievement.master_tetris.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🧱",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 54,
			ConditionType: "specific_game_win", ConditionParams: `{"game_id":"tetris"}`,
		},
		{
			ID: "master_gomoku", Category: "mastery", TitleKey: "achievement.master_gomoku.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "⚫",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 55,
			ConditionType: "specific_game_win", ConditionParams: `{"game_id":"gomoku"}`,
		},
		{
			ID: "master_codebreaker", Category: "mastery", TitleKey: "achievement.master_codebreaker.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🔐",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 56,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"codebreaker"}`,
		},
		{
			ID: "master_math24", Category: "mastery", TitleKey: "achievement.master_math24.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🃏",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 57,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"math24"}`,
		},
		{
			ID: "master_drop2048", Category: "mastery", TitleKey: "achievement.master_drop2048.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🟦",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 58,
			ConditionType: "specific_game_win", ConditionParams: `{"game_id":"drop2048"}`,
		},
		{
			ID: "master_block", Category: "mastery", TitleKey: "achievement.master_block.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🟩",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 59,
			ConditionType: "specific_game_win", ConditionParams: `{"game_id":"block"}`,
		},
		{
			ID: "master_lightsout", Category: "mastery", TitleKey: "achievement.master_lightsout.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "💡",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 60,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"lightsout"}`,
		},
		{
			ID: "master_watersort", Category: "mastery", TitleKey: "achievement.master_watersort.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "🧪",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 61,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"watersort"}`,
		},
		{
			ID: "master_sokoban", Category: "mastery", TitleKey: "achievement.master_sokoban.title",
			DescKey: "achievement.master_game.desc", IconEmoji: "📦",
			Rarity: domain.RarityRare, XPReward: 20, SortOrder: 62,
			ConditionType: "game_expert_clear", ConditionParams: `{"game_id":"sokoban"}`,
		},
	}

	for i := range achievements {
		a := achievements[i]
		// Idempotent: create only if not exists
		DB.Where(domain.Achievement{ID: a.ID}).FirstOrCreate(&a)
	}
}
