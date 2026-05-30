package main

import (
	"encoding/json"
	"log"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()

	games := []struct {
		ID string
		EN string
		ZH string
	}{
		{
			ID: "sudoku",
			EN: "# Sudoku Rules\n\nWelcome to X-Game Sudoku!\n\n## 🎯 Objective\nFill the 9x9 grid so that each column, each row, and each of the nine 3x3 subgrids contain all of the digits from 1 to 9.\n\n## 🎮 Controls\n- Select a cell by clicking on it.\n- Use the number pad below the board or your keyboard to fill in a number.\n- Use the Notes feature to keep track of possible numbers for a cell.\n\n## 🎲 Game Modes\n\n### Single Player\nA relaxed, classic experience at your own pace.\n\n### PK Steal\nSteal the board!\n- When you fill a number, if it's correct, it belongs to your color.\n- If you fill incorrectly, you get a time penalty.\n- The player with the most tiles filled when the board is complete wins.\n\n### PK Speed\nCompete against others to finish the board first!\n- Everyone solves their own identical board.\n- The first player to successfully complete the board wins.",
			ZH: "# 数独玩法规则\n\n欢迎来到 X-Game 数独！\n\n## 🎯 游戏目标\n在 9x9 的网格中填入数字，使得每一行、每一列以及每一个 3x3 的宫格内都包含数字 1 到 9，且不重复。\n\n## 🎮 操作说明\n- 点击选中空白格子。\n- 使用下方的数字键盘或物理键盘填入数字。\n- 使用“笔记”功能记录可能填入的数字。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n经典的单机数独，按自己的节奏解开谜题。\n\n### 抢占模式 (PK Steal)\n在同一个棋盘上互相抢占地盘！\n- 填入正确的数字，该格子就属于你的颜色。\n- 填入错误会受到冻结时间惩罚。\n- 棋盘填满时，占据格子最多的玩家获胜。\n\n### 竞速模式 (PK Speed)\n与对手比拼解题速度！\n- 所有人拥有相同的独立棋盘。\n- 最先正确填满整个棋盘的玩家获胜。",
		},
		{
			ID: "hexa",
			EN: "# Hexa Puzzle Rules\n\nWelcome to X-Game Hexa!\n\n## 🎯 Objective\nDrag and drop hexagonal blocks onto the board to form complete lines in any of the three directions. Completed lines will disappear and free up space.\n\n## 🎮 Controls\n- Drag the pieces from the bottom panel and drop them onto the board.\n- When no more pieces can be placed, the game ends.\n\n## 🎲 Game Modes\n\n### Single Player\nTry to survive as long as possible and get the highest score.\n\n### PK Score\nCompete against other players for the highest score!\n- Clearing lines gives you points.\n- The last player standing or the one with the highest score wins.",
			ZH: "# 六边形消除玩法规则\n\n欢迎来到 X-Game 六边形消除！\n\n## 🎯 游戏目标\n将六边形方块拖放到棋盘中，在三个方向的任意一个方向上填满一条直线即可消除得分，并腾出空间。\n\n## 🎮 操作说明\n- 从底部面板拖动方块，放置到棋盘的空白位置。\n- 当无法放置任何可用方块时，游戏结束。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n尽力消除更多的线条，争取获得更高的分数！\n\n### 积分对战 (PK Score)\n与其他玩家同场竞技，比拼最终得分！\n- 连续消除可以获得更高分数。\n- 坚持到最后或最终得分最高的玩家获胜。",
		},
		{
			ID: "tetris",
			EN: "# Tetris Rules\n\nWelcome to X-Game Tetris!\n\n## 🎯 Objective\nRotate and arrange falling blocks (Tetrominoes) to form complete horizontal lines. Completed lines disappear, giving you points and freeing up space.\n\n## 🎮 Controls\n- **Arrow Left/Right**: Move piece\n- **Arrow Up**: Rotate piece\n- **Arrow Down**: Soft drop\n- **Space**: Hard drop\n- **Shift / C**: Hold piece\n\n## ⚡ Speed Levels\n- For every **10 lines** you clear, the **Speed Level** increases by 1.\n- As the Speed Level increases, blocks will fall faster, requiring quicker reflexes!\n\n## 🎲 Game Modes\n\n### Single Player\nClassic Tetris experience. Level up, go faster, and get a high score.\n\n### PK Attack\nBattle against friends!\n- Clearing multiple lines at once (Combos, Tetrises) sends \"garbage lines\" to your opponents.\n- The last player whose screen doesn't fill up to the top wins.\n\n### PK Score (Same Board Competitive)\nCompete on the exact same board sequence!\n- Both players receive the identical sequence of pieces.\n- Clearing lines earns points, but does NOT send garbage to the opponent.\n- The player with the highest score or who survives the longest wins.",
			ZH: "# 俄罗斯方块玩法规则\n\n欢迎来到 X-Game 俄罗斯方块！\n\n## 🎯 游戏目标\n控制下落的方块，使它们在底部拼出完整的横条。完整的横条会消除并得分。\n\n## 🎮 操作说明\n- **左/右方向键**: 左右移动方块\n- **上方向键**: 旋转方块\n- **下方向键**: 软下降（加速下落）\n- **空格键**: 硬下降（直接到底）\n- **Shift / C 键**: 暂存当前方块\n\n## ⚡ 速度等级机制\n- 每累计消除 **10 行**，游戏的 **速度等级 (Speed Level)** 就会提升 1 级。\n- 随着速度等级的提升，方块自然下落的速度会越来越快，极大地考验你的反应极限！\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n经典的单机挑战，随着等级提升方块下落速度会越来越快，挑战最高分！\n\n### 攻击对战 (PK Attack)\n与好友进行对战！\n- 一次性消除多行（如连击、Tetris）会给对手发送“垃圾行”进行攻击。\n- 当方块堆积到屏幕顶部无法继续时即被淘汰，坚持到最后的玩家获胜。\n\n### 同盘竞技 (PK Score)\n使用完全相同的方块序列进行公平对决！\n- 双方玩家将获得完全一致的方块掉落顺序。\n- 消除行只增加分数，**不会**给对手发送垃圾行。\n- 坚持到最后或最终得分最高的玩家获胜。",
		},
		{
			ID: "sliding",
			EN: "# Sliding Puzzle Rules\n\nWelcome to X-Game Sliding!\n\n## 🎯 Objective\nRearrange the scrambled tiles back into numerical order (1 to N, left to right, top to bottom) with the empty space at the very end.\n\n## 🎮 Controls\n- Click or tap a tile adjacent to the empty space to slide it into the space.\n- You can also swipe on the board (or use mouse drag) to move multiple tiles at once in a row or column.\n\n## 🎲 Game Modes\n\n### Single Player\nSolve the puzzle at your own pace. Try to do it with the fewest moves and fastest time!\n\n### PK Speed\nCompete against others to solve the exact same scrambled puzzle first!",
			ZH: "# 华容道玩法规则\n\n欢迎来到 X-Game 华容道（数字推盘）！\n\n## 🎯 游戏目标\n将打乱的数字方块重新排列成从左到右、从上到下的顺序（1 到 N），并将空格留在最后。\n\n## 🎮 操作说明\n- 点击或触摸空格旁边的数字方块，将其移动到空格处。\n- 也可以通过滑动屏幕（或鼠标拖拽），一次性移动同一行或同一列的多个方块。\n\n## 🎲 游戏模式\n\n### 单机模式 (Single)\n按自己的节奏解开谜题，挑战最少步数和最短时间！\n\n### 竞速模式 (PK Speed)\n与对手比拼解题速度！\n- 所有人面对的是完全相同打乱顺序的棋盘。\n- 最先将棋盘还原的玩家获胜。",
		},
	}

	for _, g := range games {
		rulesMap := map[string]string{
			"en": g.EN,
			"zh": g.ZH,
		}

		rulesBytes, err := json.Marshal(rulesMap)
		if err != nil {
			log.Printf("Failed to marshal rules for %s: %v", g.ID, err)
			continue
		}

		var gameConfig domain.GameConfig
		if err := db.DB.First(&gameConfig, "id = ?", g.ID).Error; err != nil {
			log.Printf("Failed to find game %s: %v", g.ID, err)
			continue
		}

		gameConfig.Rules = string(rulesBytes)
		if err := db.DB.Save(&gameConfig).Error; err != nil {
			log.Printf("Failed to update game %s: %v", g.ID, err)
			continue
		}

		log.Printf("Successfully updated %s rules in database", g.ID)
	}
}
