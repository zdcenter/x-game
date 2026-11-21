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
    defaultDesc: '看高亮数字「1」(2,2)：它周围紧邻的 8 个格子中，有 7 格已翻开，只剩右侧 (3,1) 这 1 格未揭开！既然它只有 1 颗雷且仅剩 1 个位置，该格必定是地雷！',
    actionKey: 'tutorial.minesweeper.step2_action',
    defaultAction: '在右侧唯一未开格 (3,1) 插上红旗 🚩 标记地雷',
    microActionKey: 'tutorial.minesweeper.step2_micro',
    defaultMicroAction: '右键/长按插旗 🚩',
    formula: '[ 数字 1 仅剩 1 邻格 ] ➔ [ 必为地雷！插旗锁定 ]',
    formulaBadge: '孤邻必雷法则',
    targets: [{ x: 3, y: 1 }],
    highlightClueCell: { x: 2, y: 2 },
    actionType: 'flag'
  },
  {
    step: 2,
    titleKey: 'tutorial.minesweeper.step3_title',
    defaultTitle: '步骤 3/4 · 满雷排除法则 (Safe Deduction)',
    descKey: 'tutorial.minesweeper.step3_desc',
    defaultDesc: '看高亮数字「1」(2,1)：它的右侧刚刚已被插上红旗 🚩，说明它周围唯一的 1 颗雷已锁定！因此它周围其余未开的邻格 (2,0) 等绝无地雷，必定 100% 安全！',
    actionKey: 'tutorial.minesweeper.step3_action',
    defaultAction: '放心点击上方未开格 (2,0)，安全揭开 🔍',
    microActionKey: 'tutorial.minesweeper.step3_micro',
    defaultMicroAction: '安全格，点击揭开 🔍',
    formula: '[ 额度已满（标足雷） ] ➔ [ 其余未开邻格 100% 安全！]',
    formulaBadge: '满雷排除法则',
    targets: [{ x: 2, y: 0 }],
    highlightClueCell: { x: 2, y: 1 },
    actionType: 'reveal'
  },
  {
    step: 3,
    titleKey: 'tutorial.minesweeper.step4_title',
    defaultTitle: '步骤 4/4 · 终局收网，锁定残雷通关！',
    descKey: 'tutorial.minesweeper.step4_desc',
    defaultDesc: '看左侧高亮数字「1」(0,1)：由于其右邻格刚刚已被安全揭开，此时 (0,1) 周围只剩下左上角 (0,0) 这 1 处未开！因此 (0,0) 必定是最后一颗地雷，插上红旗大获全胜！',
    actionKey: 'tutorial.minesweeper.step4_action',
    defaultAction: '在左上角 (0,0) 插上红旗 🚩 锁定残雷，通关大捷！',
    microActionKey: 'tutorial.minesweeper.step4_micro',
    defaultMicroAction: '最后一颗雷，插旗通关 🚩',
    formula: '[ 锁定残雷，扫清全盘 ] ➔ [ 避开所有地雷，大获全胜！]',
    formulaBadge: '决胜通关',
    targets: [{ x: 0, y: 0 }],
    highlightClueCell: { x: 0, y: 1 },
    actionType: 'flag'
  }
];
