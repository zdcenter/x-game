import { InteractiveTutorialStep } from '../../../../shared/components/interactive-tutorial/interactive-tutorial.model';

export interface MinesweeperTutorialStep extends InteractiveTutorialStep {
  actionType: 'reveal' | 'flag' | 'any';
  highlightClueCell?: { x: number; y: number };
}

export const MINESWEEPER_TUTORIAL_STEPS: MinesweeperTutorialStep[] = [
  {
    step: 0,
    titleKey: 'tutorial.minesweeper.step1_title',
    defaultTitle: '步骤 1/4 · 首次下铲，开辟安全区',
    descKey: 'tutorial.minesweeper.step1_desc',
    defaultDesc: '扫雷的第一步是揭开安全空格。点击周围没有雷的空格（0），会自动向外扩散开辟出一大片安全空地，显现的数字代表其紧邻周围 8 格内的地雷总数！',
    actionKey: 'tutorial.minesweeper.step1_action',
    defaultAction: '点击左下角安全格 (0,3)，开辟初始安全区域 ⛏️',
    microActionKey: 'tutorial.minesweeper.step1_micro',
    defaultMicroAction: '点击揭开 ⛏️',
    formula: '[ 空白格 0 ] ➔ [ 瞬间连片扩散，显露数字边界 ]',
    formulaBadge: '安全开辟法则',
    targets: [{ x: 0, y: 3 }],
    actionType: 'reveal'
  },
  {
    step: 1,
    titleKey: 'tutorial.minesweeper.step2_title',
    defaultTitle: '步骤 2/4 · 孤邻必雷法则 (1:1 锁定)',
    descKey: 'tutorial.minesweeper.step2_desc',
    defaultDesc: '看中间的数字「1」：它周围紧邻的 8 个格子中，有 7 格已经翻开，只剩右上角 1 格未揭开！既然它只有 1 颗雷且仅剩 1 个位置，该格必定是地雷！',
    actionKey: 'tutorial.minesweeper.step2_action',
    defaultAction: '在右上角未开格 (2,1) 插上红旗 🚩 标记地雷',
    microActionKey: 'tutorial.minesweeper.step2_micro',
    defaultMicroAction: '右键/长按插旗 🚩',
    formula: '[ 数字 1，仅剩 1 未开邻格 ] ➔ [ 必为地雷！插旗锁定 ]',
    formulaBadge: '孤邻必雷法则',
    targets: [{ x: 2, y: 1 }],
    highlightClueCell: { x: 1, y: 2 },
    actionType: 'flag'
  },
  {
    step: 2,
    titleKey: 'tutorial.minesweeper.step3_title',
    defaultTitle: '步骤 3/4 · 满雷排除法则 (Safe Deduction)',
    descKey: 'tutorial.minesweeper.step3_desc',
    defaultDesc: '看右下方的数字「1」：它的上方刚刚已被插上红旗 🚩，说明它周围唯一的 1 颗雷已找到！因此它周围其余未开的格子绝对不可能有雷，必定 100% 安全！',
    actionKey: 'tutorial.minesweeper.step3_action',
    defaultAction: '放心点击右上角未开格 (3,1)，安全揭开 🔍',
    microActionKey: 'tutorial.minesweeper.step3_micro',
    defaultMicroAction: '安全格，点击揭开 🔍',
    formula: '[ 额度已满（标足雷） ] ➔ [ 其余未开邻格必定全部安全！]',
    formulaBadge: '满雷排除法则',
    targets: [{ x: 3, y: 1 }],
    highlightClueCell: { x: 2, y: 2 },
    actionType: 'reveal'
  },
  {
    step: 3,
    titleKey: 'tutorial.minesweeper.step4_title',
    defaultTitle: '步骤 4/4 · 乘胜追击，决胜通关！',
    descKey: 'tutorial.minesweeper.step4_desc',
    defaultDesc: '看左上方数字「1」：同理推断左上角 (0,0) 必是最后地雷，插上红旗！顶排其余格子均为安全格，逐一揭开赢得通关大捷！',
    actionKey: 'tutorial.minesweeper.step4_action',
    defaultAction: '标记 (0,0) 最后一颗雷 🚩，并揭开顶部全部安全格子！',
    microActionKey: 'tutorial.minesweeper.step4_micro',
    defaultMicroAction: '通关扫雷 🌟',
    formula: '[ 标出残雷，扫清净土 ] ➔ [ 避开所有地雷，大获全胜！]',
    formulaBadge: '全局通关胜利',
    targets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
    actionType: 'any'
  }
];
