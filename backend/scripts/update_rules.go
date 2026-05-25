package main

import (
	"encoding/json"
	"log"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()

	enRules := `# Minesweeper Rules

Welcome to X-Game Minesweeper! The classic game of logic, now with multiplayer competitive modes.

## 🎯 Objective
Clear the minefield without detonating any mines! The game is won when all safe cells are revealed, or all mines are correctly flagged.

## 🎮 Controls
- **Reveal (Dig)**: Left-click (or tap) on a hidden cell.
- **Flag**: Right-click (or long press) on a cell to mark it as a mine.

## 🎲 Game Modes

### Single Player
A relaxed, classic experience.
- **First Click Safe**: Your first click will *always* reveal a large safe area to get you started!
- **Instant Death**: Stepping on a mine ends the game immediately.

### PK / Speed Mode
Compete against others to finish the board first!
- **Fair Start**: The game automatically reveals a shared safe zone for all players at the exact same moment.
- **Penalty System**: Stepping on a mine doesn't kill you, but it freezes your screen for a few seconds!`

	zhRules := `# 扫雷玩法规则

欢迎来到 X-Game 扫雷！这不仅是经典的逻辑推理游戏，更加入了刺激的多人竞技模式。

## 🎯 游戏目标
避开所有地雷，找出所有安全的格子！当所有非雷区域被揭开，或所有地雷被正确插旗标记时，即可获胜。

## 🎮 操作说明
- **挖开 (揭示)**: 鼠标左键（或在手机上单击）未揭开的格子。
- **插旗 (标记)**: 鼠标右键（或在手机上长按）格子，将其标记为地雷。

## 🎲 游戏模式

### 单机模式 (Single)
经典的休闲体验，适合练手。
- **首击必空**: 你的第一次点击绝对不会踩雷，并且必定为你展开一片安全的空地！
- **一击毙命**: 只要踩到一次地雷，游戏立即结束。

### 竞速模式 (PK / Speed)
与其他玩家同场竞技，比拼手速与脑力！
- **公平开局**: 倒计时结束时，系统会自动为所有人揭开同一块相同的安全区域，确保竞技的绝对公平。
- **惩罚机制**: 踩到地雷不会立刻死亡，但会受到**冻结惩罚**（屏幕会被锁定数秒无法操作），要格外小心！`

	rulesMap := map[string]string{
		"en": enRules,
		"zh": zhRules,
	}

	rulesBytes, err := json.Marshal(rulesMap)
	if err != nil {
		log.Fatalf("Failed to marshal rules: %v", err)
	}

	var game domain.GameConfig
	if err := db.DB.First(&game, "id = ?", "minesweeper").Error; err != nil {
		log.Fatalf("Failed to find game: %v", err)
	}

	game.Rules = string(rulesBytes)
	if err := db.DB.Save(&game).Error; err != nil {
		log.Fatalf("Failed to update game: %v", err)
	}

	log.Println("Successfully updated Minesweeper rules in database")
}
