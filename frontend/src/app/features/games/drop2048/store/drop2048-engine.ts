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
  particles: { id: string, x: number, y: number, color: string, size: number }[];
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
      background: 'linear-gradient(135deg, #ff007f, #7928ca, #0070f3, #00dfd8)',
      'box-shadow': 'inset 0 4px 0 rgba(255,255,255,0.6), inset 0 -4px 0 rgba(0,0,0,0.3), 0 0 20px rgba(0,223,216,0.6), 0 0 35px rgba(255,0,127,0.4)',
      animation: 'rainbow-pulse 2s infinite ease-in-out'
    };
  }

  const g: Record<number, [string, string]> = {
    2:    ['#FF5252', '#D50000'],
    4:    ['#00E676', '#00C853'],
    8:    ['#FFD600', '#FF8F00'],
    16:   ['#2196F3', '#0D47A1'],
    32:   ['#E040FB', '#AA00FF'],
    64:   ['#FF6D00', '#E65100'],
    128:  ['#FF9100', '#E65C00'],
    256:  ['#00BFA5', '#00796B'],
    512:  ['#7C4DFF', '#4527A0'],
    1024: ['#F50057', '#B71C1C'],
    2048: ['#FFD740', '#FF6D00'],
  };
  const [c1, c2] = g[val] || ['#78909C', '#455A64'];
  const glowPx = val >= 8 ? Math.min(10 + Math.log2(val) * 2.5, 32) : 4;
  const glowOpacity = val >= 128 ? 'ee' : val >= 32 ? 'cc' : 'aa';
  const shadows = [
    'inset 0 4px 0 rgba(255,255,255,0.38)',
    'inset 0 -5px 0 rgba(0,0,0,0.40)',
    '0 6px 12px rgba(0,0,0,0.5)',
    `0 0 ${glowPx}px ${c1}${glowOpacity}`,
  ].join(', ');
  return { background: `linear-gradient(145deg, ${c1}, ${c2})`, 'box-shadow': shadows };
}

export class Drop2048Engine implements ILocalEngine<Drop2048State, Drop2048Action> {
  board: DropBlock[] = [];
  activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  nextVal: number = 2;
  nextVal2: number = 4;
  score: number = 0;
  isDead: boolean = false;
  combos: ComboText[] = [];
  particles: { id: string, x: number, y: number, color: string, size: number }[] = [];
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
    const speeds = [1500, 1200, 950, 750, 560, 400, 300, 240, 190, 150];
    return speeds[Math.min(this.getLevel() - 1, 9)];
  }

  private dropCount: number = 0;
  private noMergeDropStreak: number = 0;

  private generateRandomValue(): number {
    this.dropCount++;

    // 1. 彩虹万能方块 🌈 (Wild Block)
    // 触发时机：每20次下落必出一次保底；或者连续5次下落未能发生合并时，有 15% 几率救急掉落
    const isWildGuaranteed = this.dropCount > 0 && this.dropCount % 20 === 0;
    const isWildStuckSave = this.noMergeDropStreak >= 5 && Math.random() < 0.15;
    if (this.board.length > 0 && (isWildGuaranteed || isWildStuckSave)) {
      return WILD_BLOCK_VAL;
    }

    const lvl = this.getLevel();
    const levelFloors = [8, 16, 32, 32, 64, 64, 128, 128, 256, 256];
    const levelFloor = levelFloors[Math.min(lvl - 1, 9)];

    // 棋盘上目前所有的方块数值
    const boardValues = this.board.map(b => b.val).filter(v => v > 0);
    const boardMax = boardValues.length > 0 ? Math.max(...boardValues) : 0;
    const ceiling = Math.min(Math.max(levelFloor, boardMax > 0 ? boardMax / 4 : levelFloor), 1024);

    // 2. 动态阶梯淘汰机制 (Tile Deprecation)
    // 只有当场上已经完全没有该较小数值时，才正式从掉落牌池淘汰，绝不让场上残存的小数成为死子！
    let minFloor = 2;
    if (boardMax >= 512 && !boardValues.includes(2)) {
      minFloor = 4;
    }
    if (boardMax >= 1024 && !boardValues.includes(2) && !boardValues.includes(4)) {
      minFloor = 8;
    }
    if (boardMax >= 2048 && !boardValues.includes(2) && !boardValues.includes(4) && !boardValues.includes(8)) {
      minFloor = 16;
    }

    // 3. 智能盘面感知补牌 (Smart Spawner)
    // 识别当前每列最上方暴露的方块数字，以及数量为奇数的孤立数字
    const exposedTops = new Set<number>();
    for (let c = 0; c < DROP2048_COLS; c++) {
      const colBlocks = this.board.filter(b => b.c === c && b.val > 0).sort((a, b) => a.r - b.r);
      if (colBlocks.length > 0) {
        exposedTops.add(colBlocks[0].val);
      }
    }

    // 统计场上出现次数为奇数（落单需要凑对）的数字
    const counts = new Map<number, number>();
    for (const v of boardValues) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const oddValCandidates = Array.from(counts.entries())
      .filter(([val, count]) => count % 2 === 1 && val <= ceiling)
      .map(([val]) => val);

    // 综合急需的数字清单
    const urgentNeeded = Array.from(new Set([...exposedTops, ...oddValCandidates]))
      .filter(v => v >= minFloor && v <= ceiling);

    // 约 38% 的概率定向从急需救急列表中发放，解救孤立死子
    if (urgentNeeded.length > 0 && Math.random() < 0.38) {
      return urgentNeeded[Math.floor(Math.random() * urgentNeeded.length)];
    }

    // 4. 标准加权掉落池
    const pool: number[] = [];
    for (let v = minFloor; v <= ceiling; v *= 2) {
      pool.push(v);
    }

    const n = pool.length;
    if (n === 1) return pool[0];

    // 权重峰值分布
    const weights = pool.map((_, i) => Math.max(2, 10 - Math.abs(i - (n - 2)) * 3));
    const total = weights.reduce((s, w) => s + w, 0);

    let acc = 0;
    const r = Math.random();
    for (let i = 0; i < pool.length; i++) {
      acc += weights[i] / total;
      if (r < acc) return pool[i];
    }
    return pool[pool.length - 1];
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
      this.score += scoreGained;
      const newLevel = this.getLevel();
      if (newLevel > prevLevel && this.config?.onLevelUp) {
        this.config.onLevelUp(newLevel);
      }
      this.lastComboCount = comboCount;

      if (this.config?.onHaptic) {
        if (comboCount > 1) this.config.onHaptic('success');
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

        // 连击街机级赞赏词体系 (Arcade Praise)
        let comboText = '+' + scoreGained;
        if (comboCount >= 1) {
          const praiseWords = ['GREAT! 🔥', 'AMAZING! ⚡', 'SUPER! 💥', 'UNREAL! 🌟', 'LEGENDARY! 👑'];
          const praise = praiseWords[Math.min(comboCount - 1, praiseWords.length - 1)];
          comboText = `${praise} ×${comboCount + 1}`;
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
        const newParticles: { id: string, x: number, y: number, color: string, size: number }[] = [];
        for (let i = 0; i < particleCount; i++) {
          newParticles.push({
            id: this.generateId(),
            x: firstMerge.c,
            y: firstMerge.r,
            color: this.getColorForValue(firstMerge.val),
            size: Math.round(4 + Math.random() * (comboCount >= 2 ? 14 : 10)), // 4–18px
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
      case 2:    return '#ff6b6b';
      case 4:    return '#2ecc71';
      case 8:    return '#f1c40f';
      case 16:   return '#5dade2';
      case 32:   return '#a569bd';
      case 64:   return '#f1948a';
      case 128:  return '#f39c12';
      case 256:  return '#1abc9c';
      case 512:  return '#7f8ff4';
      case 1024: return '#ec407a';
      case 2048: return '#ffca28';
      default:   return '#fbbf24';
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
