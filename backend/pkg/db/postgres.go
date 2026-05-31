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
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed default data
	Seed()
	SeedSudoku()

	log.Println("Database connected and migrated successfully")
}

func Seed() {
	defaultMinesweeper := domain.GameConfig{
		ID:       "minesweeper",
		Name:     `{"en": "Minesweeper", "zh": "扫雷"}`,
		Overview: `{"en": "A classic puzzle game. Tap to dig, Long press to flag.", "zh": "经典逻辑益智游戏。点击挖开，长按插旗。"}`,
		Rules:    `{"en": "# Minesweeper Rules\n\nWelcome to X-Game Minesweeper! The classic game of logic, now with multiplayer competitive modes.\n\n## 🎯 Objective\nClear the minefield without detonating any mines! The game is won when all safe cells are revealed, or all mines are correctly flagged.\n\n## 🎮 Controls\n- **Reveal (Dig)**: Left-click (or tap) on a hidden cell.\n- **Flag**: Right-click (or long press) on a cell to mark it as a mine.\n\n## 🎲 Game Modes\n\n### Single Player\nA relaxed, classic experience.\n- **First Click Safe**: Your first click will *always* reveal a large safe area to get you started!\n- **Instant Death**: Stepping on a mine ends the game immediately.\n\n### PK / Speed Mode\nCompete against others to finish the board first!\n- **Fair Start**: The game automatically reveals a shared safe zone for all players at the exact same moment.\n- **Penalty System**: Stepping on a mine doesn't kill you, but it freezes your screen for a few seconds!", "zh": "# 扫雷玩法规则\n\n欢迎来到 X-Game 扫雷！这不仅是经典的逻辑推理游戏，更加入了刺激的多人竞技模式。\n\n## 🎯 游戏目标\n避开所有地雷，找出所有安全的格子！当所有非雷区域被揭开，或所有地雷被正确插旗标记时，即可获胜。\n\n## 🎮 操作说明\n- **挖开 (揭示)**: 鼠标左键（或在手机上单击）未揭开的格子。\n- **插旗 (标记)**: 鼠标右键（或在手机上长按）格子，将其标记为地雷。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n经典的休闲体验，适合练手。\n- **首击必空**: 你的第一次点击绝对不会踩雷，并且必定为你展开一片安全的空地！\n- **一击毙命**: 只要踩到一次地雷，游戏立即结束。\n\n### 竞速模式 (PK / Speed)\n与其他玩家同场竞技，比拼手速与脑力！\n- **公平开局**: 倒计时结束时，系统会自动为所有人揭开同一块相同的安全区域，确保竞技的绝对公平。\n- **惩罚机制**: 踩到地雷不会立刻死亡，但会受到**冻结惩罚**（屏幕会被锁定数秒无法操作），要格外小心！"}`,
		Config:   `{"penaltySeconds": 3}`,
		IsActive: true,
	}
	// Use FirstOrCreate to ensure it is inserted if missing
	DB.Where(domain.GameConfig{ID: "minesweeper"}).FirstOrCreate(&defaultMinesweeper)

	defaultSudoku := domain.GameConfig{
		ID:       "sudoku",
		Name:     `{"en": "Sudoku", "zh": "数独"}`,
		Overview: `{"en": "The classic numbers puzzle. Play solo or race against friends.", "zh": "经典数字逻辑游戏。单机闯关或好友联机竞速。"}`,
		Rules:    `{"en": "# Sudoku Rules\n\nFill the 9x9 grid with digits so that each column, each row, and each of the nine 3x3 subgrids that compose the grid contain all of the digits from 1 to 9.\n\n## 🎮 Controls\n- **Select**: Tap a cell to select it.\n- **Input**: Use the on-screen numpad or physical keyboard (1-9) to input numbers.\n- **Notes (Pencil)**: Toggle Note mode to draft possible numbers in an empty cell.\n- **Erase**: Remove a number or note from the selected cell.", "zh": "# 数独玩法规则\n\n将数字 1-9 填入 9x9 的网格中，使得每一行、每一列以及每一个 3x3 的粗线宫格内，数字 1-9 都刚好出现一次，不重复也不遗漏。\n\n## 🎮 操作说明\n- **选择**: 点击选中一个格子。\n- **输入**: 点击屏幕下方的数字键盘，或使用物理键盘的 1-9 填入数字。\n- **笔记 (铅笔)**: 开启笔记模式后，可以在空白格内记录可能的候选数字。\n- **擦除**: 清除选中格子内的数字或笔记。"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "sudoku"}).FirstOrCreate(&defaultSudoku)

	defaultSliding := domain.GameConfig{
		ID:       "sliding",
		Name:     `{"en": "Sliding Puzzle", "zh": "数字华容道"}`,
		Overview: `{"en": "Classic 15-puzzle. Slide tiles to order them.", "zh": "经典数字滑块拼图。打乱后复原它。"}`,
		Rules:    `{"en": "# Sliding Puzzle Rules\n\nSlide the numbered tiles into sequential order.\n\n## 🎮 Controls\n- **Move**: Click or tap a tile adjacent to the empty space to slide it.", "zh": "# 数字华容道玩法规则\n\n将数字按顺序从小到大排列。\n\n## 🎮 操作说明\n- **移动**: 点击与空格相邻的方块即可将其移入空格。"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "sliding"}).FirstOrCreate(&defaultSliding)

	defaultHexa := domain.GameConfig{
		ID:       "hexa",
		Name:     `{"en": "Hexa Puzzle", "zh": "六边形消除"}`,
		Overview: `{"en": "Place hex blocks to clear lines in 3 directions.", "zh": "拖拽六边形方块，填满任意直线即可消除得分。"}`,
		Rules:    `{"en": "# Hexa Puzzle Rules\n\nDrag blocks to the grid. Clear lines in any of the 3 directions.\n\n## 🎮 Controls\n- **Drag & Drop**: Move pieces to the board.", "zh": "# 六边形消除玩法规则\n\n拖拽随机出现的六边形碎片到大棋盘上，填满任意一条直线（横向或斜向）即可消除得分。\n\n## 🎮 操作说明\n- **拖拽**: 将屏幕下方的方块拖入棋盘空位。"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "hexa"}).FirstOrCreate(&defaultHexa)

	defaultTetris := domain.GameConfig{
		ID:       "tetris",
		Name:     `{"en": "Tetris Battle", "zh": "俄罗斯方块对战"}`,
		Overview: `{"en": "Classic block-stacking game. Clear lines to send garbage to your opponent!", "zh": "经典方块堆叠游戏。消除多行即可向对手发送垃圾行！"}`,
		Rules:    `{"en": "# Tetris Battle Rules\n\nStack falling blocks to clear lines.\n\n## 🎮 Controls\n- **Move**: Left/Right arrows or swipe.\n- **Rotate**: Up arrow or tap rotate button.\n- **Soft Drop**: Down arrow.\n- **Hard Drop**: Spacebar.\n- **Hold**: Shift or C.\n\n## ⚔️ PK Attack Mode\nClear 2 or more lines simultaneously to send garbage lines to your opponent's board!", "zh": "# 俄罗斯方块对战规则\n\n拼合下落的方块，填满一整行即可消除。\n\n## 🎮 操作说明\n- **移动**: 左右方向键或滑动屏幕。\n- **旋转**: 向上方向键或点击旋转按钮。\n- **加速下落**: 向下方向键。\n- **瞬间下落**: 空格键。\n- **暂存 (Hold)**: Shift 键或 C 键。\n\n## ⚔️ 异盘乱斗模式\n一次性消除 2 行及以上，即可给对手的棋盘底部增加垃圾行（带一个随机缺口），疯狂攻击吧！"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "tetris"}).FirstOrCreate(&defaultTetris)

	defaultGomoku := domain.GameConfig{
		ID:       "gomoku",
		Name:     `{"en": "Gomoku", "zh": "五子棋"}`,
		Overview: `{"en": "Classic 5-in-a-row strategy game. Challenge the AI or play online.", "zh": "经典的五子连珠策略游戏。单机挑战 AI 或联机对战。"}`,
		Rules:    `{"en": "# Gomoku Rules\n\nBe the first to get an unbroken row of five pieces horizontally, vertically, or diagonally.\n\n## 🎮 Controls\n- **Place Piece**: Click or tap an empty intersection on the board.", "zh": "# 五子棋规则\n\n黑白双方轮流落子，任意一方先在横线、竖线或斜线上形成连续的五颗棋子即可获胜。\n\n## 🎮 操作说明\n- **落子**: 点击棋盘上的空白交叉点即可落子。"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "gomoku"}).FirstOrCreate(&defaultGomoku)

	defaultCodebreaker := domain.GameConfig{
		ID:       "codebreaker",
		Name:     `{"en": "Codebreaker", "zh": "1A2B 密码破译"}`,
		Overview: `{"en": "Logic deduction game. Find the secret numbers by matching A and B clues.", "zh": "经典逻辑推导游戏。根据A和B的提示推理出正确的数字密码。"}`,
		Rules:    `{"en": "# Codebreaker (1A2B) Rules\n\nGuess the secret non-repeating number code! For each guess, the system returns clues:\n- **A**: Correct digit in the correct position.\n- **B**: Correct digit but in the wrong position.\n\n## 🎮 Difficulties\n- **Easy**: 3-digit code.\n- **Medium**: 4-digit code.\n- **Hard**: 5-digit code.", "zh": "# 1A2B 密码破译规则\n\n通过逻辑推导找出系统生成的互不重复的数字密码！每次猜测后，系统会给出相应的提示：\n- **A**: 数字正确且位置也正确。\n- **B**: 数字正确但位置不正确。\n\n## 🎮 难度说明\n- **简单**: 3 位数密码。\n- **中等**: 4 位数密码。\n- **困难**: 5 位数密码。"}`,
		Config:   `{}`,
		IsActive: true,
	}
	DB.Where(domain.GameConfig{ID: "codebreaker"}).FirstOrCreate(&defaultCodebreaker)


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

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func SeedSudoku() {
	var count int64
	DB.Model(&domain.SudokuPuzzle{}).Count(&count)
	if count == 0 {
		puzzles := []domain.SudokuPuzzle{
			{ID: "sudoku-easy-1", Difficulty: domain.DifficultyEasy, Puzzle: "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79", Solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"},
			{ID: "sudoku-easy-2", Difficulty: domain.DifficultyEasy, Puzzle: ".4.1....9....9..2...6.7.1...8..4...6..2...8..5...2..7...4.3.5...3..5....7....1.4.", Solution: "247165389815394726956278134389742651462513897571826973194637582638951247725489613"},
			{ID: "sudoku-medium-1", Difficulty: domain.DifficultyMedium, Puzzle: "....24....5.8.....9..1.....3.4.6.....6.....3.....8.2.1.....3..2.....7.4....41....", Solution: "681724593753891426924156783314562978267948135598387261479635812832179645156412357"},
			{ID: "sudoku-hard-1", Difficulty: domain.DifficultyHard, Puzzle: "...5.......1..2..3..4.3.5..5..4.1..6..7...2..8..6.7..9..2.5.4..6..8..1.......9...", Solution: "293568714751942683864137592538421976147396258829687349912753468675814129384279835"},
		}
		for _, p := range puzzles {
			DB.Create(&p)
		}
		log.Println("Seeded default Sudoku puzzles")
	}
}
