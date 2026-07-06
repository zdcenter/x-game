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
  ApplyGarbage = 'applyGarbage'
}

export type TetrisAction =
  | { type: TetrisActionType.MoveLeft }
  | { type: TetrisActionType.MoveRight }
  | { type: TetrisActionType.Rotate }
  | { type: TetrisActionType.SoftDrop }
  | { type: TetrisActionType.HardDrop }
  | { type: TetrisActionType.Hold }
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
}

export interface TetrisConfig {
  seed?: number;
  mode?: string;
  onSound?: (sound: 'move' | 'rotate' | 'land' | 'clear') => void;
  onGarbageSent?: (lines: number) => void;
  onSyncState?: () => void;
  onHardDrop?: () => void;
  onLevelUp?: (level: number) => void;
  onCombo?: (count: number) => void;
  onParticle?: (particle: any) => void;
  onShake?: () => void;
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

  private dropInterval: any;
  private localGarbageApplied = 0;
  private prng: PRNG | undefined;

  private config: TetrisConfig = {};

  constructor() {}

  initGame(config: TetrisConfig = {}): void {
    this.config = config;
    this.grid = getEmptyGrid();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.holdPiece = null;
    this.canHold = true;
    this.localGarbageApplied = 0;
    this.isDead = false;
    this.comboCount = 0;
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
    if (this.isDead || this.status !== GameStatus.Playing) return;

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
      case TetrisActionType.ApplyGarbage:
        this.applyGarbage(action.amount);
        break;
    }
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
    if (!this.canHold || !this.currentPiece) return;
    const hold = this.holdPiece;
    this.holdPiece = this.currentPiece.type;
    this.canHold = false;
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
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape, this.grid)) {
      this.currentPiece = { ...this.currentPiece, y: this.currentPiece.y + 1 };
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private hardDrop() {
    if (!this.currentPiece) return;
    let y = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, y + 1, this.currentPiece.shape, this.grid)) {
      y++;
      this.score += 2;
    }
    this.currentPiece = { ...this.currentPiece, y };
    this.config.onSound?.('land');
    this.config.onHardDrop?.();
    this.lockPiece();
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
    this.clearLines();

    if (this.config.mode === 'diff_pk_attack') {
      // Applied externally or here if we tracked it
    }

    this.spawnPiece();
  }

  private clearLines() {
    const currentGrid = this.grid;
    let linesCleared = 0;
    const newGrid = currentGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0 && cell !== Tetromino.GARBAGE);
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
      const lineScores = [0, 100, 300, 500, 800];
      this.score += lineScores[linesCleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;

      if (this.level > prevLevel) {
        this.config.onLevelUp?.(this.level);
      }

      this.comboCount++;
      if (this.comboCount >= 2) {
        const comboBonus = this.comboCount * 50 * this.level;
        this.score += comboBonus;
        this.config.onCombo?.(this.comboCount);
      }

      this.updateDropSpeed();
      this.config.onSound?.('clear');

      if (this.config.mode === 'diff_pk_attack' && linesCleared >= 2) {
        const garbageSent = linesCleared === 4 ? 4 : linesCleared - 1;
        this.config.onGarbageSent?.(garbageSent);
      }
    } else {
      this.comboCount = 0;
    }

    this.config.onSyncState?.();
  }

  private applyGarbage(totalGarbage: number) {
    if (totalGarbage > this.localGarbageApplied) {
      const garbageToApply = totalGarbage - this.localGarbageApplied;
      this.localGarbageApplied = totalGarbage;
      
      const currentGrid = this.grid;
      const newGrid = currentGrid.slice(garbageToApply);
      for (let i = 0; i < garbageToApply; i++) {
        const row = new Array(TETRIS_COLS).fill(Tetromino.GARBAGE);
        row[Math.floor(Math.random() * TETRIS_COLS)] = Tetromino.NONE;
        newGrid.push(row);
      }
      this.grid = newGrid;
    }
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

    this.isDead = false;
    this.status = GameStatus.Playing;
    
    // Select the bottom 12 rows
    const rowsToClear = 12;
    const startRow = TETRIS_ROWS - rowsToClear;

    // Collect all non-empty blocks in the bottom 12 rows
    const blocksToDestroy: {r: number, c: number, type: number}[] = [];
    for (let r = startRow; r < TETRIS_ROWS; r++) {
      for (let c = 0; c < TETRIS_COLS; c++) {
        if (this.grid[r][c] !== 0) {
          blocksToDestroy.push({r, c, type: this.grid[r][c]});
        }
      }
    }

    // Sort blocks randomly for a popcorn effect
    blocksToDestroy.sort(() => Math.random() - 0.5);

    // Sequential explosion — dramatic popcorn effect
    const intervalTime = 80; // 80ms between each block pop (matching Drop2048)
    blocksToDestroy.forEach((block, index) => {
      setTimeout(() => {
        // Destroy the block
        this.grid[block.r][block.c] = 0;
        
        // Shatter into 8 rectangular debris fragments
        const newParticles: any[] = [];
        const blockColor = TETROMINO_COLORS[block.type as Tetromino] || '#fff';
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.8;
          const speed = 15 + Math.random() * 40;
          // Mix of larger shards and small chips
          const isLarge = i < 3;
          newParticles.push({
            id: Math.random().toString(36).substring(2, 9),
            r: block.r,
            c: block.c,
            color: blockColor,
            w: isLarge ? 5 + Math.random() * 6 : 2 + Math.random() * 4,
            h: isLarge ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
            tx: Math.cos(angle) * speed,
            ty: Math.sin(angle) * speed + 8, // slight gravity pull downward
            rot: Math.floor(Math.random() * 360 - 180),
          });
        }
        this.particles = [...this.particles, ...newParticles];

        // Vibrate for haptic feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
        if (this.config.onSound) this.config.onSound('clear');

        // Sync to Angular signals
        this.config.onShake?.();

        // Clear particles after animation
        setTimeout(() => {
          const pIds = new Set(newParticles.map(pp => pp.id));
          this.particles = this.particles.filter(x => !pIds.has(x.id));
          this.config.onShake?.();
        }, 700);

        // If it's the last block, drop the remaining blocks and resume
        if (index === blocksToDestroy.length - 1) {
          setTimeout(() => {
            // Apply gravity to the remaining blocks
            this.applyGravity(startRow);
            this.currentPiece = null;
            this.spawnPiece();
            this.startGameLoop();
            this.config.onSyncState?.();
          }, 600);
        }
      }, index * intervalTime);
    });
    
    if (blocksToDestroy.length === 0) {
      // If bottom is already empty (rare), just resume
      this.currentPiece = null;
      this.spawnPiece();
      this.startGameLoop();
    }
  }

  private applyGravity(clearedStartRow: number) {
    const newGrid = getEmptyGrid();
    let writeRow = TETRIS_ROWS - 1;
    
    // Copy all rows that were not in the destroyed section (from top to clearedStartRow - 1)
    for (let r = clearedStartRow - 1; r >= 0; r--) {
      // Check if row has any blocks
      let hasBlocks = false;
      for (let c = 0; c < TETRIS_COLS; c++) {
        if (this.grid[r][c] !== 0) {
          hasBlocks = true;
          break;
        }
      }
      
      if (hasBlocks) {
        for (let c = 0; c < TETRIS_COLS; c++) {
          newGrid[writeRow][c] = this.grid[r][c];
        }
        writeRow--;
      }
    }
    
    this.grid = newGrid;
  }
}
