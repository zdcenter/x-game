import { InteractiveTutorialStep } from '../../../../shared/components/interactive-tutorial/interactive-tutorial.model';

export interface SudokuTutorialStep extends InteractiveTutorialStep {
  targetR: number;
  targetC: number;
  targetVal: number;
  highlightClues?: { r: number; c: number }[];
  highlightBox?: { r: number; c: number }; // Top-left of 3x3 box
  highlightRow?: number;
  highlightCol?: number;
}

export const SUDOKU_TUTORIAL_SOLUTION = 
  '534678912' +
  '672195348' +
  '198342567' +
  '859761423' +
  '426853791' +
  '713924856' +
  '961537284' +
  '287419635' +
  '345286179';

export const SUDOKU_TUTORIAL_PUZZLE = 
  '5..678912' +
  '672195348' +
  '198342567' +
  '859761423' +
  '4268.3791' +
  '713924856' +
  '961537284' +
  '287419635' +
  '34528617.';

export const SUDOKU_TUTORIAL_STEPS: SudokuTutorialStep[] = [
  {
    step: 0,
    titleKey: 'tutorial.sudoku.step1_title',
    defaultTitle: '步骤 1/4 · 宫内排除法 (Box Cross-Hatching)',
    descKey: 'tutorial.sudoku.step1_desc',
    defaultDesc: '看左上角 3×3 宫：宫内还缺数字「4」。向下观察第 2 列，底部的 (8,1) 已有「4」，这条垂线直接封死了 (0,1) 填 4 的可能！因此该宫内的 4 只能填入 (0,2)！',
    actionKey: 'tutorial.sudoku.step1_action',
    defaultAction: '选中第一行第 3 格 (0,2)，并在数字键盘点击「4」填入',
    microActionKey: 'tutorial.sudoku.step1_micro',
    defaultMicroAction: '点击填入 4 ✍️',
    formula: '[ 宫内缺 4，第 2 列已有 4 ] ➔ [ 排除 (0,1)，必填 (0,2)！]',
    formulaBadge: '宫内排除法',
    targetR: 0,
    targetC: 2,
    targetVal: 4,
    targets: [{ x: 2, y: 0 }],
    highlightClues: [{ r: 8, c: 1 }],
    highlightCol: 1,
    highlightBox: { r: 0, c: 0 }
  },
  {
    step: 1,
    titleKey: 'tutorial.sudoku.step2_title',
    defaultTitle: '步骤 2/4 · 行列唯一法 (Row Unique Digit)',
    descKey: 'tutorial.sudoku.step2_desc',
    defaultDesc: '观察第 1 行：整行 9 格中已有 1, 2, 4, 5, 6, 7, 8, 9 八个数字，只剩下中间 (0,1) 这一处空格！根据数独行不重复规则，该格必定填入缺失的「3」！',
    actionKey: 'tutorial.sudoku.step2_action',
    defaultAction: '选中第一行第 2 格 (0,1)，并在数字键盘点击「3」填入',
    microActionKey: 'tutorial.sudoku.step2_micro',
    defaultMicroAction: '填入唯一数 3 ✍️',
    formula: '[ 第 1 行已齐 8 个数字 ] ➔ [ 唯一缺失空格必为 3！]',
    formulaBadge: '行列唯一法',
    targetR: 0,
    targetC: 1,
    targetVal: 3,
    targets: [{ x: 1, y: 0 }],
    highlightRow: 0
  },
  {
    step: 2,
    titleKey: 'tutorial.sudoku.step3_title',
    defaultTitle: '步骤 3/4 · 唯余解法 (Naked Single)',
    descKey: 'tutorial.sudoku.step3_desc',
    defaultDesc: '观察中心格 (4,4)：审视其所在的第 5 行、第 5 列以及中心 3×3 宫，发现 1, 2, 3, 4, 6, 7, 8, 9 八个数字均已存在！排除了所有其他数字后，唯独剩下「5」无冲突！',
    actionKey: 'tutorial.sudoku.step3_action',
    defaultAction: '选中正中心格 (4,4)，并在数字键盘点击「5」填入',
    microActionKey: 'tutorial.sudoku.step3_micro',
    defaultMicroAction: '唯余无冲突，填入 5 ✍️',
    formula: '[ 行/列/宫已占满其余 8 数 ] ➔ [ 唯余唯一解 5！]',
    formulaBadge: '唯余解法',
    targetR: 4,
    targetC: 4,
    targetVal: 5,
    targets: [{ x: 4, y: 4 }],
    highlightRow: 4,
    highlightCol: 4,
    highlightBox: { r: 3, c: 3 }
  },
  {
    step: 3,
    titleKey: 'tutorial.sudoku.step4_title',
    defaultTitle: '步骤 4/4 · 终局收官，全盘通关！',
    descKey: 'tutorial.sudoku.step4_desc',
    defaultDesc: '全盘 81 格只剩下右下角 (8,8) 最后一个空格！它所在的第 9 行、第 9 列与右下宫均只差最后一个数字「9」，填入它即可见证完美通关！',
    actionKey: 'tutorial.sudoku.step4_action',
    defaultAction: '选中右下角格 (8,8)，点击「9」完成全盘挑战！',
    microActionKey: 'tutorial.sudoku.step4_micro',
    defaultMicroAction: '填入 9，见证胜利 🌟',
    formula: '[ 全盘仅剩最后一格 ] ➔ [ 填入 9，决胜全盘通关！]',
    formulaBadge: '决胜通关',
    targetR: 8,
    targetC: 8,
    targetVal: 9,
    targets: [{ x: 8, y: 8 }],
    highlightRow: 8,
    highlightCol: 8,
    highlightBox: { r: 6, c: 6 }
  }
];
