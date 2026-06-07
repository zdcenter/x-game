package main

import (
	"fmt"
	"log"
	"x-game/internal/domain"
	"x-game/pkg/db"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	database, err := gorm.Open(sqlite.Open("../x-game.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	enRules := `# Sliding Puzzle

Welcome to the classic Sliding Puzzle! Test your logic, planning, and raw speed.

<svg width='240' height='240' viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-2xl'>
  <rect x='0' y='0' width='240' height='240' rx='16' fill='#1e293b' stroke='#334155' stroke-width='2' />
  <defs>
    <g id='tile'>
      <rect x='0' y='0' width='46' height='46' rx='8' fill='#f8fafc' stroke='#cbd5e1' stroke-width='2' />
      <path d='M 0 38 L 0 46 A 8 8 0 0 0 8 46 L 46 46 L 46 38 Z' fill='#94a3b8' opacity='0.4' />
      <path d='M 38 0 L 46 0 L 46 46 L 38 46 Z' fill='#94a3b8' opacity='0.3' />
    </g>
  </defs>
  <g transform='translate(14, 14)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>1</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>2</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>3</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>4</text>
  </g>
  <g transform='translate(14, 68)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>5</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>6</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>7</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>8</text>
  </g>
  <g transform='translate(14, 122)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>9</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>10</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>11</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>12</text>
  </g>
  <g transform='translate(14, 176)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>13</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>14</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>15</text>
    <rect x='162' y='0' width='46' height='46' rx='8' fill='#0f172a' stroke='#1e293b' stroke-width='2' />
  </g>
</svg>

## 🎯 Objective
Arrange the scrambled numbered tiles into ascending order (as shown above) with the empty space at the **bottom right**.

## 🎮 Controls
- **Slide**: Click or tap any tile adjacent to the empty space to slide it into the gap.
- **Multi-Slide**: You can slide an entire row or column of blocks at once by clicking the furthest tile in that line connected to the gap.

## 🎲 Game Modes
### Single Player
A classic practice mode to challenge your own personal best times. Supports 4x4, 5x5, and 6x6 boards.

### PK / Speed Mode
Battle online against other players!
- **Fair Match**: Everyone receives the *exact same* shuffled board at the start.
- **Victory**: Pure skill, no luck involved. The first player to completely solve the board wins instantly!`

	zhRules := `# 数字华容道 (Sliding Puzzle)

欢迎来到《数字华容道》！这是一款经典的滑块拼图游戏，不仅考验逻辑推演，更是手速与眼力的终极对决。

<svg width='240' height='240' viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg' class='mx-auto my-6 drop-shadow-2xl'>
  <rect x='0' y='0' width='240' height='240' rx='16' fill='#1e293b' stroke='#334155' stroke-width='2' />
  <defs>
    <g id='tile'>
      <rect x='0' y='0' width='46' height='46' rx='8' fill='#f8fafc' stroke='#cbd5e1' stroke-width='2' />
      <path d='M 0 38 L 0 46 A 8 8 0 0 0 8 46 L 46 46 L 46 38 Z' fill='#94a3b8' opacity='0.4' />
      <path d='M 38 0 L 46 0 L 46 46 L 38 46 Z' fill='#94a3b8' opacity='0.3' />
    </g>
  </defs>
  <g transform='translate(14, 14)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>1</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>2</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>3</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>4</text>
  </g>
  <g transform='translate(14, 68)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>5</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>6</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>7</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>8</text>
  </g>
  <g transform='translate(14, 122)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>9</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>10</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>11</text>
    <use href='#tile' x='162' y='0' /><text x='185' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>12</text>
  </g>
  <g transform='translate(14, 176)'>
    <use href='#tile' x='0' y='0' /><text x='23' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>13</text>
    <use href='#tile' x='54' y='0' /><text x='77' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>14</text>
    <use href='#tile' x='108' y='0' /><text x='131' y='31' font-family='sans-serif' font-size='22' font-weight='900' fill='#0f172a' text-anchor='middle'>15</text>
    <rect x='162' y='0' width='46' height='46' rx='8' fill='#0f172a' stroke='#1e293b' stroke-width='2' />
  </g>
</svg>

## 🎯 游戏目标
将打乱的数字方块，**按从小到大的顺序重新排列整齐**（如上图所示），并将空格留在棋盘的**右下角**。

## 🎮 操作说明
- **移动**: 点击（或在手机上轻触）与空格相邻的数字方块，即可将其移入空格中。
- **连推**: 如果一行或一列中有多块方块与空格相连，你可以直接点击最远端的那块，所有相连的方块会一次性整体滑动，极大提升操作速度！

## 🎲 游戏模式
### 单机模式 (Single)
经典的休闲与练习模式，挑战自己的最快解题记录。支持不同难度（4x4, 5x5, 6x6 网格）。

### 竞速模式 (PK / Speed)
在线与其他玩家 1v1 或多人竞技。
- **完全公平**: 所有人开局拿到的是**完全相同**的打乱棋盘！
- **胜负判定**: 没有任何运气成分，纯粹比拼规划路线的脑力和点击的极限手速，**最先复原拼图的玩家直接获得胜利！**`

    jsonStr := fmt.Sprintf(`{"en": %#v, "zh": %#v}`, enRules, zhRules)

	var game domain.GameConfig
	if err := database.Where("id = ?", "sliding").First(&game).Error; err != nil {
		log.Fatal("Game not found", err)
	}
	
	game.Rules = jsonStr
	if err := database.Save(&game).Error; err != nil {
		log.Fatal("Failed to save rules", err)
	}

	fmt.Println("Successfully updated sliding puzzle rules!")
}
