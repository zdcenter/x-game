import { GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export const DROP2048_ROWS = 7;
export const DROP2048_COLS = 5;

export interface DropBlock {
  id: string;
  val: number;
  r: number;
  c: number;
  mergedFrom?: string[];
  isNew?: boolean;
  isMerging?: boolean;  // triggers merge-pop CSS animation
  isLanding?: boolean;  // triggers landing-ring CSS animation
}

export interface ComboText {
  id: string;
  text: string;
  r: number;
  c: number;
  comboCount: number;
  scoreGained: number;
}

export interface Drop2048State {
  board: DropBlock[];
  activeBlock: { id: string, val: number, c: number, r: number } | null;
  nextVal: number;
  nextVal2: number;
  score: number;
  isDead: boolean;
  combos: ComboText[];
  particles: { id: string, x: number, y: number, color: string, size: number, tx?: number, ty?: number }[];
  level: number;
  ghostRow: number;
  comboCount: number;
}

export enum Drop2048ActionType {
  MoveLeft = 'MoveLeft',
  MoveRight = 'MoveRight',
  Drop = 'Drop',
  SoftDrop = 'SoftDrop'
}

export interface Drop2048Action {
  type: Drop2048ActionType;
}

export const WILD_BLOCK_VAL = 0;

export interface Drop2048EngineConfig {
  mode?: GameModeType | string;
  seed?: number;
  onSound?: (sound: 'move' | 'drop' | 'merge' | 'wild', comboCount?: number) => void;
  onHaptic?: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  onSyncState?: () => void;
  onBigMerge?: (val: number) => void;
  onLevelUp?: (newLevel: number) => void;
  onReviveShake?: () => void;
}

export function getDrop2048BlockStyle(val: number): Record<string, string> {
  if (val === WILD_BLOCK_VAL) {
    return {
      background: 'linear-gradient(135deg, #FF007F, #7928CA, #0070F3, #00DFD8)',
      'box-shadow': 'inset 0 4px 0 rgba(255,255,255,0.6), inset 0 -4px 0 rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.4), 0 0 16px rgba(0,223,216,0.5)',
      animation: 'rainbow-pulse 2.5s infinite ease-in-out'
    };
  }

  // 沿用前期深受喜爱的鲜活、亮丽、极具吸引力的经典宝石调色板，并对后期超大数字进行殿堂级雅致升级（杜绝荧光绿与高频死光）
  const g: Record<number, [string, string]> = {
    2:      ['#FF5252', '#D50000'], // Coral Red (鲜活糖果红)
    4:      ['#00E676', '#00C853'], // Emerald Green (鲜润翡翠绿)
    8:      ['#FFD600', '#FF8F00'], // Golden Amber (明艳阳光金)
    16:     ['#2196F3', '#0D47A1'], // Sky Blue (晶莹宝石蓝)
    32:     ['#E040FB', '#AA00FF'], // Vibrant Purple (梦幻霓彩紫)
    64:     ['#FF6D00', '#E65100'], // Deep Orange (活力炽焰橙)
    128:    ['#FF9100', '#E65C00'], // Flame Tangerine (炽烈金蜜橙)
    256:    ['#00BFA5', '#00796B'], // Cyber Teal (清透极光青碧)
    512:    ['#7C4DFF', '#4527A0'], // Royal Indigo (深邃皇家紫)
    1024:   ['#F50057', '#C2185B'], // Crimson Ruby (绝美红宝石绯红)
    2048:   ['#FFC107', '#FF6D00'], // Radiant 2048 Gold (璀璨流光金)
    // 后期大数：摆脱刺眼荧光绿，升级为沉稳华贵、赏心悦目的宝石色系
    4096:   ['#AB47BC', '#6A1B9A'], // Imperial Amethyst (华贵紫水晶)
    8192:   ['#00ACC1', '#006064'], // Deep Ocean Cyan (深海冷翡冰蓝，饱满雅致)
    16384:  ['#EC407A', '#AD1457'], // Velvet Rose Ruby (丝绒玫瑰石榴红)
    32768:  ['#2E7D32', '#1B5E20'], // Royal Forest Jade (尊贵墨玉翠绿，彻底取代原先刺眼的荧光绿)
    65536:  ['#FF8F00', '#BF360C'], // Solar Magma (落日熔金火红)
    131072: ['#7E57C2', '#00838F'], // Cosmic Nebula (星云双华紫青)
  };
  const [c1, c2] = g[val] || ['#78909C', '#455A64'];

  // 充满吸引力与立体感的 3D 水晶倒角高光与环境阴影，告别灰暗扁平
  const shadows = [
    'inset 0 3px 0 rgba(255,255,255,0.42)', // 顶部晶莹立体高光
    'inset 0 -4px 0 rgba(0,0,0,0.35)',     // 底部沉稳立体倒角
    '0 5px 12px rgba(0,0,0,0.40)',         // 悬浮立体底影
  ];

  // 柔和优雅的本色微光氛围（仅 30% 透明度，光芒收敛且自然，不向外炸光）
  if (val >= 16) {
    shadows.push(`0 0 10px ${c1}4d`);
  }

  return {
    background: `linear-gradient(145deg, ${c1}, ${c2})`,
    'box-shadow': shadows.join(', ')
  };
}

export class Drop2048Engine implements ILocalEngine<Drop2048State, Drop2048Action> {
  board: DropBlock[] = [];
  activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  nextVal: number = 2;
  nextVal2: number = 4;
  score: number = 0;
  isDead: boolean = false;
  combos: ComboText[] = [];
  particles: { id: string, x: number, y: number, color: string, size: number, tx?: number, ty?: number }[] = [];
  lastComboCount: number = 0;

  status: GameStatusType = GameStatus.Waiting;

  private gravityInterval: number | null = null;
  private lastDropTime: number = 0;
  private config?: Drop2048EngineConfig;

  initGame(config?: Drop2048EngineConfig): void {
    this.config = config;
    this.board = [];
    this.score = 0;
    this.isDead = false;
    this.combos = [];
    this.particles = [];
    this.activeBlock = null;
    this.dropCount = 0;
    this.noMergeDropStreak = 0;
    this.nextVal = this.generateRandomValue();
    this.nextVal2 = this.generateRandomValue();
    this.lastComboCount = 0;
    this.status = GameStatus.Playing;

    this.stop();
    this.spawnBlock();
  }

  loadState(state: any): void {
    if (!state) return;
    this.board = state.board || [];
    this.activeBlock = state.activeBlock || null;
    this.dropCount = state.dropCount || 0;
    this.noMergeDropStreak = 0;
    this.nextVal = state.nextVal || 2;
    this.nextVal2 = state.nextVal2 || this.generateRandomValue();
    this.score = state.localScore || 0;
    this.isDead = state.isDead || false;
    this.status = GameStatus.Playing;
    this.startGravity();
  }

  stop(): void {
    if (this.gravityInterval) {
      cancelAnimationFrame(this.gravityInterval);
      this.gravityInterval = null;
    }
  }

  handleAction(action: Drop2048Action): void {
    if (this.isDead || !this.activeBlock) return;

    switch (action.type) {
      case Drop2048ActionType.MoveLeft:
        this.moveActive(-1);
        break;
      case Drop2048ActionType.MoveRight:
        this.moveActive(1);
        break;
      case Drop2048ActionType.SoftDrop:
        this.softDrop();
        break;
      case Drop2048ActionType.Drop:
        this.dropActive();
        break;
    }
  }

  getState(): Drop2048State {
    return {
      board: this.board,
      activeBlock: this.activeBlock,
      nextVal: this.nextVal,
      nextVal2: this.nextVal2,
      score: this.score,
      isDead: this.isDead,
      combos: this.combos,
      particles: this.particles,
      level: this.getLevel(),
      ghostRow: this.getGhostRow(),
      comboCount: this.lastComboCount,
    };
  }

  getLevel(): number {
    if (this.score < 2000)   return 1;
    if (this.score < 5000)   return 2;
    if (this.score < 10000)  return 3;
    if (this.score < 18000)  return 4;
    if (this.score < 30000)  return 5;
    if (this.score < 50000)  return 6;
    if (this.score < 80000)  return 7;
    if (this.score < 120000) return 8;
    if (this.score < 180000) return 9;
    return 10;
  }

  private getGhostRow(): number {
    if (!this.activeBlock) return -1;
    let r = this.activeBlock.r;
    while (r < DROP2048_ROWS - 1) {
      if (this.board.some(b => b.c === this.activeBlock!.c && b.r === r + 1)) break;
      r++;
    }
    return r;
  }

  private getDropSpeed(): number {
    // 沉浸心流速降曲线 (Golden Cadence Flow Curve)
    // 告别后期的失控盲目飙速（原150ms猝死），维持在舒适、可思考、且有适度紧迫感的节奏（1600ms~750ms）
    const speeds = [1600, 1450, 1300, 1180, 1080, 980, 900, 850, 800, 750];
    let baseSpeed = speeds[Math.min(this.getLevel() - 1, 9)];

    // 绝境心跳缓速保护 (Danger Zone Soften)
    // 当任一列方块逼近顶部危险线 (r <= 1) 时，主动给予额外的缓速思考时间 (+300ms)，助玩家完成极限救场逆转
    if (this.board.some(b => b.r <= 1)) {
      baseSpeed += 300;
    }
    return baseSpeed;
  }

  private dropCount: number = 0;
  private noMergeDropStreak: number = 0;

  private generateRandomValue(): number {
    this.dropCount++;

    // 1. 彩虹万能方块 🌈 (Wild Block)
    // 间隔放缓：每36次下落保底出1次；或在盘面极度危险 (r <= 1) 且连续5次未合并时有 15% 几率奇迹降临
    const isWildGuaranteed = this.dropCount > 0 && this.dropCount % 36 === 0;
    const isDangerState = this.board.some(b => b.r <= 1);
    const isWildStuckSave = this.noMergeDropStreak >= 5 && isDangerState && Math.random() < 0.15;
    if (this.board.length > 0 && (isWildGuaranteed || isWildStuckSave)) {
      return WILD_BLOCK_VAL;
    }

    const boardValues = this.board.map(b => b.val).filter(v => v > 0);
    const boardMax = boardValues.length > 0 ? Math.max(...boardValues) : 2;

    // 2. 细腻悠长、极缓上升的发牌梯度 (Gentle & Extended Progression Curve)
    // 核心设计理念：
    // - 2048 核心乐趣在于“层层搭建递进与连锁多米诺”，小数字（2, 4, 8）必须永远作为基石（占 70%~90%）；
    // - 严禁高阶数字（128、256、512、1024、2048）直接从天而降，必须由玩家一步步合成出来！
    // - 随着盘面最高数字增长，极平滑地解锁极低概率的 bonus 候选数字：
    let candidates: { val: number; weight: number }[];

    if (boardMax < 128) {
      // 启蒙阶段：仅有 2, 4, 8，纯粹的经典合成体验
      candidates = [
        { val: 2, weight: 55 },
        { val: 4, weight: 35 },
        { val: 8, weight: 10 },
      ];
    } else if (boardMax < 512) {
      // 中前期：极小概率解锁 16 (6%)，主力依然是 2 和 4 (80%)
      candidates = [
        { val: 2, weight: 46 },
        { val: 4, weight: 34 },
        { val: 8, weight: 14 },
        { val: 16, weight: 6 },
      ];
    } else if (boardMax < 2048) {
      // 中期进阶：解锁 32 (4%)，小数字 2, 4, 8 仍占 88%
      candidates = [
        { val: 2, weight: 40 },
        { val: 4, weight: 32 },
        { val: 8, weight: 16 },
        { val: 16, weight: 8 },
        { val: 32, weight: 4 },
      ];
    } else if (boardMax < 8192) {
      // 传奇后期（2048~4096）：解锁 64 (3%)，小数字 2 依旧保留（占 30%），绝不突然跳跃
      candidates = [
        { val: 2, weight: 30 },
        { val: 4, weight: 32 },
        { val: 8, weight: 20 },
        { val: 16, weight: 10 },
        { val: 32, weight: 5 },
        { val: 64, weight: 3 },
      ];
    } else {
      // 极限宗师 (8192+)：最低位平稳推进到 4，顶级 bonus 仅为 128 (2%)
      candidates = [
        { val: 4, weight: 36 },
        { val: 8, weight: 28 },
        { val: 16, weight: 18 },
        { val: 32, weight: 11 },
        { val: 64, weight: 5 },
        { val: 128, weight: 2 },
      ];
    }

    const minAllowedDrop = candidates[0].val;
    const maxAllowedDrop = candidates[candidates.length - 1].val;

    // 3. 节制适度的智能顺风发牌 (Gentle Smart Assist - 仅限合法基础小数字)
    // 概率控制在 20%（温和不突兀），且严格限定在当前候选池区间内，绝不会越级空降大数
    if (Math.random() < 0.20) {
      const exposedTops = new Set<number>();
      for (let c = 0; c < DROP2048_COLS; c++) {
        const colBlocks = this.board.filter(b => b.c === c && b.val > 0).sort((a, b) => a.r - b.r);
        if (colBlocks.length > 0) {
          exposedTops.add(colBlocks[0].val);
        }
      }
      const matchableTops = Array.from(exposedTops).filter(v => v >= minAllowedDrop && v <= maxAllowedDrop);
      if (matchableTops.length > 0) {
        return matchableTops[Math.floor(Math.random() * matchableTops.length)];
      }
    }

    // 4. 按权重轮盘发牌
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of candidates) {
      if (rand < item.weight) {
        return item.val;
      }
      rand -= item.weight;
    }
    return candidates[0].val;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private spawnBlock() {
    if (this.isDead) return;

    const val = this.nextVal;
    this.nextVal = this.nextVal2;
    this.nextVal2 = this.generateRandomValue();

    this.activeBlock = { id: this.generateId(), val, c: 2, r: 0 };

    const blocked = this.board.some(b => b.c === 2 && b.r === 0);
    if (blocked) {
      this.gameOver();
    } else {
      this.startGravity();
    }
  }

  private startGravity() {
    this.stop();
    this.lastDropTime = performance.now();

    const loop = (timestamp: number) => {
      if (this.isDead || !this.activeBlock) {
        this.stop();
        return;
      }

      const speed = this.getDropSpeed();
      const progress = timestamp - this.lastDropTime;

      if (progress >= speed) {
        const curr = this.activeBlock;
        if (curr.r >= DROP2048_ROWS - 1 || this.board.some(b => b.c === curr.c && b.r === curr.r + 1)) {
          this.dropActive();
        } else {
          this.activeBlock = { ...curr, r: curr.r + 1 };
        }
        this.lastDropTime = timestamp;
      }

      this.gravityInterval = requestAnimationFrame(loop);
    };

    this.gravityInterval = requestAnimationFrame(loop);
  }

  private moveActive(dc: number) {
    if (this.isDead || !this.activeBlock) return;

    const nc = this.activeBlock.c + dc;
    if (nc >= 0 && nc < DROP2048_COLS) {
      this.activeBlock = { ...this.activeBlock, c: nc };
      if (this.config?.onSound) this.config.onSound('move');
    }
  }

  private softDrop() {
    if (this.isDead || !this.activeBlock) return;

    const curr = this.activeBlock;
    if (curr.r >= DROP2048_ROWS - 1 || this.board.some(b => b.c === curr.c && b.r === curr.r + 1)) {
      this.dropActive();
    } else {
      this.activeBlock = { ...curr, r: curr.r + 1 };
      this.lastDropTime = performance.now();
      if (this.config?.onSound) this.config.onSound('move');
    }
  }

  private dropActive() {
    if (this.isDead || !this.activeBlock) return;

    const curr = this.activeBlock;
    this.activeBlock = null;

    let targetR = DROP2048_ROWS - 1;
    for (let r = 0; r < DROP2048_ROWS; r++) {
      if (this.board.some(b => b.c === curr.c && b.r === r)) {
        targetR = r - 1;
        break;
      }
    }

    if (targetR < 0) {
      this.gameOver();
      return;
    }

    const newBlock: DropBlock = { id: curr.id, val: curr.val, r: targetR, c: curr.c, isNew: true, isLanding: true };
    this.board = [...this.board, newBlock];

    // Clear landing ring after animation
    setTimeout(() => {
      this.board = this.board.map(b => b.id === newBlock.id ? { ...b, isLanding: false } : b);
    }, 400);

    if (this.config?.onSound) this.config.onSound('drop');
    if (this.config?.onHaptic) this.config.onHaptic('light');

    this.lastComboCount = 0;
    setTimeout(() => this.processMerges(0), 150);
  }

  private processMerges(comboCount: number) {
    if (this.isDead) return;

    let board = [...this.board];
    let hasMerged = false;
    let scoreGained = 0;

    let toRemove = new Set<string>();
    let toUpdate = new Map<string, DropBlock>();

    // 第一步：彩虹方块 🌈 自动变形
    // 如果场上有彩虹方块(val === 0)，优先检测其正下方或相邻的最大数字，变身为该数字
    let wildTransformed = false;
    for (const b of board) {
      if (b.val === WILD_BLOCK_VAL) {
        // 查找其正下方邻居、左右邻居、上方邻居
        const directBelow = board.find(other => other.id !== b.id && other.c === b.c && other.r === b.r + 1 && other.val > 0);
        const adjacent = board.filter(other =>
          other.id !== b.id && other.val > 0 &&
          ((other.r === b.r && Math.abs(other.c - b.c) === 1) || (other.c === b.c && Math.abs(other.r - b.r) === 1))
        );

        if (directBelow) {
          b.val = directBelow.val;
          wildTransformed = true;
        } else if (adjacent.length > 0) {
          // 选择相邻数字中最大的数值进行同化
          const target = adjacent.reduce((max, cur) => cur.val > max.val ? cur : max, adjacent[0]);
          b.val = target.val;
          wildTransformed = true;
        }
      }
    }

    if (wildTransformed && this.config?.onSound) {
      this.config.onSound('wild');
    }

    // 第二步：标准方块合并
    for (let r = DROP2048_ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < DROP2048_COLS; c++) {
        const block = board.find(b => b.r === r && b.c === c && !toRemove.has(b.id));
        if (!block || block.val <= 0) continue;

        const neighbors = board.filter(b =>
          !toRemove.has(b.id) && b.id !== block.id && b.val === block.val &&
          ((b.r === r && Math.abs(b.c - c) === 1) || (b.c === c && Math.abs(b.r - r) === 1))
        );

        if (neighbors.length > 0) {
          hasMerged = true;
          const mergeScore = block.val * Math.pow(2, neighbors.length);
          scoreGained += mergeScore;

          let updatedBlock = toUpdate.get(block.id) || { ...block };
          updatedBlock.val = mergeScore;
          updatedBlock.isNew = true;
          updatedBlock.isMerging = true;
          toUpdate.set(block.id, updatedBlock);

          neighbors.forEach(n => toRemove.add(n.id));
        }
      }
    }

    if (hasMerged) {
      board = board.filter(b => !toRemove.has(b.id));
      toUpdate.forEach(u => {
        const idx = board.findIndex(b => b.id === u.id);
        if (idx >= 0) board[idx] = u;
      });

      // Apply gravity
      for (let c = 0; c < DROP2048_COLS; c++) {
        let colBlocks = board.filter(b => b.c === c).sort((a, b) => b.r - a.r);
        let bottomFree = DROP2048_ROWS - 1;
        for (let b of colBlocks) {
          if (b.r !== bottomFree) {
            b.r = bottomFree;
          }
          bottomFree--;
        }
      }

      this.board = board;
      const prevLevel = this.getLevel();

      // 连击多巴胺倍率体系 (Combo Dopamine Multiplier)
      // 连续多段合成不仅视听震撼，得分更呈指数级激增！
      const comboMultipliers = [1, 1.5, 2.2, 3.2, 4.5, 6.0];
      const mult = comboMultipliers[Math.min(comboCount, comboMultipliers.length - 1)];

      // 史诗数字合成里程碑奖励 (Milestone Bonus for 1024, 2048, 4096...) 与清屏大满贯
      let milestoneBonus = 0;
      toUpdate.forEach(u => {
        if (u.val >= 1024) {
          milestoneBonus += u.val;
        }
      });

      // 全盘清空大满贯奖励
      if (board.length === 0) {
        milestoneBonus += 2000;
      }

      // 多段连锁下落连环奖励 (Chain Reaction Bonus)
      const chainBonus = comboCount >= 2 ? Math.round(scoreGained * (comboCount * 0.25)) : 0;

      const finalScoreGained = Math.round(scoreGained * mult) + chainBonus + milestoneBonus;
      this.score += finalScoreGained;

      const newLevel = this.getLevel();
      if (newLevel > prevLevel && this.config?.onLevelUp) {
        this.config.onLevelUp(newLevel);
      }
      this.lastComboCount = comboCount;

      if (this.config?.onHaptic) {
        if (comboCount > 1 || milestoneBonus > 0) this.config.onHaptic('success');
        else this.config.onHaptic('medium');
      }

      if (this.config?.onSound) this.config.onSound('merge', comboCount);

      // Show combo text + particles for every merge (not just comboCount > 0)
      const comboId = this.generateId();
      const firstMerge = Array.from(toUpdate.values())[0];
      if (firstMerge) {
        if (firstMerge.val >= 128 && this.config?.onBigMerge) {
          this.config.onBigMerge(firstMerge.val);
        }

        // 连击街机级赞赏词体系 (Arcade Praise + Points Multiplier)
        let comboText = '+' + finalScoreGained;
        if (comboCount >= 1) {
          const praiseWords = ['GREAT! 🔥', 'AMAZING! ⚡', 'SUPER! 💥', 'UNREAL! 🌟', 'LEGENDARY! 👑'];
          const praise = praiseWords[Math.min(comboCount - 1, praiseWords.length - 1)];
          comboText = `${praise} +${finalScoreGained} (×${comboCount + 1})`;
        } else if (milestoneBonus > 0) {
          comboText = `BONUS! +${finalScoreGained} ⭐`;
        }

        this.combos = [...this.combos, {
          id: comboId,
          text: comboText,
          r: firstMerge.r,
          c: firstMerge.c,
          comboCount,
          scoreGained,
        }];

        const particleCount = comboCount >= 2 ? 24 : 16;
        const newParticles: { id: string, x: number, y: number, color: string, size: number, tx: number, ty: number }[] = [];
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
          const speed = 40 + Math.random() * (comboCount >= 2 ? 120 : 80);
          newParticles.push({
            id: this.generateId(),
            x: firstMerge.c,
            y: firstMerge.r,
            color: i % 3 === 0 ? '#ffffff' : this.getColorForValue(firstMerge.val),
            size: Math.round(5 + Math.random() * (comboCount >= 2 ? 12 : 8)), // 5–17px
            tx: Math.cos(angle) * speed,
            ty: Math.sin(angle) * speed,
          });
        }
        this.particles = [...this.particles, ...newParticles];

        setTimeout(() => {
          this.combos = this.combos.filter(x => x.id !== comboId);
        }, 1000);
        setTimeout(() => {
          const pIds = new Set(newParticles.map(p => p.id));
          this.particles = this.particles.filter(x => !pIds.has(x.id));
        }, 650);
      }

      this.noMergeDropStreak = 0;

      // Clear isMerging before next round
      setTimeout(() => {
        this.board = this.board.map(b => ({ ...b, isMerging: false }));
        this.processMerges(comboCount + 1);
      }, 300);
    } else {
      if (comboCount === 0) {
        this.noMergeDropStreak++;
      }
      if (this.config?.onSyncState) this.config.onSyncState();
      this.spawnBlock();
    }
  }

  private gameOver() {
    this.isDead = true;
    this.status = GameStatus.Finished;
    this.stop();
    this.activeBlock = null;
  }

  getColorForValue(val: number): string {
    switch (val) {
      case 2:      return '#FF5252';
      case 4:      return '#00E676';
      case 8:      return '#FFD600';
      case 16:     return '#2196F3';
      case 32:     return '#E040FB';
      case 64:     return '#FF6D00';
      case 128:    return '#FF9100';
      case 256:    return '#00BFA5';
      case 512:    return '#7C4DFF';
      case 1024:   return '#F50057';
      case 2048:   return '#FFC107';
      case 4096:   return '#AB47BC';
      case 8192:   return '#00ACC1';
      case 16384:  return '#EC407A';
      case 32768:  return '#2E7D32';
      case 65536:  return '#FF8F00';
      default:     return '#7E57C2';
    }
  }

  revive() {
    if (!this.isDead) return;

    if (this.board.length === 0) return;
    
    // Find the threshold value to destroy
    // Get unique sorted values on the board
    const uniqueValues = Array.from(new Set(this.board.map(b => b.val))).sort((a, b) => a - b);
    
    // Calculate the cutoff index (bottom 30% of unique values, but minimum up to value 16)
    let cutoffIndex = Math.max(1, Math.floor(uniqueValues.length * 0.3));
    let cutoffValue = Math.max(16, uniqueValues[cutoffIndex] || 16);

    const blocksToDestroy = this.board.filter(b => b.val <= cutoffValue);
    
    // Sort blocks randomly for a pop-corn effect
    blocksToDestroy.sort(() => Math.random() - 0.5);

    // Set playing state early so UI updates
    this.isDead = false;
    this.status = GameStatus.Playing;

    let delay = 0;
    const intervalTime = 80; // 80ms between each block explosion

    blocksToDestroy.forEach((block) => {
      setTimeout(() => {
        // Check if it's still on board
        const exists = this.board.find(b => b.id === block.id);
        if (!exists) return;

        // Spawn particles for this specific block — 360° radial burst
        const newParticles: { id: string, x: number, y: number, color: string, size: number, tx: number, ty: number }[] = [];
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
          const speed = 40 + Math.random() * 120;
          newParticles.push({
            id: this.generateId(),
            x: block.c,
            y: block.r,
            color: this.getColorForValue(block.val),
            size: Math.round(6 + Math.random() * 16),
            tx: Math.cos(angle) * speed,
            ty: Math.sin(angle) * speed,
          });
        }
        this.particles = [...this.particles, ...newParticles];

        // Remove from board
        this.board = this.board.filter(b => b.id !== block.id);

        // Sound, Vibration, Shake for each pop
        if (this.config?.onHaptic) this.config.onHaptic('medium');
        if (this.config?.onSound) this.config.onSound('drop');
        if (this.config?.onReviveShake) this.config.onReviveShake();

        // Clear particles after animation completes
        setTimeout(() => {
          const pIds = new Set(newParticles.map(p => p.id));
          this.particles = this.particles.filter(x => !pIds.has(x.id));
        }, 1200);

      }, delay);
      delay += intervalTime;
    });

    // After all explosions + a short beat, apply gravity and merges
    setTimeout(() => {
      // Apply gravity
      for (let c = 0; c < DROP2048_COLS; c++) {
        let colBlocks = this.board.filter(b => b.c === c).sort((a, b) => b.r - a.r);
        let bottomFree = DROP2048_ROWS - 1;
        for (let b of colBlocks) {
          if (b.r !== bottomFree) {
            b.r = bottomFree;
          }
          bottomFree--;
        }
      }
      
      this.processMerges(0);
    }, delay + 400); // 400ms after the last explosion
  }
}
