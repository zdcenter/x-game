import { GameStatus, GameStatusType, GameMode } from '../../../../core/models/game.model';
import { getEmptyGrid, Piece, rotateMatrix, Tetromino, TETROMINO_SHAPES, TETRIS_COLS, TETRIS_ROWS, TETROMINO_COLORS } from '../models/tetris.model';
import { PRNG } from '../../../../core/utils/prng';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export enum TetrisActionType {
  MoveLeft = 'moveLeft',
  MoveRight = 'moveRight',
  Rotate = 'rotate',
  SoftDrop = 'softDrop',
  HardDrop = 'hardDrop',
  Hold = 'hold',
  QueueGarbage = 'queueGarbage',
  ApplyGarbage = 'applyGarbage'
}

export type TetrisAction =
  | { type: TetrisActionType.MoveLeft }
  | { type: TetrisActionType.MoveRight }
  | { type: TetrisActionType.Rotate }
  | { type: TetrisActionType.SoftDrop }
  | { type: TetrisActionType.HardDrop }
  | { type: TetrisActionType.Hold }
  | { type: TetrisActionType.QueueGarbage; amount: number }
  | { type: TetrisActionType.ApplyGarbage; amount: number };

export interface TetrisState {
  grid: number[][];
  currentPiece: Piece | null;
  nextPieces: Tetromino[];
  holdPiece: Tetromino | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  status: GameStatusType;
  isDead: boolean;
  ghostY: number;
  comboCount: number;
  particles: any[];
  clearingRows: number[];
  isDissolving: boolean;
  dissolvingRows: number[];
  pendingGarbage: number;
  garbageLockUntil: number;
}

export interface TetrisConfig {
  seed?: number;
  mode?: string;
  onSound?: (sound: 'move' | 'rotate' | 'land' | 'clear' | 'hold' | 'hardDrop' | 'tetris' | 'dissolve' | 'attack' | 'garbage' | 'counter' | 'warning', linesCount?: number, combo?: number) => void;
  onHaptic?: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  onGarbageSent?: (lines: number) => void;
  onCounter?: (lines: number) => void;
  onGarbageWarning?: (pendingLines: number, incomingAmount?: number) => void;
  onGarbageRise?: (lines: number) => void;
  onSyncState?: () => void;
  onHardDrop?: () => void;
  onLevelUp?: (level: number) => void;
  onCombo?: (count: number) => void;
  onParticle?: (particle: any) => void;
  onShake?: () => void;
  onTetris?: () => void;
  onGameOver?: (score: number) => void;
}

export class TetrisEngine implements ILocalEngine<TetrisState, TetrisAction> {
  grid: number[][] = getEmptyGrid();
  currentPiece: Piece | null = null;
  nextPieces: Tetromino[] = [];
  holdPiece: Tetromino | null = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = 1;
  status: GameStatusType = GameStatus.Waiting;
  isDead = false;
  comboCount = 0;
  particles: any[] = [];
  clearingRows: number[] = [];
  isClearing = false;
  isDissolving = false;
  dissolvingRows: number[] = [];
  pendingGarbage = 0;
  garbageLockUntil = 0;

  private lastClearWasTetris = false;
  private dropInterval: any;
  private clearingTimer: any;
  private dissolveTimer: any;
  private garbageTimer: any;
  private localGarbageApplied = 0;
  private prng: PRNG | undefined;

  private config: TetrisConfig = {};

  get isRunning(): boolean {
    return this.status === GameStatus.Playing && !!this.dropInterval && !this.isDead;
  }

  constructor() {}

  initGame(config: TetrisConfig = {}): void {
    if (this.clearingTimer) {
      clearTimeout(this.clearingTimer);
      this.clearingTimer = null;
    }
    if (this.dissolveTimer) {
      clearTimeout(this.dissolveTimer);
      this.dissolveTimer = null;
    }
    if (this.garbageTimer) {
      clearTimeout(this.garbageTimer);
      this.garbageTimer = null;
    }
    this.config = config;
    this.grid = getEmptyGrid();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.holdPiece = null;
    this.canHold = true;
    this.localGarbageApplied = 0;
    this.pendingGarbage = 0;
    this.garbageLockUntil = 0;
    this.lastClearWasTetris = false;
    this.isDead = false;
    this.comboCount = 0;
    this.particles = [];
    this.clearingRows = [];
    this.isClearing = false;
    this.isDissolving = false;
    this.dissolvingRows = [];
    this.status = GameStatus.Playing;
    
    if (config.seed) {
      this.prng = new PRNG(config.seed);
    } else {
      this.prng = new PRNG(Date.now());
    }
    
    this.generateNextPieces();
    this.spawnPiece();
    this.startGameLoop();
  }

  stop() {
    this.status = GameStatus.Finished;
    if (this.clearingTimer) {
      clearTimeout(this.clearingTimer);
      this.clearingTimer = null;
    }
    if (this.dissolveTimer) {
      clearTimeout(this.dissolveTimer);
      this.dissolveTimer = null;
    }
    if (this.garbageTimer) {
      clearTimeout(this.garbageTimer);
      this.garbageTimer = null;
    }
    this.stopGameLoop();
  }

  getState(): TetrisState {
    return {
      grid: this.grid,
      currentPiece: this.currentPiece,
      nextPieces: this.nextPieces,
      holdPiece: this.holdPiece,
      canHold: this.canHold,
      score: this.score,
      lines: this.lines,
      level: this.level,
      status: this.status,
      isDead: this.isDead,
      ghostY: this.getGhostY(),
      comboCount: this.comboCount,
      particles: this.particles,
      clearingRows: this.clearingRows,
      isDissolving: this.isDissolving,
      dissolvingRows: this.dissolvingRows,
      pendingGarbage: this.pendingGarbage,
      garbageLockUntil: this.garbageLockUntil,
    };
  }

  private getGhostY(): number {
    if (!this.currentPiece) return -1;
    let y = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, y + 1, this.currentPiece.shape, this.grid)) {
      y++;
    }
    return y;
  }

  handleAction(action: TetrisAction): void {
    if (this.isDead || this.status !== GameStatus.Playing || this.isClearing) return;

    switch (action.type) {
      case TetrisActionType.MoveLeft:
        this.moveLeft();
        break;
      case TetrisActionType.MoveRight:
        this.moveRight();
        break;
      case TetrisActionType.Rotate:
        this.rotate();
        break;
      case TetrisActionType.SoftDrop:
        this.softDrop();
        break;
      case TetrisActionType.HardDrop:
        this.hardDrop();
        break;
      case TetrisActionType.Hold:
        this.hold();
        break;
      case TetrisActionType.QueueGarbage:
        this.queueGarbage(action.amount);
        break;
      case TetrisActionType.ApplyGarbage:
        this.queueGarbage(action.amount);
        break;
    }
  }

  queueGarbage(amount: number) {
    if (amount <= 0) return;
    this.pendingGarbage += amount;
    // 2.5s Buffer Warning Window: Gives defender 2.5s of preparation/counterplay before garbage lines actually arrive!
    this.garbageLockUntil = Date.now() + 2500;
    this.config.onSound?.('warning');
    this.config.onGarbageWarning?.(this.pendingGarbage, amount);
    this.config.onSyncState?.();

    if (this.garbageTimer) {
      clearTimeout(this.garbageTimer);
    }
    this.garbageTimer = setTimeout(() => {
      this.garbageTimer = null;
      this.flushGarbageRise();
    }, 2500);
  }

  private shuffleBag(arr: number[]): number[] {
    const p = this.prng;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor((p ? p.next() : Math.random()) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private generateNextPieces() {
    const bag1 = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
    const bag2 = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
    this.nextPieces = [...bag1, ...bag2];
  }

  private spawnPiece(type?: Tetromino) {
    if (!type) {
      const next = this.nextPieces;
      type = next.shift()!;
      if (next.length < 5) {
        const bag = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
        next.push(...bag);
      }
      this.nextPieces = [...next];
    }

    const shape = TETROMINO_SHAPES[type];
    const piece: Piece = {
      type,
      shape,
      x: Math.floor(TETRIS_COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0
    };

    if (this.checkCollision(piece.x, piece.y, piece.shape, this.grid)) {
      this.triggerGameOver();
      return;
    }
    
    this.currentPiece = piece;
    this.canHold = true;
  }

  private hold() {
    if (!this.canHold || !this.currentPiece || this.isClearing) return;
    const hold = this.holdPiece;
    this.holdPiece = this.currentPiece.type;
    this.canHold = false;
    this.config.onSound?.('hold');
    this.spawnPiece(hold || undefined);
  }

  private moveLeft() {
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.shape, this.grid)) {
      this.currentPiece = { ...this.currentPiece, x: this.currentPiece.x - 1 };
      this.config.onSound?.('move');
    }
  }

  private moveRight() {
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.shape, this.grid)) {
      this.currentPiece = { ...this.currentPiece, x: this.currentPiece.x + 1 };
      this.config.onSound?.('move');
    }
  }

  private rotate() {
    if (!this.currentPiece) return;
    const rotated = rotateMatrix(this.currentPiece.shape);
    // SRS-style wall kick: try offsets until one fits
    const kicks = [[0,0], [-1,0], [1,0], [-2,0], [2,0], [0,-1]];
    for (const [dx, dy] of kicks) {
      const nx = this.currentPiece.x + dx;
      const ny = this.currentPiece.y + dy;
      if (!this.checkCollision(nx, ny, rotated, this.grid)) {
        this.currentPiece = { ...this.currentPiece, x: nx, y: ny, shape: rotated };
        this.config.onSound?.('rotate');
        return;
      }
    }
  }

  private softDrop() {
    if (!this.currentPiece || this.isClearing) return;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape, this.grid)) {
      this.currentPiece = { ...this.currentPiece, y: this.currentPiece.y + 1 };
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private hardDrop() {
    if (!this.currentPiece || this.isClearing) return;
    let y = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, y + 1, this.currentPiece.shape, this.grid)) {
      y++;
      this.score += 2;
    }
    this.currentPiece = { ...this.currentPiece, y };
    this.config.onSound?.('hardDrop');
    this.config.onHardDrop?.();
    this.lockPiece();
  }

  private spawnClearParticles(rows: number[]) {
    const newParticles: any[] = [];
    rows.forEach(r => {
      for (let c = 0; c < TETRIS_COLS; c += 2) {
        const val = this.grid[r]?.[c] || 1;
        const color = TETROMINO_COLORS[val as Tetromino] || '#38bdf8';
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 15 + Math.random() * 35;
          newParticles.push({
            id: Math.random().toString(36).substring(2, 9),
            r,
            c,
            color,
            w: 3 + Math.random() * 4,
            h: 3 + Math.random() * 4,
            tx: Math.cos(angle) * speed,
            ty: Math.sin(angle) * speed - 6,
            rot: Math.floor(Math.random() * 360 - 180),
          });
        }
      }
    });
    this.particles = [...this.particles.slice(-40), ...newParticles];
  }

  private lockPiece() {
    if (!this.currentPiece) return;

    const newGrid = this.grid.map(row => [...row]);
    this.currentPiece.shape.forEach((row, dy) => {
      row.forEach((val, dx) => {
        if (val !== 0) {
          const cy = this.currentPiece!.y + dy;
          const cx = this.currentPiece!.x + dx;
          if (cy >= 0 && cy < TETRIS_ROWS && cx >= 0 && cx < TETRIS_COLS) {
            newGrid[cy][cx] = val;
          }
        }
      });
    });

    this.grid = newGrid;
    this.currentPiece = null;

    // Check for full rows (any non-zero block including garbage counts)
    const fullRows: number[] = [];
    for (let r = 0; r < TETRIS_ROWS; r++) {
      if (this.grid[r].every(cell => cell !== 0 && cell !== Tetromino.NONE)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length === 0) {
      this.comboCount = 0;
      this.lastClearWasTetris = false;
      // If 2.5s buffer already expired and garbage hasn't risen yet, rise now!
      if (this.pendingGarbage > 0 && Date.now() >= this.garbageLockUntil) {
        if (this.garbageTimer) {
          clearTimeout(this.garbageTimer);
          this.garbageTimer = null;
        }
        this.flushGarbageRise();
      }
      this.spawnPiece();
      this.config.onSyncState?.();
      return;
    }

    // Dynamic line clear sequence (180ms snappy burst)
    this.isClearing = true;
    this.clearingRows = fullRows;
    this.spawnClearParticles(fullRows);

    this.comboCount++;
    this.config.onSound?.('clear', fullRows.length, this.comboCount);
    if (fullRows.length >= 4) {
      this.config.onTetris?.();
      this.config.onSound?.('tetris', 4, this.comboCount);
    }
    this.config.onShake?.();
    this.config.onSyncState?.();

    if (this.clearingTimer) clearTimeout(this.clearingTimer);
    this.clearingTimer = setTimeout(() => {
      this.clearLines();
      this.clearingRows = [];
      this.isClearing = false;
      this.spawnPiece();
    }, 180);
  }

  private clearLines() {
    const currentGrid = this.grid;
    let linesCleared = 0;
    const newGrid = currentGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0 && cell !== Tetromino.NONE);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newGrid.length < TETRIS_ROWS) {
      newGrid.unshift(new Array(TETRIS_COLS).fill(0));
    }

    if (linesCleared > 0) {
      this.grid = newGrid;
      this.lines += linesCleared;

      const prevLevel = this.level;
      // 官方现代 Tetris Guideline 国际标准计分:
      // Single: 100 * level, Double: 300 * level, Triple: 500 * level, Tetris: 800 * level
      const lineScores = [0, 100, 300, 500, 800];
      let lineBaseScore = lineScores[linesCleared] * this.level;

      // 连续高难度消除 Back-to-Back (B2B) 1.5 倍加成 (800 * 1.5 = 1200 * level)
      const isB2B = linesCleared === 4 && this.lastClearWasTetris;
      if (isB2B) {
        lineBaseScore = Math.floor(lineBaseScore * 1.5);
      }

      // 记录本次消除是否为四行 Tetris，用于维护 B2B 连续状态
      if (linesCleared === 4) {
        this.lastClearWasTetris = true;
      } else if (linesCleared > 0) {
        this.lastClearWasTetris = false;
      }

      // Check Perfect Clear (Board Wipe 全清奖励)
      const isAllClear = this.grid.every(row => row.every(cell => cell === 0));
      if (isAllClear) {
        lineBaseScore += 2000 * this.level;
      }

      this.score += lineBaseScore;
      this.level = Math.floor(this.lines / 10) + 1;

      if (this.level > prevLevel) {
        this.config.onLevelUp?.(this.level);
      }

      if (this.comboCount >= 2) {
        // Guideline 连击得分: 50 * (combo - 1) * level
        const comboBonus = (this.comboCount - 1) * 50 * this.level;
        this.score += comboBonus;
        this.config.onCombo?.(this.comboCount);
      }

      this.updateDropSpeed();

      // Battle PK Attack & Counter Logic (Active in any non-single battle mode)
      const isBattleMode = this.config.mode !== GameMode.Single;
      if (isBattleMode) {
        let attackLines = 0;
        if (linesCleared === 2) attackLines = 1;
        else if (linesCleared === 3) attackLines = 2;
        else if (linesCleared === 4) attackLines = 4;

        if (linesCleared === 4 && isB2B) {
          attackLines += 1; // Back-to-Back Tetris bonus!
        }

        if (isAllClear) {
          attackLines += 4; // Perfect Clear nuke!
        }

        if (this.comboCount >= 2) {
          attackLines += Math.min(3, Math.floor(this.comboCount / 2));
        }

        if (attackLines > 0) {
          let netAttack = attackLines;
          // Priority 1: Counter incoming pending garbage in queue!
          if (this.pendingGarbage > 0) {
            const countered = Math.min(this.pendingGarbage, attackLines);
            this.pendingGarbage -= countered;
            netAttack = attackLines - countered;
            if (this.pendingGarbage === 0) {
              this.garbageLockUntil = 0;
              if (this.garbageTimer) {
                clearTimeout(this.garbageTimer);
                this.garbageTimer = null;
              }
            }
            this.config.onCounter?.(countered);
            this.config.onSound?.('counter', countered);
          }

          // Priority 2: Fire remaining attack lines to opponents!
          if (netAttack > 0) {
            this.config.onGarbageSent?.(netAttack);
            this.config.onSound?.('attack', netAttack);
          }
        }
      }
    }

    this.config.onSyncState?.();
  }

  private flushGarbageRise() {
    if (this.pendingGarbage <= 0 || this.status !== GameStatus.Playing || this.isDead) {
      this.garbageLockUntil = 0;
      return;
    }

    const riseCount = Math.min(this.pendingGarbage, 4);
    this.pendingGarbage -= riseCount;
    this.garbageLockUntil = 0;

    // Check top-out collision before lifting
    let topOut = false;
    for (let r = 0; r < riseCount; r++) {
      if (this.grid[r].some(cell => cell !== 0 && cell !== Tetromino.NONE)) {
        topOut = true;
        break;
      }
    }

    const currentGrid = this.grid;
    const newGrid = currentGrid.slice(riseCount);
    // Generate irregular garbage rows with 2 to 3 holes per row (independent columns per row, preventing single-bar wipes)
    for (let i = 0; i < riseCount; i++) {
      const row = new Array(TETRIS_COLS).fill(Tetromino.GARBAGE);
      const numHoles = Math.random() < 0.5 ? 2 : 3;
      const holeCols = new Set<number>();
      while (holeCols.size < numHoles) {
        holeCols.add(Math.floor(Math.random() * TETRIS_COLS));
      }
      for (const col of holeCols) {
        row[col] = Tetromino.NONE;
      }
      newGrid.push(row);
    }
    this.grid = newGrid;

    // If active piece exists and collides with newly risen grid, adjust active piece Y upward
    if (this.currentPiece) {
      while (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape, this.grid) && this.currentPiece.y > -2) {
        this.currentPiece.y--;
      }
    }

    this.config.onGarbageRise?.(riseCount);
    this.config.onSound?.('garbage', riseCount);
    this.config.onShake?.();

    if (topOut) {
      this.isDead = true;
      this.status = GameStatus.Finished;
      this.stop();
      this.config.onGameOver?.(this.score);
    } else if (this.pendingGarbage > 0) {
      // More than 4 lines: queue next wave after 1s
      this.garbageLockUntil = Date.now() + 1000;
      this.garbageTimer = setTimeout(() => {
        this.garbageTimer = null;
        this.flushGarbageRise();
      }, 1000);
    }
    this.config.onSyncState?.();
  }

  private startGameLoop() {
    this.updateDropSpeed();
  }

  private stopGameLoop() {
    if (this.dropInterval) {
      clearInterval(this.dropInterval);
      this.dropInterval = null;
    }
  }

  private updateDropSpeed() {
    this.stopGameLoop();
    // 20-level curve: smooth progression with no hard cap
    const speeds = [1000,900,800,700,600,500,400,300,200,150,120,100,80,65,50,40,33,27,20,15];
    const speed = speeds[Math.min(this.level - 1, 19)];
    this.dropInterval = setInterval(() => {
      if (this.status === GameStatus.Playing) {
        this.softDrop();
      }
    }, speed);
  }

  private triggerGameOver() {
    this.isDead = true;
    this.status = GameStatus.Finished;
    this.stopGameLoop();
    this.config.onGameOver?.(this.score);
  }

  private checkCollision(x: number, y: number, shape: number[][], grid: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = y + r;
          const nx = x + c;
          if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS || (ny >= 0 && grid[ny][nx] !== 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  revive() {
    if (!this.isDead || (this.config.mode && this.config.mode !== GameMode.Single && this.config.mode !== 'single')) return;

    if (this.dissolveTimer) {
      clearTimeout(this.dissolveTimer);
      this.dissolveTimer = null;
    }

    // 计算消融区域：消融导致死亡的上方堆叠危险方块（自最高有方块行向下消融 10 行）
    let minOccupiedRow = TETRIS_ROWS;
    for (let r = 0; r < TETRIS_ROWS; r++) {
      if (this.grid[r].some(c => c !== 0)) {
        minOccupiedRow = r;
        break;
      }
    }

    const rowsToClearCount = 10;
    const startRow = Math.max(0, Math.min(minOccupiedRow, TETRIS_ROWS - rowsToClearCount));
    const endRow = Math.min(TETRIS_ROWS - 1, startRow + rowsToClearCount - 1);

    const rowsToDissolve: number[] = [];
    for (let r = startRow; r <= endRow; r++) {
      rowsToDissolve.push(r);
    }

    this.isDissolving = true;
    this.dissolvingRows = rowsToDissolve;

    // 播放专属消融升华音效与微触感
    this.config.onSound?.('dissolve');
    if (this.config.onHaptic) this.config.onHaptic('medium');

    // 生成微光向上升腾的消融光尘粒子 (Dissolve Embers)
    const newParticles: any[] = [];
    rowsToDissolve.forEach((r, rowIdx) => {
      for (let c = 0; c < TETRIS_COLS; c++) {
        const val = this.grid[r][c];
        if (val !== 0) {
          const blockColor = TETROMINO_COLORS[val as Tetromino] || '#38bdf8';
          for (let i = 0; i < 3; i++) {
            const spreadX = (Math.random() - 0.5) * 20;
            const floatUpY = -(16 + Math.random() * 28);
            newParticles.push({
              id: Math.random().toString(36).substring(2, 9),
              r,
              c,
              color: i === 0 ? '#ffffff' : i === 1 ? '#38bdf8' : blockColor,
              w: 2 + Math.random() * 2,
              h: 2 + Math.random() * 2,
              tx: spreadX,
              ty: floatUpY,
              rot: Math.floor(Math.random() * 180 - 90),
              delay: rowIdx * 30 + c * 8,
            });
          }
        }
      }
    });

    this.particles = [...this.particles.slice(-40), ...newParticles];
    this.config.onSyncState?.();

    // 550ms 消融动画后完成结算、沉降与恢复游戏
    this.dissolveTimer = setTimeout(() => {
      // 清空消融区域
      for (const r of rowsToDissolve) {
        for (let c = 0; c < TETRIS_COLS; c++) {
          this.grid[r][c] = 0;
        }
      }

      // 将未消融的存量方块平整落位到底部
      this.collapseRemainingRows();

      // 清理消融粒子
      const pIds = new Set(newParticles.map(p => p.id));
      this.particles = this.particles.filter(x => !pIds.has(x.id));

      this.isDissolving = false;
      this.dissolvingRows = [];
      this.isDead = false;
      this.status = GameStatus.Playing;
      this.currentPiece = null;
      this.spawnPiece();
      this.startGameLoop();
      this.config.onSyncState?.();
    }, 550);
  }

  private collapseRemainingRows() {
    const newGrid = getEmptyGrid();
    let writeRow = TETRIS_ROWS - 1;
    for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
      if (this.grid[r].some(c => c !== 0)) {
        for (let c = 0; c < TETRIS_COLS; c++) {
          newGrid[writeRow][c] = this.grid[r][c];
        }
        writeRow--;
      }
    }
    this.grid = newGrid;
  }
}
