import { InteractiveTutorialStep } from '../../../../shared/components/interactive-tutorial/interactive-tutorial.model';

export interface HashiTutorialBridgeTarget {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  requiredCount: number; // 1 or 2
}

export interface HashiTutorialStep extends InteractiveTutorialStep {
  bridgeTargets: HashiTutorialBridgeTarget[];
  highlightIslands: { r: number; c: number }[];
}

export const HASHI_TUTORIAL_PUZZLE = {
  grid: [
    [4, 0, 0, 2],
    [0, 0, 0, 0],
    [3, 0, 0, 2],
    [0, 1, 0, 2]
  ]
};

export const HASHI_TUTORIAL_STEPS: HashiTutorialStep[] = [
  {
    step: 0,
    titleKey: 'tutorial.hashi.step1_title',
    defaultTitle: '步骤 1/4 · 连桥基础与双桥架设',
    descKey: 'tutorial.hashi.step1_desc',
    defaultDesc: '岛上的数字代表该岛必须连接的总桥数。桥梁只能水平或垂直延伸，两岛间最多建 2 座桥（双桥），桥梁不能交叉！',
    actionKey: 'tutorial.hashi.step1_action',
    defaultAction: '点击左上角 (0,0) 与右上角 (0,3) 之间，搭起【双桥】',
    microActionKey: 'tutorial.hashi.step1_micro',
    defaultMicroAction: '点两次搭双桥 🌉',
    formula: '[ 认识数桥 ] ➔ [ 点击连单桥，再点升双桥 ]',
    formulaBadge: '双桥连线基础',
    targets: [{ x: 0, y: 0 }, { x: 3, y: 0 }],
    highlightIslands: [{ r: 0, c: 0 }, { r: 0, c: 3 }],
    bridgeTargets: [
      { r1: 0, c1: 0, r2: 0, c2: 3, requiredCount: 2 }
    ]
  },
  {
    step: 1,
    titleKey: 'tutorial.hashi.step2_title',
    defaultTitle: '步骤 2/4 · 满度饱和法则 (Saturation)',
    descKey: 'tutorial.hashi.step2_desc',
    defaultDesc: '角落岛屿只有 2 个延伸方向，每个方向最多 2 座桥（2×2=4）。因此角落的「4」必须向所有方向全拉满双桥！',
    actionKey: 'tutorial.hashi.step2_action',
    defaultAction: '点击左上角 (0,0) 与中左 (2,0) 之间，向下同样搭起【双桥】',
    microActionKey: 'tutorial.hashi.step2_micro',
    defaultMicroAction: '向下连双桥 🌉',
    formula: '[ 角落 4 ] ➔ [ 仅有两个方向，必全拉满双桥 ]',
    formulaBadge: '满度饱和法则',
    targets: [{ x: 0, y: 0 }, { x: 0, y: 2 }],
    highlightIslands: [{ r: 0, c: 0 }, { r: 2, c: 0 }],
    bridgeTargets: [
      { r1: 0, c1: 0, r2: 2, c2: 0, requiredCount: 2 }
    ]
  },
  {
    step: 2,
    titleKey: 'tutorial.hashi.step3_title',
    defaultTitle: '步骤 3/4 · 剩余指标推导 (Quota Deduction)',
    descKey: 'tutorial.hashi.step3_desc',
    defaultDesc: '中左岛 (2,0) 指标为「3」，上方已连了 2 座桥，还差 1 座桥！右侧邻岛是它唯一的延伸方向，必定建 1 座单桥！',
    actionKey: 'tutorial.hashi.step3_action',
    defaultAction: '点击中左 (2,0) 与中右 (2,3) 之间，搭起【单桥】',
    microActionKey: 'tutorial.hashi.step3_micro',
    defaultMicroAction: '连 1 座单桥 🌉',
    formula: '[ 3 已连 2 桥 ] ➔ [ 向右唯一邻岛必连单桥 ]',
    formulaBadge: '指标剩余推导',
    targets: [{ x: 0, y: 2 }, { x: 3, y: 2 }],
    highlightIslands: [{ r: 2, c: 0 }, { r: 2, c: 3 }],
    bridgeTargets: [
      { r1: 2, c1: 0, r2: 2, c2: 3, requiredCount: 1 }
    ]
  },
  {
    step: 3,
    titleKey: 'tutorial.hashi.step4_title',
    defaultTitle: '步骤 4/4 · 收官连通，点亮全网',
    descKey: 'tutorial.hashi.step4_desc',
    defaultDesc: '所有岛屿最终必须连成一个统一网络。中右 (2,3) 向下连 (3,3)，底部的「1」向右连 (3,3)，全图完美连通！',
    actionKey: 'tutorial.hashi.step4_action',
    defaultAction: '依次完成最后两处单桥，见证全岛点亮通关！',
    microActionKey: 'tutorial.hashi.step4_micro',
    defaultMicroAction: '连通最后桥梁 🌟',
    formula: '[ 全网连通 ] ➔ [ 配平最后桥数，全岛贯通 ]',
    formulaBadge: '网络全局贯通',
    targets: [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 1, y: 3 }],
    highlightIslands: [{ r: 2, c: 3 }, { r: 3, c: 3 }, { r: 3, c: 1 }],
    bridgeTargets: [
      { r1: 2, c1: 3, r2: 3, c2: 3, requiredCount: 1 },
      { r1: 3, c1: 1, r2: 3, c2: 3, requiredCount: 1 }
    ]
  }
];
