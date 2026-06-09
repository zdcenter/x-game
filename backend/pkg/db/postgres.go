package db

import (
	"fmt"
	"log"
	"os"

	"github.com/x-game/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
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
		NamingStrategy: schema.NamingStrategy{
			TablePrefix:   "gm_",
			SingularTable: false,
		},
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	err = DB.AutoMigrate(
		&domain.User{},
		&domain.GameConfig{},
		&domain.SudokuPuzzle{},
		&domain.UserSudokuProgress{},
		&domain.UserGameStat{},
		&domain.Math24Puzzle{},
		&domain.UserMath24Progress{},
		&domain.SystemSetting{},
		&domain.Announcement{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed default data
	Seed()
	SeedSudoku()
	SeedMath24()
	SeedSettings()

	log.Println("Database connected and migrated successfully")
}

func Seed() {
	games := []domain.GameConfig{
		{
			ID:       "minesweeper",
			Name:     `{"en": "Minesweeper", "zh": "扫雷"}`,
			Overview: `{"en": "A classic puzzle game. Tap to dig, Long press to flag.", "zh": "经典逻辑益智游戏。点击挖开，长按插旗。"}`,
			Rules:    `{"en": "# Minesweeper Rules\n\nWelcome to X-Game Minesweeper! The classic game of logic, now with multiplayer competitive modes.\n\n## 🎯 Objective\nClear the minefield without detonating any mines! The game is won when all safe cells are revealed, or all mines are correctly flagged.\n\n## 🎮 Controls\n- **Reveal (Dig)**: Left-click (or tap) on a hidden cell.\n- **Flag**: Right-click (or long press) on a cell to mark it as a mine.\n\n## 🎲 Game Modes\n\n### Single Player\nA relaxed, classic experience.\n- **First Click Safe**: Your first click will *always* reveal a large safe area to get you started!\n- **Instant Death**: Stepping on a mine ends the game immediately.\n\n### PK / Speed Mode\nCompete against others to finish the board first!\n- **Fair Start**: The game automatically reveals a shared safe zone for all players at the exact same moment.\n- **Penalty System**: Stepping on a mine doesn't kill you, but it freezes your screen for a few seconds!", "zh": "# 扫雷玩法规则\n\n欢迎来到 X-Game 扫雷！这不仅是经典的逻辑推理游戏，更加入了刺激的多人竞技模式。\n\n## 🎯 游戏目标\n避开所有地雷，找出所有安全的格子！当所有非雷区域被揭开，或所有地雷被正确插旗标记时，即可获胜。\n\n## 🎮 操作说明\n- **挖开 (揭示)**: 鼠标左键（或在手机上单击）未揭开的格子。\n- **插旗 (标记)**: 鼠标右键（或在手机上长按）格子，将其标记为地雷。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n经典的休闲体验，适合练手。\n- **首击必空**: 你的第一次点击绝对不会踩雷，并且必定为你展开一片安全的空地！\n- **一击毙命**: 只要踩到一次地雷，游戏立即结束。\n\n### 竞速模式 (PK / Speed)\n与其他玩家同场竞技，比拼手速与脑力！\n- **公平开局**: 倒计时结束时，系统会自动为所有人揭开同一块相同的安全区域，确保竞技的绝对公平。\n- **惩罚机制**: 踩到地雷不会立刻死亡，但会受到**冻结惩罚**（屏幕会被锁定数秒无法操作），要格外小心！"}`,
			Config:   `{"penaltySeconds": 3}`,
			IsActive: true,
		},
		{
			ID:       "sudoku",
			Name:     `{"en": "Puzzle PK Sudoku", "zh": "Puzzle PK 数独"}`,
			Overview: `{"en": "The classic numbers puzzle. Play solo or race against friends.", "zh": "经典数字逻辑游戏。单机闯关或好友联机竞速。"}`,
			Rules:    `{"en": "# Sudoku Rules\n\nFill the 9x9 grid with digits so that each column, each row, and each of the nine 3x3 subgrids that compose the grid contain all of the digits from 1 to 9.\n\n<svg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-lg'>\n  <rect x='0' y='0' width='180' height='180' fill='#f8fafc' stroke='#334155' stroke-width='4' />\n  <!-- Grid lines -->\n  <path d='M20 0 v180 M40 0 v180 M60 0 v180 M80 0 v180 M100 0 v180 M120 0 v180 M140 0 v180 M160 0 v180' stroke='#cbd5e1' stroke-width='1' />\n  <path d='M0 20 h180 M0 40 h180 M0 60 h180 M0 80 h180 M0 100 h180 M0 120 h180 M0 140 h180 M0 160 h180' stroke='#cbd5e1' stroke-width='1' />\n  <path d='M60 0 v180 M120 0 v180 M0 60 h180 M0 120 h180' stroke='#475569' stroke-width='2' />\n  <!-- Some numbers -->\n  <text x='30' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>5</text>\n  <text x='90' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>3</text>\n  <text x='150' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#3b82f6' text-anchor='middle'>7</text>\n  <text x='30' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#3b82f6' text-anchor='middle'>6</text>\n  <text x='90' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>1</text>\n  <text x='150' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>9</text>\n</svg>\n\n## 🎮 Controls\n- **Select**: Tap a cell to select it.\n- **Input**: Use the on-screen numpad or physical keyboard (1-9) to input numbers.\n- **Notes (Pencil)**: Toggle Note mode to draft possible numbers in an empty cell.\n- **Erase**: Remove a number or note from the selected cell.", "zh": "# 数独玩法规则\n\n将数字 1-9 填入 9x9 的网格中，使得每一行、每一列以及每一个 3x3 的粗线宫格内，数字 1-9 都刚好出现一次，不重复也不遗漏。\n\n<svg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-lg'>\n  <rect x='0' y='0' width='180' height='180' fill='#f8fafc' stroke='#334155' stroke-width='4' />\n  <!-- Grid lines -->\n  <path d='M20 0 v180 M40 0 v180 M60 0 v180 M80 0 v180 M100 0 v180 M120 0 v180 M140 0 v180 M160 0 v180' stroke='#cbd5e1' stroke-width='1' />\n  <path d='M0 20 h180 M0 40 h180 M0 60 h180 M0 80 h180 M0 100 h180 M0 120 h180 M0 140 h180 M0 160 h180' stroke='#cbd5e1' stroke-width='1' />\n  <path d='M60 0 v180 M120 0 v180 M0 60 h180 M0 120 h180' stroke='#475569' stroke-width='2' />\n  <!-- Some numbers -->\n  <text x='30' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>5</text>\n  <text x='90' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>3</text>\n  <text x='150' y='46' font-family='sans-serif' font-size='24' font-weight='bold' fill='#3b82f6' text-anchor='middle'>7</text>\n  <text x='30' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#3b82f6' text-anchor='middle'>6</text>\n  <text x='90' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>1</text>\n  <text x='150' y='106' font-family='sans-serif' font-size='24' font-weight='bold' fill='#0f172a' text-anchor='middle'>9</text>\n</svg>\n\n## 🎮 操作说明\n- **选择**: 点击选中一个格子。\n- **输入**: 点击屏幕下方的数字键盘，或使用物理键盘的 1-9 填入数字。\n- **笔记 (铅笔)**: 开启笔记模式后，可以在空白格内记录可能的候选数字。\n- **擦除**: 清除选中格子内的数字或笔记。"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "sliding",
			Name:     `{"en": "Puzzle PK Sliding", "zh": "Puzzle PK 华容道"}`,
			Overview: `{"en": "Classic 15-puzzle. Slide tiles to order them.", "zh": "经典数字滑块拼图。打乱后复原它。"}`,
			Rules:    `{"en": "# Sliding Puzzle Rules\n\nSlide the numbered tiles into sequential order.\n\n<svg width='220' height='220' viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-xl'>\n  <rect x='0' y='0' width='220' height='220' rx='12' fill='#cbd5e1' stroke='#94a3b8' stroke-width='4' />\n  <defs>\n    <rect id='tile' width='46' height='46' rx='8' fill='#f8fafc' stroke='#e2e8f0' stroke-width='2' />\n    <filter id='shadow' x='0' y='0' width='150%' height='150%'>\n      <feDropShadow dx='0' dy='4' stdDeviation='2' flood-color='#000' flood-opacity='0.1'/>\n    </filter>\n  </defs>\n  <g transform='translate(14, 14)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>1</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>2</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>3</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>4</text>\n  </g>\n  <g transform='translate(14, 68)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>5</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>6</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>7</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>8</text>\n  </g>\n  <g transform='translate(14, 122)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>9</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>10</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>11</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>12</text>\n  </g>\n  <g transform='translate(14, 176)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>13</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>14</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>15</text>\n    <rect x='162' y='0' width='46' height='46' rx='8' fill='#94a3b8' stroke='#64748b' stroke-width='2' />\n  </g>\n</svg>\n\n## 🎮 Controls\n- **Move**: Click or tap a tile adjacent to the empty space to slide it.", "zh": "# 数字华容道玩法规则\n\n将数字方块按顺序从小到大排列整齐，并将空格留在棋盘的右下角。\n\n<svg width='220' height='220' viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-xl'>\n  <rect x='0' y='0' width='220' height='220' rx='12' fill='#cbd5e1' stroke='#94a3b8' stroke-width='4' />\n  <defs>\n    <rect id='tile' width='46' height='46' rx='8' fill='#f8fafc' stroke='#e2e8f0' stroke-width='2' />\n    <filter id='shadow' x='0' y='0' width='150%' height='150%'>\n      <feDropShadow dx='0' dy='4' stdDeviation='2' flood-color='#000' flood-opacity='0.1'/>\n    </filter>\n  </defs>\n  <g transform='translate(14, 14)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>1</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>2</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>3</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>4</text>\n  </g>\n  <g transform='translate(14, 68)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>5</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>6</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>7</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>8</text>\n  </g>\n  <g transform='translate(14, 122)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>9</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>10</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>11</text>\n    <use href='#tile' x='162' y='0' filter='url(#shadow)'/><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>12</text>\n  </g>\n  <g transform='translate(14, 176)'>\n    <use href='#tile' x='0' y='0' filter='url(#shadow)'/><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>13</text>\n    <use href='#tile' x='54' y='0' filter='url(#shadow)'/><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>14</text>\n    <use href='#tile' x='108' y='0' filter='url(#shadow)'/><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>15</text>\n    <rect x='162' y='0' width='46' height='46' rx='8' fill='#94a3b8' stroke='#64748b' stroke-width='2' />\n  </g>\n</svg>\n\n## 🎮 操作说明\n- **移动**: 点击与空格相邻的方块即可将其移入空格。\n- **连推**: 也可以点击同行同列远处的方块一次性连推多个方块！"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "hexa",
			Name:     `{"en": "Hexa Puzzle", "zh": "六边形消除"}`,
			Overview: `{"en": "Place hex blocks to clear lines in 3 directions.", "zh": "拖拽六边形方块，填满任意直线即可消除得分。"}`,
			Rules:    `{"en": "# Hexa Puzzle Rules\n\nDrag blocks to the grid. Clear lines in any of the 3 directions.\n\n<svg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-xl'>\n  <defs>\n    <polygon id='hex' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#e2e8f0' stroke='#cbd5e1' stroke-width='2'/>\n    <polygon id='hex_blue' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#3b82f6' stroke='#2563eb' stroke-width='2'/>\n    <polygon id='hex_purple' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#a855f7' stroke='#9333ea' stroke-width='2'/>\n  </defs>\n  <g transform='translate(60, 20)'>\n    <use href='#hex' x='0' y='0'/>\n  </g>\n  <g transform='translate(40, 54.6)'>\n    <use href='#hex' x='0' y='0'/>\n    <use href='#hex_blue' x='40' y='0'/>\n  </g>\n  <g transform='translate(20, 89.2)'>\n    <use href='#hex_purple' x='0' y='0'/>\n    <use href='#hex_blue' x='40' y='0'/>\n    <use href='#hex' x='80' y='0'/>\n  </g>\n</svg>\n\n## 🎮 Controls\n- **Drag & Drop**: Move pieces to the board.", "zh": "# 六边形消除玩法规则\n\n拖拽随机出现的六边形碎片到大棋盘上，填满任意一条直线（横向或斜向）即可消除得分。\n\n<svg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-xl'>\n  <defs>\n    <polygon id='hex' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#e2e8f0' stroke='#cbd5e1' stroke-width='2'/>\n    <polygon id='hex_blue' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#3b82f6' stroke='#2563eb' stroke-width='2'/>\n    <polygon id='hex_purple' points='20,0 40,11.5 40,34.6 20,46.1 0,34.6 0,11.5' fill='#a855f7' stroke='#9333ea' stroke-width='2'/>\n  </defs>\n  <g transform='translate(60, 20)'>\n    <use href='#hex' x='0' y='0'/>\n  </g>\n  <g transform='translate(40, 54.6)'>\n    <use href='#hex' x='0' y='0'/>\n    <use href='#hex_blue' x='40' y='0'/>\n  </g>\n  <g transform='translate(20, 89.2)'>\n    <use href='#hex_purple' x='0' y='0'/>\n    <use href='#hex_blue' x='40' y='0'/>\n    <use href='#hex' x='80' y='0'/>\n  </g>\n</svg>\n\n## 🎮 操作说明\n- **拖拽**: 将屏幕下方的方块拖入棋盘空位。"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "tetris",
			Name:     `{"en": "Tetris Battle", "zh": "俄罗斯方块对战"}`,
			Overview: `{"en": "Classic block-stacking game. Clear lines to send garbage to your opponent!", "zh": "经典方块堆叠游戏。消除多行即可向对手发送垃圾行！"}`,
			Rules:    `{"en": "# Tetris Battle Rules\n\nStack falling blocks to clear lines.\n\n<svg width='120' height='160' viewBox='0 0 120 160' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-2xl'>\n  <rect x='0' y='0' width='120' height='160' rx='8' fill='#0f172a' stroke='#334155' stroke-width='2' />\n  <defs>\n    <rect id='t' width='20' height='20' rx='2' stroke='#ffffff' stroke-width='1' stroke-opacity='0.2' />\n  </defs>\n  <!-- Grid -->\n  <g stroke='#1e293b' stroke-width='1' opacity='0.5'>\n    <path d='M20 0 v160 M40 0 v160 M60 0 v160 M80 0 v160 M100 0 v160' />\n    <path d='M0 20 h120 M0 40 h120 M0 60 h120 M0 80 h120 M0 100 h120 M0 120 h120 M0 140 h120' />\n  </g>\n  <!-- Blocks -->\n  <g fill='#a855f7'>\n    <use href='#t' x='40' y='20'/>\n    <use href='#t' x='40' y='40'/>\n    <use href='#t' x='60' y='40'/>\n    <use href='#t' x='20' y='40'/>\n  </g>\n  <g fill='#3b82f6'>\n    <use href='#t' x='20' y='140'/>\n    <use href='#t' x='20' y='120'/>\n    <use href='#t' x='40' y='140'/>\n    <use href='#t' x='60' y='140'/>\n  </g>\n</svg>\n\n## 🎮 Controls\n- **Move**: Left/Right arrows, or Swipe.\n- **Rotate**: Up arrow, or Tap.\n- **Soft Drop**: Down arrow.\n- **Hard Drop**: Spacebar.\n- **Hold**: Shift or C key.\n\n## ⚔️ PK Attack Mode\nClear 2 or more lines simultaneously to send garbage lines to your opponent's board!", "zh": "# 俄罗斯方块对战规则\n\n拼合下落的方块，填满一整行即可消除。\n\n<svg width='120' height='160' viewBox='0 0 120 160' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-2xl'>\n  <rect x='0' y='0' width='120' height='160' rx='8' fill='#0f172a' stroke='#334155' stroke-width='2' />\n  <defs>\n    <rect id='t' width='20' height='20' rx='2' stroke='#ffffff' stroke-width='1' stroke-opacity='0.2' />\n  </defs>\n  <!-- Grid -->\n  <g stroke='#1e293b' stroke-width='1' opacity='0.5'>\n    <path d='M20 0 v160 M40 0 v160 M60 0 v160 M80 0 v160 M100 0 v160' />\n    <path d='M0 20 h120 M0 40 h120 M0 60 h120 M0 80 h120 M0 100 h120 M0 120 h120 M0 140 h120' />\n  </g>\n  <!-- Blocks -->\n  <g fill='#a855f7'>\n    <use href='#t' x='40' y='20'/>\n    <use href='#t' x='40' y='40'/>\n    <use href='#t' x='60' y='40'/>\n    <use href='#t' x='20' y='40'/>\n  </g>\n  <g fill='#3b82f6'>\n    <use href='#t' x='20' y='140'/>\n    <use href='#t' x='20' y='120'/>\n    <use href='#t' x='40' y='140'/>\n    <use href='#t' x='60' y='140'/>\n  </g>\n</svg>\n\n## 🎮 操作说明\n- **移动**: 键盘左右键 <code>←</code> <code>→</code>。\n- **旋转**: 键盘向上键 <code>↑</code>。\n- **加速下落**: 键盘向下键 <code>↓</code>。\n- **瞬间下落**: 空格键 (Space)。\n- **暂存 (Hold)**: Shift 键或 C 键。\n\n## ⚔️ 异盘乱斗模式\n一次性消除 2 行及以上，即可给对手的棋盘底部增加垃圾行（带一个随机缺口），疯狂攻击吧！"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "gomoku",
			Name:     `{"en": "Gomoku", "zh": "五子棋"}`,
			Overview: `{"en": "Classic 5-in-a-row strategy game. Challenge the AI or play online.", "zh": "经典的五子连珠策略游戏。单机挑战 AI 或联机对战。"}`,
			Rules:    `{"en": "# Gomoku Rules\n\nBe the first to get an unbroken row of five pieces horizontally, vertically, or diagonally.\n\n## 🎮 Controls\n- **Place Piece**: Click or tap an empty intersection on the board.", "zh": "# 五子棋规则\n\n黑白双方轮流落子，任意一方先在横线、竖线或斜线上形成连续的五颗棋子即可获胜。\n\n## 🎮 操作说明\n- **落子**: 点击棋盘上的空白交叉点即可落子。"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "codebreaker",
			Name:     `{"en": "Codebreaker", "zh": "1A2B 密码破译"}`,
			Overview: `{"en": "Logic deduction game. Find the secret numbers by matching A and B clues.", "zh": "经典逻辑推导游戏。根据A和B的提示推理出正确的数字密码。"}`,
			Rules:    `{"en": "# Codebreaker (1A2B) Rules\n\nGuess the secret non-repeating number code! For each guess, the system returns clues:\n- **A**: Correct digit in the correct position.\n- **B**: Correct digit but in the wrong position.\n\n## 🎮 Difficulties\n- **Easy**: 3-digit code.\n- **Medium**: 4-digit code.\n- **Hard**: 5-digit code.", "zh": "# 1A2B 密码破译规则\n\n通过逻辑推导找出系统生成的互不重复的数字密码！每次猜测后，系统会给出相应的提示：\n- **A**: 数字正确且位置也正确。\n- **B**: 数字正确但位置不正确。\n\n## 🎮 难度说明\n- **简单**: 3 位数密码。\n- **中等**: 4 位数密码。\n- **困难**: 5 位数密码。"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "math24",
			Name:     `{"en": "Math 24", "zh": "24点"}`,
			Overview: `{"en": "Use all 4 cards and arithmetic operators to get exactly 24.", "zh": "使用4张扑克牌和加减乘除，算出24。"}`,
			Rules:    `{"en": "# Math 24 Rules\n\nYou are given 4 numbers. You must use all 4 numbers exactly once, along with addition, subtraction, multiplication, and division, to arrive at a final result of 24.\n\n## 🎮 Controls\n- **Click**: Tap two numbers and an operator to combine them into a new number.\n- **Undo**: Tap the undo button to reverse your last step.", "zh": "# 24点规则\n\n利用随机给出的4个数字，使用加、减、乘、除，计算出结果为24。每张牌必须且只能使用一次。\n\n## 🎮 操作说明\n- **合并**: 依次点击两张数字牌和一个运算符，将它们合并成一个新的数字。\n- **撤销**: 算错了可以随时点击撤销按钮退回上一步。"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "drop2048",
			Name:     `{"en": "Drop 2048", "zh": "2048下落合成"}`,
			Overview: `{"en": "Drop numbers to merge them and reach 2048!", "zh": "拖动并下落数字，相同的数字碰撞会合成更大的数字！"}`,
			Rules:    `{"en": "# 🎮 Drop 2048\n\nWelcome to Extreme Drop 2048! This tests not only your brain but your limits!\n\n## 🎯 Gameplay\n1. **Control Blocks**: Blocks with numbers drop from above. Slide left/right to position them.\n2. **Merge Numbers**: When two identical numbers touch, they merge into a larger number (e.g., 2 + 2 = 4).\n3. **Chain Reactions**: Merging blocks may cause suspended blocks to fall, triggering epic combos!\n4. **Game Over**: If any column stacks to the very top of the screen, the game ends immediately.\n\n## 🔥 Dynamic Difficulty (Level 1 - 7)\nTo make the game more challenging, the drop speed and generated number sizes will dynamically increase based on your **SCORE**!\nYou can see your current **LEVEL** at the top left of the board:\n\n- **Level 1 (0 - 1000)**: 1.0s/drop (Beginner pace)\n- **Level 2 (1000 - 3000)**: 0.8s/drop (Speeding up)\n- **Level 3 (3000 - 6000)**: 0.6s/drop (Fast pace)\n- **Level 4 (6000 - 10000)**: 0.5s/drop (Test your reflexes)\n- **Level 5 (10k - 20k)**: 0.4s/drop (Intense! Larger blocks spawn frequently)\n- **Level 6 (20k - 40k)**: 0.3s/drop (Extreme speed)\n- **Level 7 (40k+)**: 0.2s/drop (Hell difficulty!)\n\n> **💡 Pro Tip**:\n> After Level 5, the system will significantly increase the chance of spawning 16, 32, 64, or 128 blocks. Try to keep the larger numbers at the bottom and keep your columns flat to survive the storm! Good luck!", "zh": "# 🎮 2048 下落合成\n\n欢迎来到极速版《2048 下落合成》！这不仅考验你的脑力，更考验你的极限反应！\n\n## 🎯 基础玩法\n1. **控制方块**：上方会随机掉落带有数字的方块，你可以左右滑动来控制它们下落的列。\n2. **合成大数**：当两个相同的数字碰撞在一起时，就会自动合成为一个更大的数字（例如：2 + 2 = 4）。\n3. **连锁反应**：一次消除可能会导致上方悬空的方块继续下落，引发爽快的连续消除！\n4. **游戏结束**：如果任意一列的方块堆叠到了最顶部（溢出屏幕），游戏立即结束。\n\n## 🔥 动态难度系统（Level 1 - 7）\n为了让游戏更具挑战性，方块的下落速度和生成数字的大小，将随着你的**得分（SCORE）**动态提升！\n你可以在游戏棋盘的左上角实时看到当前的 **LEVEL**：\n\n- **Level 1 (0 - 1000分)**：1.0秒/格（新手熟悉阶段，慢速）\n- **Level 2 (1000 - 3000分)**：0.8秒/格（开始提速）\n- **Level 3 (3000 - 6000分)**：0.6秒/格（节奏明显加快）\n- **Level 4 (6000 - 10000分)**：0.5秒/格（手速考验）\n- **Level 5 (1万 - 2万分)**：0.4秒/格（刺激时刻，大数字方块开始高频生成！）\n- **Level 6 (2万 - 4万分)**：0.3秒/格（极速坠落）\n- **Level 7 (4万分以上)**：0.2秒/格（传说中的地狱难度！）\n\n> **💡 高分技巧**：\n> 到了 Level 5 之后，由于下落速度极快，系统会大幅提高直接生成 16、32 甚至是 64、128 大数字方块的概率。请尽量把大的数字保持在底部，保持列的平整，以迎接狂风暴雨般的下落！祝你好运！"}`,
			Config:   `{}`,
			IsActive: true,
		},
		{
			ID:       "block",
			Name:     `{"en": "Block Puzzle", "zh": "方块消除"}`,
			Overview: `{"en": "Place blocks to clear lines. Simple but addictive!", "zh": "拖拽方块，填满行列即可消除得分。"}`,
			Rules:    `{"en": "# Block Puzzle Rules\n\nWelcome to X-Game Block Puzzle! Drag and drop various shapes onto the grid to clear lines and rack up points.\n\n## 🎯 Objective\nPlace the given blocks onto the board. When you completely fill a horizontal row or a vertical column, that line will be cleared, earning you points and freeing up space. The game ends when you run out of space to place any of your remaining blocks.\n\n## 🎮 Controls\n- **Drag & Drop**: Use your mouse or finger to drag a block from the bottom panel into the grid.\n\n## 💡 Scoring Rules\n- **Basic Placement**: Each block placed gives you points equal to the number of cells it occupies.\n- **Line Clears**: Clearing lines gives huge bonus points! The more lines you clear at once, the exponentially larger the score multiplier! (e.g. 1 line = 20, 2 lines = 40, 3 lines = 80, 4 lines = 160).\n\n## 🎲 Game Modes\n\n### Single Player (Survival)\nA classic endless mode.\n- Play at your own pace. The pieces generated are completely random. \n- Try to survive as long as possible and beat your own high score!\n\n### PK Score (Survival & Score)\nCompete against other players in real-time!\n- **Asymmetric Generation**: Everyone plays on their own board. The generated blocks are completely **independent and randomly generated** for each player, so luck and adaptability both play a huge role!\n- **Scoring**: You play until you run out of moves (die). \n- **Victory Condition**: The player who survives the longest and accumulates the **highest score** before everyone dies wins the match!", "zh": "# 方块消除玩法规则\n\n欢迎来到 X-Game 方块消除！将给出的各种形状方块拖入棋盘，填满行列即可消除得分。\n\n## 🎯 游戏目标\n将方块放置在棋盘中。当你完全填满任意一整行或一整列时，该行/列就会被消除，为你腾出空间并获得积分。当下方给出的方块中，没有任何一个能够放入棋盘时，游戏结束（死局）。\n\n## 🎮 操作说明\n- **拖拽放置**: 用鼠标或手指按住底部的方块，将其拖入棋盘的空白位置。\n\n## 💡 积分计算\n- **基础得分**: 每次成功放置方块，方块包含几个小格就获得几分。\n- **消除奖励**: 消除行列会获得高额连乘奖励！同时消除的行列数越多，得分翻倍越恐怖！（例如：消除1行20分，2行40分，3行80分，4行160分）。\n\n## 🎲 游戏模式\n\n### 单人无尽生存 (Single Player)\n经典的无尽挑战模式。\n- 按自己的节奏游玩，不断刷新自己的最高分记录！\n- 方块碎片完全随机生成，考验你的空间规划能力。\n\n### 积分乱斗 (PK Score)\n与其他玩家实时对战，比拼谁能活得更久、得分更高！\n- **独立随机生成**: 每个玩家在各自独立的棋盘上游戏，系统给每个人生成的方块碎片是**完全随机且不同的**，因此运气与应变能力缺一不可！\n- **同场竞技**: 拼尽全力消除方块获取最高分。如果因为没有空间放置而死亡，你将进入观战模式。\n- **获胜条件**: 直到房间内所有玩家都死亡后，系统将进行结算，**总分最高**的玩家获得最终胜利！"}`,
			Config:   `{}`,
			IsActive: true,
		},
	}

	for _, game := range games {
		// FirstOrCreate ensures the row exists without overwriting VisitCount.
		DB.Where(domain.GameConfig{ID: game.ID}).FirstOrCreate(&game)

		// Updates will update the configuration fields while leaving dynamic stats like VisitCount intact.
		DB.Model(&domain.GameConfig{}).Where("id = ?", game.ID).Updates(map[string]interface{}{
			"name":      game.Name,
			"overview":  game.Overview,
			"rules":     game.Rules,
			"config":    game.Config,
			"is_active": game.IsActive,
		})
	}

	var userCount int64
	DB.Model(&domain.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err == nil {
			defaultAdmin := domain.User{
				Username: "admin",
				Password: string(hashedPassword),
				Role:     domain.RoleAdmin,
				Status:   domain.StatusActive,
			}
			DB.Create(&defaultAdmin)
			log.Println("Created default admin user (admin / admin123)")
		} else {
			log.Printf("Failed to hash password for default admin: %v", err)
		}
	}
}

func SeedSettings() {
	defaultSettings := []domain.SystemSetting{
		{Key: "site_maintenance", Value: "false"},
		{Key: "maintenance_message", Value: ""},
		{Key: "simulator_enabled", Value: "true"},
		{Key: "registration_enabled", Value: "true"},
		{Key: "ad_interstitial_frequency", Value: "3"},
		{Key: "ad_interstitial_daily_limit", Value: "3"},
		{Key: "ad_pc_left_slot", Value: ""},
		{Key: "ad_pc_right_slot", Value: ""},
		{Key: "ad_mobile_lobby_slot", Value: ""},
	}

	for _, setting := range defaultSettings {
		DB.Where(domain.SystemSetting{Key: setting.Key}).FirstOrCreate(&setting)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}


