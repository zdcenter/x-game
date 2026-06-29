import { DemoConfig, DemoCell } from '../components/game-step-player/game-step-player.component';

const TILE = 'bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-md text-amber-500';
const TILE_OK = 'bg-emerald-500/20 border border-emerald-500/50 shadow-md text-emerald-500';
const EMPTY = 'bg-[var(--color-bg-main)] shadow-inner border border-transparent border-dashed border-[var(--color-border-card)]/50';

export const slidingDemoConfig: DemoConfig = {
  gameId: 'sliding',
  titleEn: 'How to Play Sliding Puzzle (Step-by-Step)',
  titleZh: '数字华容道：分步图解',
  steps: [
    {
      descriptionEn: 'Step 1: The goal is to arrange tiles in numerical order from left to right, top to bottom. The empty space lets you slide adjacent tiles.',
      descriptionZh: '第一步：游戏目标是将数字块从左到右、从上到下按顺序排列。空格是你移动方块的唯一途径。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '8', classes: TILE }, { text: '5', classes: TILE }],
        [{ text: '7', classes: TILE_OK }, { text: '', classes: EMPTY }, { text: '6', classes: TILE }]
      ]
    },
    {
      descriptionEn: 'Step 2: Notice the tiles adjacent to the empty space (8 and 6). These are the only tiles you can currently move.',
      descriptionZh: '第二步：观察与空格直接相邻的方块（数字 8 和 6）。目前你只能移动这两个方块。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '8', classes: TILE, isHighlight: true }, { text: '5', classes: TILE }],
        [{ text: '7', classes: TILE_OK }, { text: '', classes: EMPTY, isHighlight: true }, { text: '6', classes: TILE, isHighlight: true }]
      ]
    },
    {
      descriptionEn: 'Step 3: Slide the 8 down into the empty space. This opens up a new space in the middle.',
      descriptionZh: '第三步：将数字 8 向下移入空格。这样中间就腾出了一个新的空格。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '', classes: EMPTY, isHighlight: true }, { text: '5', classes: TILE }],
        [{ text: '7', classes: TILE_OK }, { text: '8', classes: TILE_OK, isHighlight: true }, { text: '6', classes: TILE }]
      ]
    },
    {
      descriptionEn: 'Step 4: Now, slide the 5 to the left into the new empty space.',
      descriptionZh: '第四步：现在，将数字 5 向左移入这个新的空格中。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '5', classes: TILE, isHighlight: true }, { text: '', classes: EMPTY, isHighlight: true }],
        [{ text: '7', classes: TILE_OK }, { text: '8', classes: TILE_OK }, { text: '6', classes: TILE }]
      ]
    },
    {
      descriptionEn: 'Step 5: Finally, slide the 6 up into the empty space on the right.',
      descriptionZh: '第五步：最后，将数字 6 向上滑入右侧的空格中。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '5', classes: TILE_OK }, { text: '6', classes: TILE, isHighlight: true }],
        [{ text: '7', classes: TILE_OK }, { text: '8', classes: TILE_OK }, { text: '', classes: EMPTY, isHighlight: true }]
      ]
    },
    {
      descriptionEn: 'Step 6: Victory! All numbers are now in order (1 through 8) and the empty space is in the bottom right corner.',
      descriptionZh: '第六步：胜利！所有数字都已按 1 到 8 的顺序排列整齐，且空格位于右下角。',
      board: [
        [{ text: '1', classes: TILE_OK }, { text: '2', classes: TILE_OK }, { text: '3', classes: TILE_OK }],
        [{ text: '4', classes: TILE_OK }, { text: '5', classes: TILE_OK }, { text: '6', classes: TILE_OK }],
        [{ text: '7', classes: TILE_OK }, { text: '8', classes: TILE_OK }, { text: '', classes: EMPTY }]
      ]
    }
  ]
};

// --- Sudoku ---
const S_CELL = 'bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-sm text-[var(--color-text-main)]';
const S_FIXED = 'bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-inner text-amber-600 font-bold';
const S_ERR = 'bg-red-500/20 border border-red-500/50 shadow-sm text-red-500';
const S_OK = 'bg-emerald-500/20 border border-emerald-500/50 shadow-sm text-emerald-500';

export const sudokuDemoConfig: DemoConfig = {
  gameId: 'sudoku',
  titleEn: 'How to Play Sudoku',
  titleZh: '数独：基础规则演示',
  steps: [
    {
      descriptionEn: 'A Sudoku grid is made of 9 rows, 9 columns, and 9 3x3 sub-grids. Here is a miniature 4x4 example.',
      descriptionZh: '数独通常由 9 行、9 列和 9 个 3x3 宫格组成。这里用一个迷你的 4x4 网格来演示基本原理。',
      board: [
        [{ text: '1', classes: S_FIXED }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '4', classes: S_FIXED }],
        [{ text: '', classes: S_CELL }, { text: '2', classes: S_FIXED }, { text: '3', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '', classes: S_CELL }, { text: '3', classes: S_FIXED }, { text: '2', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '4', classes: S_FIXED }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '1', classes: S_FIXED }]
      ]
    },
    {
      descriptionEn: 'Rule: No number can repeat in the same row. If we place a 2 here, it conflicts with the 2 in the same row!',
      descriptionZh: '规则：同一行不能有重复数字。如果我们在这里填入 2，就会和同一行的 2 产生冲突！',
      board: [
        [{ text: '1', classes: S_FIXED }, { text: '2', classes: S_ERR, isHighlight: true }, { text: '', classes: S_CELL }, { text: '4', classes: S_FIXED }],
        [{ text: '', classes: S_CELL }, { text: '2', classes: S_FIXED, isHighlight: true }, { text: '3', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '', classes: S_CELL }, { text: '3', classes: S_FIXED }, { text: '2', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '4', classes: S_FIXED }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '1', classes: S_FIXED }]
      ]
    },
    {
      descriptionEn: 'Rule: No number can repeat in the same column. Placing a 4 here conflicts with the 4 in the same column.',
      descriptionZh: '规则：同一列不能有重复数字。在这里填入 4，会和同一列底部的 4 冲突。',
      board: [
        [{ text: '1', classes: S_FIXED }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '4', classes: S_FIXED }],
        [{ text: '4', classes: S_ERR, isHighlight: true }, { text: '2', classes: S_FIXED }, { text: '3', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '', classes: S_CELL }, { text: '3', classes: S_FIXED }, { text: '2', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '4', classes: S_FIXED, isHighlight: true }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '1', classes: S_FIXED }]
      ]
    },
    {
      descriptionEn: 'Rule: No number can repeat in the same block. A 4x4 grid has 2x2 blocks. The correct number here is 3.',
      descriptionZh: '规则：同一个小宫格（这里是 2x2 宫格）内不能重复。因此，这里正确的数字应该是 3。',
      board: [
        [{ text: '1', classes: S_FIXED }, { text: '3', classes: S_OK, isHighlight: true }, { text: '', classes: S_CELL }, { text: '4', classes: S_FIXED }],
        [{ text: '', classes: S_CELL }, { text: '2', classes: S_FIXED }, { text: '3', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '', classes: S_CELL }, { text: '3', classes: S_FIXED }, { text: '2', classes: S_FIXED }, { text: '', classes: S_CELL }],
        [{ text: '4', classes: S_FIXED }, { text: '', classes: S_CELL }, { text: '', classes: S_CELL }, { text: '1', classes: S_FIXED }]
      ]
    }
  ]
};

// --- Gomoku ---
const G_BOARD = 'bg-[#eecfa1] border border-[#d2a679] shadow-inner text-transparent relative';
const G_BLACK = 'bg-[#eecfa1] border border-[#d2a679] shadow-inner relative after:content-[""] after:absolute after:inset-1 after:rounded-full after:bg-gray-900 after:shadow-md';
const G_WHITE = 'bg-[#eecfa1] border border-[#d2a679] shadow-inner relative after:content-[""] after:absolute after:inset-1 after:rounded-full after:bg-white after:shadow-md';
const G_WIN = 'bg-[#eecfa1] border border-[#d2a679] shadow-inner relative after:content-[""] after:absolute after:inset-1 after:rounded-full after:bg-gray-900 after:shadow-[0_0_15px_rgba(34,197,94,0.8)] after:ring-2 after:ring-green-500';

export const gomokuDemoConfig: DemoConfig = {
  gameId: 'gomoku',
  titleEn: 'How to Play Gomoku',
  titleZh: '五子棋基础玩法',
  steps: [
    {
      descriptionEn: 'Gomoku is played on a grid. Two players take turns placing black and white stones on the intersections (here represented by grid cells for simplicity). Black plays first.',
      descriptionZh: '五子棋通常在网格线上落子（为方便演示，这里以格子代替）。黑白双方轮流落子，黑棋先走。',
      board: [
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }]
      ]
    },
    {
      descriptionEn: 'Black places the first stone in the middle of the board to maximize future opportunities.',
      descriptionZh: '黑棋通常将第一步下在棋盘中央，以最大化未来的连子机会。',
      board: [
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BLACK, isHighlight: true }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }]
      ]
    },
    {
      descriptionEn: 'White responds by placing a stone adjacently to block or build their own line.',
      descriptionZh: '白棋随后在附近落子，以阻挡黑棋或建立自己的连线。',
      board: [
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BLACK }, { classes: G_WHITE, isHighlight: true }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }]
      ]
    },
    {
      descriptionEn: 'The ultimate goal is to get exactly 5 stones in an unbroken row horizontally, vertically, or diagonally.',
      descriptionZh: '游戏的终极目标是：在横向、纵向或斜向，连成连续的 5 颗同色棋子。',
      board: [
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_WIN }, { classes: G_BOARD }, { classes: G_WHITE }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_WIN }, { classes: G_WHITE }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_WHITE }, { classes: G_WIN }, { classes: G_BOARD }],
        [{ classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_BOARD }, { classes: G_WIN, isHighlight: true }]
      ]
    }
  ]
};

// --- Lights Out ---
const L_ON = 'bg-yellow-400 border border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)] text-transparent';
const L_OFF = 'bg-slate-800 border border-slate-700 shadow-inner text-transparent';

export const lightsoutDemoConfig: DemoConfig = {
  gameId: 'lightsout',
  titleEn: 'How to Play Lights Out',
  titleZh: '点灯游戏玩法',
  steps: [
    {
      descriptionEn: 'The board consists of a grid of lights. Some are ON (yellow), some are OFF (dark). The goal is to turn ALL lights OFF.',
      descriptionZh: '棋盘由一个灯光网格组成。部分灯是亮的（黄色），部分是灭的（暗色）。目标是将所有灯全部熄灭！',
      board: [
        [{ classes: L_OFF }, { classes: L_ON }, { classes: L_OFF }],
        [{ classes: L_ON }, { classes: L_ON }, { classes: L_ON }],
        [{ classes: L_OFF }, { classes: L_ON }, { classes: L_OFF }]
      ]
    },
    {
      descriptionEn: 'When you click a light, it toggles (ON becomes OFF, OFF becomes ON). BUT it also toggles the 4 directly adjacent lights (Up, Down, Left, Right)!',
      descriptionZh: '当你点击一盏灯时，它会切换状态（亮变灭，灭变亮）。但同时，它正上方、下方、左侧和右侧的 4 盏相邻灯，也会跟着一起切换状态！',
      board: [
        [{ classes: L_OFF }, { classes: L_ON, isHighlight: true }, { classes: L_OFF }],
        [{ classes: L_ON, isHighlight: true }, { text: '👆', classes: L_ON, isHighlight: true }, { classes: L_ON, isHighlight: true }],
        [{ classes: L_OFF }, { classes: L_ON, isHighlight: true }, { classes: L_OFF }]
      ]
    },
    {
      descriptionEn: 'By clicking the center light in this cross pattern, the center and its 4 neighbors all toggle from ON to OFF. You win!',
      descriptionZh: '在这个十字亮灯的布局中，只要点击正中间的灯，中心和四周的 4 盏灯就全都从“亮”变成了“灭”。恭喜过关！',
      board: [
        [{ classes: L_OFF }, { classes: L_OFF }, { classes: L_OFF }],
        [{ classes: L_OFF }, { classes: L_OFF }, { classes: L_OFF }],
        [{ classes: L_OFF }, { classes: L_OFF }, { classes: L_OFF }]
      ]
    }
  ]
};


// --- Math 24 ---
const M24 = 'bg-white border-2 border-slate-200 shadow-md text-slate-800 text-2xl sm:text-3xl font-black rounded-xl';
const M24_OP = 'bg-slate-100 border border-slate-300 shadow-sm text-slate-600 text-xl font-bold rounded-full scale-75';

export const math24DemoConfig: DemoConfig = {
  gameId: 'math24',
  titleEn: 'How to Play Math 24',
  titleZh: '24点 玩法演示',
  steps: [
    {
      descriptionEn: 'You are dealt 4 cards (e.g., 3, 3, 8, 8). Your goal is to combine all four numbers using +, -, ×, ÷ to exactly equal 24.',
      descriptionZh: '系统发给你 4 张牌（例如：3, 3, 8, 8）。你的目标是使用加减乘除，把这 4 个数字全部用上，算出结果 24。',
      board: [
        [{ text: '3', classes: M24 }, { text: '3', classes: M24 }, { text: '8', classes: M24 }, { text: '8', classes: M24 }]
      ]
    },
    {
      descriptionEn: 'First, we divide 8 by 3. This gives a fraction (8/3). Our engine fully supports intermediate fractions!',
      descriptionZh: '首先，我们将 8 除以 3。得到一个分数 (8/3)。游戏引擎完美支持分数计算！',
      board: [
        [{ text: '3', classes: M24 }, { text: '3', classes: M24 }, { text: '8/3', classes: M24, isHighlight: true }, { text: '8', classes: M24 }]
      ]
    },
    {
      descriptionEn: 'Next, we subtract that result (8/3) from 3. The result is 1/3. (3 - 8/3 = 1/3)',
      descriptionZh: '接着，我们用 3 减去刚才的结果 (8/3)。结果是 1/3。(3 - 8/3 = 1/3)',
      board: [
        [{ text: '1/3', classes: M24, isHighlight: true }, { text: '8', classes: M24 }]
      ]
    },
    {
      descriptionEn: 'Finally, we divide the remaining 8 by 1/3. (8 ÷ 1/3 = 24). You win!',
      descriptionZh: '最后，我们将剩下的 8 除以 1/3。(8 ÷ 1/3 = 24)。恭喜你解开了这道著名的难题！',
      board: [
        [{ text: '24', classes: 'bg-green-500 border-2 border-green-600 shadow-lg text-white text-3xl font-black rounded-xl', isHighlight: true }]
      ]
    }
  ]
};

// --- Codebreaker ---
const CB_PEG = 'bg-slate-800 border-2 border-slate-700 shadow-inner rounded-full flex items-center justify-center text-3xl';
const CB_CLUE_G = 'text-green-500 text-sm font-black flex items-center justify-center';
const CB_CLUE_Y = 'text-yellow-500 text-sm font-black flex items-center justify-center';
const CB_CLUE_B = 'text-slate-500 text-sm flex items-center justify-center';

export const codebreakerDemoConfig: DemoConfig = {
  gameId: 'codebreaker',
  titleEn: 'How to Play Codebreaker',
  titleZh: '珠玑妙算 玩法演示',
  steps: [
    {
      descriptionEn: 'You must guess a secret sequence of 4 colored pegs. An empty row awaits your first guess.',
      descriptionZh: '你必须猜出一组由 4 个颜色组成的神秘密码。棋盘上的空行正在等待你的第一次猜测。',
      board: [
        [{ classes: CB_PEG }, { classes: CB_PEG }, { classes: CB_PEG }, { classes: CB_PEG }, { text: '?', classes: 'bg-transparent text-slate-500 text-xl' }]
      ]
    },
    {
      descriptionEn: 'You guess: Red, Blue, Green, Yellow. The game gives you two clue pegs on the right: 1 Green and 1 Yellow.',
      descriptionZh: '你猜测了：红、蓝、绿、黄。系统在右侧给了你两个提示：1个绿色，1个黄色。',
      board: [
        [{ icon: '🔴', classes: CB_PEG }, { icon: '🔵', classes: CB_PEG }, { icon: '🟢', classes: CB_PEG }, { icon: '🟡', classes: CB_PEG }, { text: '🟢🟡', classes: 'bg-slate-900 border border-slate-700 shadow-inner text-xs tracking-tighter' }]
      ]
    },
    {
      descriptionEn: '🟢 The Green clue means ONE of your colors is absolutely correct AND in the right spot (but it doesn\'t tell you which one!).',
      descriptionZh: '🟢 绿色提示意味着：你猜的颜色里，有 1 个颜色绝对正确，且摆放的位置也完全正确（但系统不会告诉你具体是哪一个！）。',
      board: [
        [{ icon: '🔴', classes: CB_PEG }, { icon: '🔵', classes: CB_PEG }, { icon: '🟢', classes: CB_PEG }, { icon: '🟡', classes: CB_PEG }, { text: '🟢', classes: 'bg-green-900 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] text-lg', isHighlight: true }]
      ]
    },
    {
      descriptionEn: '🟡 The Yellow clue means ONE color is correct, but placed in the WRONG spot. The rest are wrong. Use logic for your next guess!',
      descriptionZh: '🟡 黄色提示意味着：有 1 个颜色是正确的，但是放错了位置。其余颜色都是错的。在下一次猜测中利用这些逻辑来排除吧！',
      board: [
        [{ icon: '🔴', classes: CB_PEG }, { icon: '🔵', classes: CB_PEG }, { icon: '🟢', classes: CB_PEG }, { icon: '🟡', classes: CB_PEG }, { text: '🟡', classes: 'bg-yellow-900 border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] text-lg', isHighlight: true }]
      ]
    }
  ]
};

// --- Nonogram ---
const NN_CLUE = 'bg-slate-200 border border-slate-300 text-slate-800 font-bold text-sm sm:text-base';
const NN_EMPTY = 'bg-white border border-slate-300 shadow-sm';
const NN_FILL = 'bg-slate-800 border border-slate-900 shadow-sm';
const NN_X = 'bg-white border border-slate-300 shadow-sm text-slate-400 font-black text-xl';

export const nonogramDemoConfig: DemoConfig = {
  gameId: 'nonogram',
  titleEn: 'How to Play Nonogram (Picross)',
  titleZh: '数织 (Nonogram) 玩法演示',
  steps: [
    {
      descriptionEn: 'The numbers on the left and top are clues. They tell you how many consecutive filled squares are in that row/column.',
      descriptionZh: '左侧和顶部的数字是线索。它们告诉你该行或该列中有多少个连续涂黑的方块。',
      board: [
        [{ classes: 'bg-transparent border-none' }, { text: '3', classes: NN_CLUE }, { text: '1', classes: NN_CLUE }, { text: '3', classes: NN_CLUE }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_EMPTY }, { classes: NN_EMPTY }, { classes: NN_EMPTY }],
        [{ text: '1', classes: NN_CLUE }, { classes: NN_EMPTY }, { classes: NN_EMPTY }, { classes: NN_EMPTY }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_EMPTY }, { classes: NN_EMPTY }, { classes: NN_EMPTY }]
      ]
    },
    {
      descriptionEn: 'Look at the top row clue: "3". Since the grid is only 3 cells wide, we can confidently fill the entire row!',
      descriptionZh: '看第一行的线索是 "3"。由于整个棋盘只有 3 格宽，我们可以毫无顾忌地把第一行全部涂黑！',
      board: [
        [{ classes: 'bg-transparent border-none' }, { text: '3', classes: NN_CLUE }, { text: '1', classes: NN_CLUE }, { text: '3', classes: NN_CLUE }],
        [{ text: '3', classes: NN_CLUE, isHighlight: true }, { classes: NN_FILL, isHighlight: true }, { classes: NN_FILL, isHighlight: true }, { classes: NN_FILL, isHighlight: true }],
        [{ text: '1', classes: NN_CLUE }, { classes: NN_EMPTY }, { classes: NN_EMPTY }, { classes: NN_EMPTY }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_EMPTY }, { classes: NN_EMPTY }, { classes: NN_EMPTY }]
      ]
    },
    {
      descriptionEn: 'Now look at the middle column clue: "1". It already has 1 filled cell from our previous move. We must mark the rest with X.',
      descriptionZh: '现在看中间列的线索 "1"。它刚才已经被我们涂黑了一格，意味着中间列不能再有黑块了。剩下的格子必须打叉 (X)。',
      board: [
        [{ classes: 'bg-transparent border-none' }, { text: '3', classes: NN_CLUE }, { text: '1', classes: NN_CLUE, isHighlight: true }, { text: '3', classes: NN_CLUE }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_FILL }, { classes: NN_FILL }, { classes: NN_FILL }],
        [{ text: '1', classes: NN_CLUE }, { classes: NN_EMPTY }, { text: 'X', classes: NN_X, isHighlight: true }, { classes: NN_EMPTY }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_EMPTY }, { text: 'X', classes: NN_X, isHighlight: true }, { classes: NN_EMPTY }]
      ]
    },
    {
      descriptionEn: 'By continuing to cross-reference row and column clues, you reveal the hidden picture (in this case, an \'H\' shape)!',
      descriptionZh: '通过不断交叉比对行和列的线索填色或打叉，隐藏的图案就会浮现出来（在这个例子中是一个 \'H\' 形状）！',
      board: [
        [{ classes: 'bg-transparent border-none' }, { text: '3', classes: NN_CLUE }, { text: '1', classes: NN_CLUE }, { text: '3', classes: NN_CLUE }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_FILL }, { classes: NN_FILL }, { classes: NN_FILL }],
        [{ text: '1', classes: NN_CLUE }, { classes: NN_FILL }, { text: 'X', classes: NN_X }, { classes: NN_FILL }],
        [{ text: '3', classes: NN_CLUE }, { classes: NN_FILL }, { classes: NN_FILL }, { classes: NN_FILL }]
      ]
    }
  ]
};


// --- Sokoban ---
const SK_W = 'bg-stone-700 border-4 border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]'; // Wall
const SK_F = 'bg-stone-300 border border-stone-400 shadow-inner'; // Floor
const SK_T = 'bg-stone-300 border border-stone-400 shadow-inner text-red-500 text-2xl font-black'; // Target

export const sokobanDemoConfig: DemoConfig = {
  gameId: 'sokoban',
  titleEn: 'How to Play Sokoban',
  titleZh: '推箱子 玩法演示',
  steps: [
    {
      descriptionEn: 'You are the warehouse keeper (😎). Your goal is to push the wooden box (📦) onto the target square (★).',
      descriptionZh: '你是仓库管理员 (😎)。你的目标是把前方的木箱 (📦) 推到红色的目标点 (★) 上。',
      board: [
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }],
        [{ classes: SK_W }, { icon: '😎', classes: SK_F, isHighlight: true }, { icon: '📦', classes: SK_F }, { icon: '★', classes: SK_T }, { classes: SK_W }],
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }]
      ]
    },
    {
      descriptionEn: 'Move towards the box to push it. Notice that you can only push it if there is an empty space behind it!',
      descriptionZh: '朝着箱子的方向移动即可推动它。注意，只有箱子背后有空位时，你才能推得动！',
      board: [
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }],
        [{ classes: SK_W }, { classes: SK_F }, { icon: '😎', classes: SK_F, isHighlight: true }, { icon: '📦', classes: SK_T, isHighlight: true }, { classes: SK_W }],
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }]
      ]
    },
    {
      descriptionEn: 'Success! The box is securely placed on the target. You can never pull a box backwards, so avoid pushing them into corners!',
      descriptionZh: '成功！箱子已经被稳稳地推到了目标上。切记，你永远无法“拉”箱子，所以千万别把它们推到死角里！',
      board: [
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }],
        [{ classes: SK_W }, { classes: SK_F }, { classes: SK_F }, { icon: '😎', classes: SK_F }, { icon: '📦', classes: 'bg-green-500 border-2 border-green-600 shadow-[0_0_15px_rgba(34,197,94,0.8)] text-2xl', isHighlight: true }],
        [{ classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }, { classes: SK_W }]
      ]
    }
  ]
};

// --- Water Sort ---
const WS_E = 'bg-slate-800 border-x-4 border-b-4 border-slate-600 border-t-0 shadow-inner rounded-b-xl'; // Empty tube part
const WS_R = 'bg-red-500 border-x-4 border-b-4 border-red-700 border-t-0 shadow-inner rounded-b-xl'; // Red liquid
const WS_B = 'bg-blue-500 border-x-4 border-b-4 border-blue-700 border-t-0 shadow-inner rounded-b-xl'; // Blue liquid

export const watersortDemoConfig: DemoConfig = {
  gameId: 'watersort',
  titleEn: 'How to Play Water Sort',
  titleZh: '水排序 玩法演示',
  steps: [
    {
      descriptionEn: 'You have test tubes filled with mixed colors. Your goal is to sort them so each tube has only ONE color. Tap a tube to pour.',
      descriptionZh: '你面前有几个装着混合颜色液体的试管。你的目标是通过倒水，让每根试管里都只有一种纯粹的颜色。',
      board: [
        [{ classes: 'bg-transparent border-none' }, { classes: WS_E }, { classes: 'bg-transparent border-none' }, { classes: WS_E }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_R }, { classes: 'bg-transparent border-none' }, { classes: WS_B }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_B }, { classes: 'bg-transparent border-none' }, { classes: WS_R }]
      ]
    },
    {
      descriptionEn: 'You can pour the top layer of liquid into another tube. BUT you can only pour Red onto Red, or Blue onto Blue!',
      descriptionZh: '你可以将试管最顶层的液体倒出。但是，你只能把红水倒在红水上面，或者蓝水倒在蓝水上面！',
      board: [
        [{ classes: 'bg-transparent border-none' }, { classes: WS_E }, { classes: 'bg-transparent border-none' }, { classes: WS_B, isHighlight: true }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_R }, { classes: 'bg-transparent border-none' }, { classes: WS_E }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_B }, { classes: 'bg-transparent border-none' }, { classes: WS_R }]
      ]
    },
    {
      descriptionEn: 'You can also pour any liquid into a completely EMPTY tube. Empty tubes are extremely valuable for sorting!',
      descriptionZh: '你还可以把任何颜色的水，倒入一个“完全为空”的试管中。空试管是你整理颜色的最强中转站！',
      board: [
        [{ classes: 'bg-transparent border-none' }, { classes: WS_E }, { classes: 'bg-transparent border-none' }, { classes: WS_E }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_E }, { classes: 'bg-transparent border-none' }, { classes: WS_E }],
        [{ classes: 'bg-transparent border-none' }, { classes: WS_B }, { classes: 'bg-transparent border-none' }, { classes: WS_R }]
      ]
    }
  ]
};

// --- Tetris ---
const TE_E = 'bg-slate-900 border border-slate-800 shadow-inner';
const TE_C = 'bg-cyan-500 border-4 border-cyan-300 border-b-cyan-700 border-r-cyan-700 shadow-md';
const TE_Y = 'bg-yellow-500 border-4 border-yellow-300 border-b-yellow-700 border-r-yellow-700 shadow-md';

export const tetrisDemoConfig: DemoConfig = {
  gameId: 'tetris',
  titleEn: 'How to Play Tetris',
  titleZh: '俄罗斯方块 玩法演示',
  steps: [
    {
      descriptionEn: 'Falling blocks (Tetrominoes) must be rotated and placed at the bottom. Notice the yellow block is almost forming a full line.',
      descriptionZh: '你要旋转并放置不断下落的方块。注意底部由黄色方块构成的行，它马上就要被填满了。',
      board: [
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_C }, { classes: TE_C }, { classes: TE_C }, { classes: TE_C }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_Y }, { classes: TE_Y }, { classes: TE_Y }, { classes: TE_Y }, { classes: TE_Y }, { classes: TE_E }]
      ]
    },
    {
      descriptionEn: 'We dropped the cyan "I" block into the empty space on the right. A perfectly solid horizontal line is formed!',
      descriptionZh: '我们把青色的长条形 "I" 方块插进了最右侧的空隙中。底部形成了一条没有任何空隙的完整水平线！',
      board: [
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_C }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_C }],
        [{ classes: TE_Y, isHighlight: true }, { classes: TE_Y, isHighlight: true }, { classes: TE_Y, isHighlight: true }, { classes: TE_Y, isHighlight: true }, { classes: TE_Y, isHighlight: true }, { classes: TE_C, isHighlight: true }]
      ]
    },
    {
      descriptionEn: 'When a line is completely filled, it clears from the board and you earn points! Keep clearing lines to survive.',
      descriptionZh: '当一整行被完全填满时，它就会瞬间消除并为你带来积分！不断消除方块以防它们堆积到顶部。',
      board: [
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }],
        [{ classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_E }, { classes: TE_C }]
      ]
    }
  ]
};


// --- Hexa ---
const HX_E = 'bg-slate-800 border border-slate-700 shadow-inner rounded-md';
const HX_B = 'bg-blue-500 border-2 border-blue-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.3)] rounded-md';

export const hexaDemoConfig: DemoConfig = {
  gameId: 'hexa',
  titleEn: 'How to Play Hexa Puzzle',
  titleZh: '六边形消除 玩法演示',
  steps: [
    {
      descriptionEn: 'Drag blocks onto the board. Unlike Tetris, lines can be cleared horizontally AND diagonally!',
      descriptionZh: '将屏幕下方的方块拖入棋盘。与俄罗斯方块不同，六边形可以实现水平以及两个斜向的消除！',
      board: [
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_B }, { classes: HX_B }, { classes: HX_E }, { classes: HX_B }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }]
      ]
    },
    {
      descriptionEn: 'We place a blue block into the gap. A complete horizontal line is formed!',
      descriptionZh: '我们将一个蓝色的方块放入空隙中。此时，一整条水平线被填满了！',
      board: [
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_B }, { classes: HX_B }, { classes: HX_B, isHighlight: true }, { classes: HX_B }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }]
      ]
    },
    {
      descriptionEn: 'The completed line vanishes, giving you points and freeing up valuable space on the board.',
      descriptionZh: '填满的线会瞬间消除，不仅为你带来得分，更重要的是为后续的方块腾出了宝贵的空间。',
      board: [
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }],
        [{ classes: HX_E }, { classes: HX_E }, { classes: HX_E }, { classes: HX_E }]
      ]
    }
  ]
};

// --- Drop 2048 ---
const D_E = 'bg-slate-800 border-2 border-slate-700 shadow-inner rounded-xl';
const D_2 = 'bg-slate-100 border-2 border-slate-300 text-slate-800 text-2xl font-black rounded-xl shadow-md';
const D_4 = 'bg-amber-100 border-2 border-amber-300 text-amber-800 text-2xl font-black rounded-xl shadow-md';
const D_8 = 'bg-orange-400 border-2 border-orange-200 text-white text-2xl font-black rounded-xl shadow-[0_0_15px_rgba(251,146,60,0.6)]';

export const drop2048DemoConfig: DemoConfig = {
  gameId: 'drop2048',
  titleEn: 'How to Play Drop 2048',
  titleZh: '掉落 2048 玩法演示',
  steps: [
    {
      descriptionEn: 'Blocks with numbers fall from the top. Notice the [4] block falling towards another [4].',
      descriptionZh: '带有数字的方块会从顶部掉落。注意观察，一个 [4] 正在掉向底部的另一个 [4]。',
      board: [
        [{ classes: D_E }, { text: '4', classes: D_4, isHighlight: true }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ text: '2', classes: D_2 }, { text: '4', classes: D_4 }, { text: '2', classes: D_2 }]
      ]
    },
    {
      descriptionEn: 'When two identical numbers touch, they instantly merge into a single block with their sum (4 + 4 = 8)!',
      descriptionZh: '当两个相同的数字碰撞时，它们会瞬间合并，变成它们数字之和的新方块 (4 + 4 = 8)！',
      board: [
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ text: '2', classes: D_2 }, { text: '8', classes: D_8, isHighlight: true }, { text: '2', classes: D_2 }]
      ]
    },
    {
      descriptionEn: 'Keep merging to reach the legendary 2048 block! Do not let the blocks stack up to the top.',
      descriptionZh: '不断合并，努力拼出传说中的 2048 方块吧！千万不要让方块堆叠到屏幕顶部。',
      board: [
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ classes: D_E }, { classes: D_E }, { classes: D_E }],
        [{ text: '2', classes: D_2 }, { text: '8', classes: D_8 }, { text: '2', classes: D_2 }]
      ]
    }
  ]
};

// --- Block Puzzle ---
const BP_E = 'bg-stone-800 border border-stone-700 shadow-inner';
const BP_F = 'bg-purple-500 border-2 border-purple-300 shadow-md';

export const blockDemoConfig: DemoConfig = {
  gameId: 'block',
  titleEn: 'How to Play Block Puzzle',
  titleZh: '方块消除 玩法演示',
  steps: [
    {
      descriptionEn: 'Drag the given shapes onto the grid. You must plan your space carefully as shapes cannot be rotated.',
      descriptionZh: '将底部给出的方块拖入网格中。方块是不能旋转的，所以你必须谨慎规划空间。',
      board: [
        [{ classes: BP_E }, { classes: BP_F }, { classes: BP_F }, { classes: BP_F }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_F }, { classes: BP_E }, { classes: BP_F }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }]
      ]
    },
    {
      descriptionEn: 'Placing a 3-block horizontal shape fills the gaps perfectly to create a solid row.',
      descriptionZh: '我们将一个 3 格宽的长条方块完美地填入了第一行的空隙中。',
      board: [
        [{ classes: BP_F, isHighlight: true }, { classes: BP_F }, { classes: BP_F }, { classes: BP_F }, { classes: BP_F, isHighlight: true }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_F }, { classes: BP_E }, { classes: BP_F }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }]
      ]
    },
    {
      descriptionEn: 'The full row is cleared! Always try to clear multiple rows and columns at the same time for huge combo points.',
      descriptionZh: '被填满的整行瞬间被消除了！高手的秘诀在于同时消除多行多列，以获取巨额的连击分数。',
      board: [
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_F }, { classes: BP_E }, { classes: BP_F }, { classes: BP_E }],
        [{ classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }, { classes: BP_E }]
      ]
    }
  ]
};

// --- Idiom Solitaire ---
const ID_E = 'bg-transparent border-none';
const ID_C = 'bg-amber-50 border border-amber-200 shadow-sm text-slate-800 font-bold text-2xl font-serif';
const ID_A = 'bg-green-100 border-2 border-green-500 shadow-md text-green-700 font-black text-3xl font-serif scale-110 z-10';

export const idiomDemoConfig: DemoConfig = {
  gameId: 'idiom',
  titleEn: 'How to Play Idiom Solitaire',
  titleZh: '成语接龙 玩法演示',
  steps: [
    {
      descriptionEn: 'You are presented with a crossword grid of 4-character Chinese idioms. Some characters are missing.',
      descriptionZh: '棋盘上是一个由成语交错而成的填字网格。其中有一些字被抠掉了。',
      board: [
        [{ text: '一', classes: ID_C }, { text: '鸣', classes: ID_C }, { text: '惊', classes: ID_C }, { text: '人', classes: ID_C }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '弓', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '之', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { classes: 'bg-white border-2 border-dashed border-slate-400' }, { classes: ID_E }]
      ]
    },
    {
      descriptionEn: 'Look at the vertical idiom starting with "惊弓之...". The missing word must be "鸟" (Bird)!',
      descriptionZh: '观察纵向的成语，前三个字是“惊弓之...”。显然，缺失的那个字必定是“鸟”！',
      board: [
        [{ text: '一', classes: ID_C }, { text: '鸣', classes: ID_C }, { text: '惊', classes: ID_C }, { text: '人', classes: ID_C }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '弓', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '之', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '鸟', classes: ID_A, isHighlight: true }, { classes: ID_E }]
      ]
    },
    {
      descriptionEn: 'Fill in the blanks from the word bank to complete all horizontal and vertical idioms to win!',
      descriptionZh: '从下方的字库中选字填入空格。当你把所有横向和纵向的成语都补全正确时，即可过关！',
      board: [
        [{ text: '一', classes: ID_C }, { text: '鸣', classes: ID_C }, { text: '惊', classes: ID_C }, { text: '人', classes: ID_C }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '弓', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '之', classes: ID_C }, { classes: ID_E }],
        [{ classes: ID_E }, { classes: ID_E }, { text: '鸟', classes: ID_C }, { classes: ID_E }]
      ]
    }
  ]
};


// --- Minesweeper ---
const MS_U = 'bg-gray-300 border-[3px] border-t-white border-l-white border-b-gray-500 border-r-gray-500 text-transparent'; // Unclicked
const MS_C = 'bg-gray-200 border border-gray-300 shadow-inner font-black text-2xl'; // Clicked (empty or number)
const MS_F = 'bg-gray-300 border-[3px] border-t-white border-l-white border-b-gray-500 border-r-gray-500 text-2xl'; // Flagged
const MS_B = 'bg-red-500 border border-red-700 shadow-inner text-2xl'; // Bomb Exploded

export const minesweeperDemoConfig: DemoConfig = {
  gameId: 'minesweeper',
  titleEn: 'How to Play Minesweeper',
  titleZh: '扫雷 玩法演示',
  steps: [
    {
      descriptionEn: 'The board is covered with hidden mines. Your goal is to uncover all safe cells without clicking a mine.',
      descriptionZh: '棋盘的下方隐藏着地雷。你的目标是揭开所有安全的方块，且绝对不能点到地雷。',
      board: [
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }]
      ]
    },
    {
      descriptionEn: 'When you click a safe cell, it reveals a number. The number [1] means there is exactly 1 mine hidden in the 8 adjacent cells.',
      descriptionZh: '当你点击一个安全的方块时，会显示一个数字。数字 [1] 代表在它周围的 8 个格子中，正好隐藏了 1 颗地雷。',
      board: [
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { text: '1', classes: MS_C + ' text-blue-600', isHighlight: true }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }]
      ]
    },
    {
      descriptionEn: 'Using logic, if you know a cell MUST be a mine, you can place a Flag (🚩) on it to prevent accidentally clicking it.',
      descriptionZh: '通过逻辑推理，如果你确定某个方块下面必然是地雷，你可以插上一面旗帜 (🚩) 以防止误点。',
      board: [
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { icon: '🚩', classes: MS_F, isHighlight: true }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { text: '1', classes: MS_C + ' text-blue-600' }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }]
      ]
    },
    {
      descriptionEn: 'If you click on a hidden mine, it explodes (💥) and the game is instantly over!',
      descriptionZh: '如果你不小心点到了隐藏的地雷，它就会爆炸 (💥)，游戏瞬间结束（Game Over）！',
      board: [
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { icon: '🚩', classes: MS_F }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { text: '1', classes: MS_C + ' text-blue-600' }, { classes: MS_U }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { icon: '💥', classes: MS_B, isHighlight: true }, { classes: MS_U }],
        [{ classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }, { classes: MS_U }]
      ]
    }
  ]
};

export const ALL_DEMO_CONFIGS: Record<string, DemoConfig> = {
  'sliding': slidingDemoConfig,
  'sudoku': sudokuDemoConfig,
  'gomoku': gomokuDemoConfig,
  'lightsout': lightsoutDemoConfig,
  'math24': math24DemoConfig,
  'codebreaker': codebreakerDemoConfig,
  'nonogram': nonogramDemoConfig,
  'sokoban': sokobanDemoConfig,
  'watersort': watersortDemoConfig,
  'tetris': tetrisDemoConfig,
  'hexa': hexaDemoConfig,
  'drop2048': drop2048DemoConfig,
  'block': blockDemoConfig,
  'idiom': idiomDemoConfig,
  'minesweeper': minesweeperDemoConfig
};
