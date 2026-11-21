import { InteractiveTutorialStep } from '../../../../shared/components/interactive-tutorial/interactive-tutorial.model';

export interface LightsoutTutorialStep extends InteractiveTutorialStep {
  targetR: number;
  targetC: number;
}

/**
 * 3x3 精选教学关卡初始盘面 (true = 💡 亮, false = ⬛ 暗)
 * 初始状态：
 * 💡 💡 ⬛
 * 💡 ⬛ ⬛
 * ⬛ 💡 ⬛
 */
export const LIGHTSOUT_TUTORIAL_START_BOARD: boolean[][] = [
  [true, true, false],
  [true, false, false],
  [false, true, false]
];

export const LIGHTSOUT_TUTORIAL_STEPS: LightsoutTutorialStep[] = [
  {
    step: 0,
    titleKey: 'tutorial.lightsout.step1_title',
    defaultTitle: '步骤 1/4 · 十字翻转法则 (The Cross Toggle)',
    descKey: 'tutorial.lightsout.step1_desc',
    defaultDesc: '点灯游戏核心规则：点击任意格子，该格子以及与其相邻的上下左右格子会同时翻转状态（亮变暗，暗变亮）。在角点处没有棋盘外侧格子，点击角格仅翻转自身与相邻的 2 格（共 3 格）！',
    actionKey: 'tutorial.lightsout.step1_action',
    defaultAction: '点击左上角格子 (0,0)，观察角格与其相邻格翻转',
    microActionKey: 'tutorial.lightsout.step1_micro',
    defaultMicroAction: '点击左上角 (0,0) 💡',
    formula: '[ 认识十字翻转 ] ➔ [ 点击翻转自身与相邻格 ]',
    formulaBadge: '十字翻转与边界限制',
    targets: [{ x: 0, y: 0 }],
    targetR: 0,
    targetC: 0
  },
  {
    step: 1,
    titleKey: 'tutorial.lightsout.step2_title',
    defaultTitle: '步骤 2/4 · 顶行集火与边缘联动 (Edge Toggling & Row Clearing)',
    descKey: 'tutorial.lightsout.step2_desc',
    defaultDesc: '边缘格子与其相连的 3 个邻格联动。点击第一行中间的 (0,1)，它将同时翻转自身、左右邻格以及下方中心格。原本熄灭的顶排 3 盏灯将全部被瞬间点亮！',
    actionKey: 'tutorial.lightsout.step2_action',
    defaultAction: '点击顶行中心格 (0,1)，瞬间点亮第一行全部灯泡',
    microActionKey: 'tutorial.lightsout.step2_micro',
    defaultMicroAction: '点击顶边 (0,1) 💡',
    formula: '[ 顶行集火 ] ➔ [ 边格联动，顶行全亮 ]',
    formulaBadge: '边缘四向联动',
    targets: [{ x: 1, y: 0 }],
    targetR: 0,
    targetC: 1
  },
  {
    step: 2,
    titleKey: 'tutorial.lightsout.step3_title',
    defaultTitle: '步骤 3/4 · 追光下压与定点补光 (Light Chasing / Bottom Push)',
    descKey: 'tutorial.lightsout.step3_desc',
    defaultDesc: '顶行已经完全点亮，我们向下推进！点击左下角 (2,0)，不仅点亮自身，还会联动点亮上方 (1,0) 与右侧 (2,1)，左翼半盘完全进入光明状态！',
    actionKey: 'tutorial.lightsout.step3_action',
    defaultAction: '点击左下角格子 (2,0)，联动激活左侧灯盘',
    microActionKey: 'tutorial.lightsout.step3_micro',
    defaultMicroAction: '点击左下角 (2,0) 💡',
    formula: '[ 追光下压 ] ➔ [ 点亮左翼，锁定胜局 ]',
    formulaBadge: '底角推进法则',
    targets: [{ x: 0, y: 2 }],
    targetR: 2,
    targetC: 0
  },
  {
    step: 3,
    titleKey: 'tutorial.lightsout.step4_title',
    defaultTitle: '步骤 4/4 · 决胜收官，全盘通关！ (Final Sweep & Victory)',
    descKey: 'tutorial.lightsout.step4_desc',
    defaultDesc: '观察盘面：整盘仅剩右下角的 (1,2)、(2,1) 和 (2,2) 三盏暗灯！正好对应角格 (2,2) 及其相邻格！按下右下角这最后一击，点亮全盘所有灯泡，迎来终局胜利！',
    actionKey: 'tutorial.lightsout.step4_action',
    defaultAction: '点击右下角格子 (2,2)，点亮全部灯泡，夺取胜利！',
    microActionKey: 'tutorial.lightsout.step4_micro',
    defaultMicroAction: '点击右下角 (2,2)，全盘点亮 🌟',
    formula: '[ 决胜收官 ] ➔ [ 一击全亮，大获全胜 ]',
    formulaBadge: '终局全盘通关',
    targets: [{ x: 2, y: 2 }],
    targetR: 2,
    targetC: 2
  }
];
