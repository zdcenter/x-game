package db

import (
	"fmt"
	"log"
	"os"

	"github.com/x-game/backend/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitPostgres() {
	// For local dev, hardcode is fine temporarily or use env vars
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "root"),
		getEnv("DB_PASSWORD", "password"),
		getEnv("DB_NAME", "x_game_db"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	err = DB.AutoMigrate(
		&domain.User{},
		&domain.GameConfig{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed default data
	Seed()

	log.Println("Database connected and migrated successfully")
}

func Seed() {
	var count int64
	DB.Model(&domain.GameConfig{}).Count(&count)
	if count == 0 {
		defaultMinesweeper := domain.GameConfig{
			ID:       "minesweeper",
			Name:     `{"en": "Minesweeper", "zh": "扫雷"}`,
			Overview: `{"en": "A classic puzzle game. Tap to dig, Long press to flag.", "zh": "经典逻辑益智游戏。点击挖开，长按插旗。"}`,
			Rules:    `{"en": "# Minesweeper Rules\n\nWelcome to X-Game Minesweeper! The classic game of logic, now with multiplayer competitive modes.\n\n## 🎯 Objective\nClear the minefield without detonating any mines! The game is won when all safe cells are revealed, or all mines are correctly flagged.\n\n## 🎮 Controls\n- **Reveal (Dig)**: Left-click (or tap) on a hidden cell.\n- **Flag**: Right-click (or long press) on a cell to mark it as a mine.\n\n## 🎲 Game Modes\n\n### Single Player\nA relaxed, classic experience.\n- **First Click Safe**: Your first click will *always* reveal a large safe area to get you started!\n- **Instant Death**: Stepping on a mine ends the game immediately.\n\n### PK / Speed Mode\nCompete against others to finish the board first!\n- **Fair Start**: The game automatically reveals a shared safe zone for all players at the exact same moment.\n- **Penalty System**: Stepping on a mine doesn't kill you, but it freezes your screen for a few seconds!", "zh": "# 扫雷玩法规则\n\n欢迎来到 X-Game 扫雷！这不仅是经典的逻辑推理游戏，更加入了刺激的多人竞技模式。\n\n## 🎯 游戏目标\n避开所有地雷，找出所有安全的格子！当所有非雷区域被揭开，或所有地雷被正确插旗标记时，即可获胜。\n\n## 🎮 操作说明\n- **挖开 (揭示)**: 鼠标左键（或在手机上单击）未揭开的格子。\n- **插旗 (标记)**: 鼠标右键（或在手机上长按）格子，将其标记为地雷。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n经典的休闲体验，适合练手。\n- **首击必空**: 你的第一次点击绝对不会踩雷，并且必定为你展开一片安全的空地！\n- **一击毙命**: 只要踩到一次地雷，游戏立即结束。\n\n### 竞速模式 (PK / Speed)\n与其他玩家同场竞技，比拼手速与脑力！\n- **公平开局**: 倒计时结束时，系统会自动为所有人揭开同一块相同的安全区域，确保竞技的绝对公平。\n- **惩罚机制**: 踩到地雷不会立刻死亡，但会受到**冻结惩罚**（屏幕会被锁定数秒无法操作），要格外小心！"}`,
			Config:   `{"penaltySeconds": 3}`,
			IsActive: true,
		}
		DB.Create(&defaultMinesweeper)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
