import { GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export const DROP2048_ROWS = 7;
export const DROP2048_COLS = 5;

export interface DropBlock {
  id: string; // Unique ID for DOM tracking
  val: number;
  r: number;
  c: number;
  mergedFrom?: string[]; // IDs of blocks that merged into this
  isNew?: boolean;
}

export interface ComboText {
  id: string;
  text: string;
  r: number;
  c: number;
}

export interface Drop2048State {
  board: DropBlock[];
  activeBlock: { id: string, val: number, c: number, r: number } | null;
  nextVal: number;
  score: number;
  isDead: boolean;
  combos: ComboText[];
  particles: { id: string, x: number, y: number, color: string }[];
  level: number;
}

export enum Drop2048ActionType {
  MoveLeft = 'MoveLeft',
  MoveRight = 'MoveRight',
  Drop = 'Drop'
}

export interface Drop2048Action {
  type: Drop2048ActionType;
}

export interface Drop2048EngineConfig {
  mode?: GameModeType | string;
  seed?: number;
  onSound?: (sound: 'move' | 'drop' | 'merge', comboCount?: number) => void;
  onSyncState?: () => void;
}

export class Drop2048Engine implements ILocalEngine<Drop2048State, Drop2048Action> {
  // Local state
  board: DropBlock[] = [];
  activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  nextVal: number = 2;
  score: number = 0;
  isDead: boolean = false;
  combos: ComboText[] = [];
  particles: { id: string, x: number, y: number, color: string }[] = [];
  
  status: GameStatusType = GameStatus.Waiting;

  // Internal loop & logic
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
    this.nextVal = 2;
    this.status = GameStatus.Playing;
    
    this.stop();
    this.spawnBlock();
  }

  loadState(state: any): void {
    if (!state) return;
    this.board = state.board || [];
    this.activeBlock = state.activeBlock || null;
    this.nextVal = state.nextVal || 2;
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
      score: this.score,
      isDead: this.isDead,
      combos: this.combos,
      particles: this.particles,
      level: this.getLevel()
    };
  }

  getLevel(): number {
    if (this.score < 1000) return 1;
    if (this.score < 3000) return 2;
    if (this.score < 6000) return 3;
    if (this.score < 10000) return 4;
    if (this.score < 20000) return 5;
    if (this.score < 40000) return 6;
    return 7;
  }

  private getDropSpeed(): number {
    const lvl = this.getLevel();
    switch (lvl) {
      case 1: return 1000;
      case 2: return 800;
      case 3: return 600;
      case 4: return 500;
      case 5: return 400;
      case 6: return 300;
      default: return 200;
    }
  }

  private generateRandomValue(): number {
    const r = Math.random();
    const lvl = this.getLevel();
    
    if (lvl >= 5) {
      if (r < 0.1) return 2;
      if (r < 0.3) return 4;
      if (r < 0.5) return 8;
      if (r < 0.7) return 16;
      if (r < 0.85) return 32;
      if (r < 0.95) return 64;
      return 128;
    } else if (lvl >= 3) {
      if (r < 0.2) return 2;
      if (r < 0.45) return 4;
      if (r < 0.65) return 8;
      if (r < 0.85) return 16;
      if (r < 0.95) return 32;
      return 64;
    } else {
      if (r < 0.3) return 2;
      if (r < 0.55) return 4;
      if (r < 0.75) return 8;
      if (r < 0.88) return 16;
      if (r < 0.96) return 32;
      return 64;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private spawnBlock() {
    if (this.isDead) return;

    const val = this.nextVal;
    this.nextVal = this.generateRandomValue();
    
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

    const newBlock: DropBlock = { id: curr.id, val: curr.val, r: targetR, c: curr.c, isNew: true };
    this.board = [...this.board, newBlock];
    
    if (this.config?.onSound) this.config.onSound('drop');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);

    setTimeout(() => this.processMerges(0), 150);
  }

  private processMerges(comboCount: number) {
    if (this.isDead) return;

    let board = [...this.board];
    let hasMerged = false;
    let scoreGained = 0;
    
    let toRemove = new Set<string>();
    let toUpdate = new Map<string, DropBlock>();

    for (let r = DROP2048_ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < DROP2048_COLS; c++) {
        const block = board.find(b => b.r === r && b.c === c && !toRemove.has(b.id));
        if (!block) continue;

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

      // Apply gravity to merged board
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
      this.score += scoreGained;
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (comboCount > 1) navigator.vibrate([30, 50, 30]);
        else navigator.vibrate(20);
      }
      
      if (this.config?.onSound) this.config.onSound('merge', comboCount);
      
      if (comboCount > 0) {
        const comboId = this.generateId();
        const firstMerge = Array.from(toUpdate.values())[0];
        if (firstMerge) {
          this.combos = [...this.combos, { id: comboId, text: '+' + scoreGained, r: firstMerge.r, c: firstMerge.c }];
          
          const newParticles: any[] = [];
          for (let i = 0; i < 8; i++) {
            newParticles.push({
              id: this.generateId(),
              x: firstMerge.c,
              y: firstMerge.r,
              color: this.getColorForValue(firstMerge.val)
            });
          }
          this.particles = [...this.particles, ...newParticles];
          
          setTimeout(() => {
            this.combos = this.combos.filter(x => x.id !== comboId);
          }, 1000);
          setTimeout(() => {
            const pIds = new Set(newParticles.map(p => p.id));
            this.particles = this.particles.filter(x => !pIds.has(x.id));
          }, 600);
        }
      }

      setTimeout(() => this.processMerges(comboCount + 1), 300);
    } else {
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
      case 2: return '#ef4444'; // red-500
      case 4: return '#22c55e'; // green-500
      case 8: return '#eab308'; // yellow-500
      case 16: return '#3b82f6'; // blue-500
      case 32: return '#a855f7'; // purple-500
      case 64: return '#ec4899'; // pink-500
      case 128: return '#f97316'; // orange-500
      case 256: return '#14b8a6'; // teal-500
      case 512: return '#6366f1'; // indigo-500
      case 1024: return '#e11d48'; // rose-600
      case 2048: return '#d97706'; // amber-600
      default: return '#fbbf24'; // amber-400
    }
  }
}
