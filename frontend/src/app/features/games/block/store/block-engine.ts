import { GameDifficulty, GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { BlockShape, getRandomShapes } from '../utils/shapes';

export interface BlockGameState {
  board: number[][];
  hand: (BlockShape | null)[];
  score: number;
  isDead: boolean;
  boardSize: number;
}

export enum BlockActionType {
  Place = 'Place'
}

export interface BlockAction {
  type: BlockActionType;
  handIndex?: number;
  startRow?: number;
  startCol?: number;
}

export interface BlockEngineConfig {
  mode?: GameModeType | string;
  seed?: number; // TBD: Use seed for multiplayer hand sync
  difficulty?: string;
  onSound?: (sound: 'place' | 'clear' | 'error', combo?: number) => void;
  onSyncState?: () => void;
  onLinesClear?: (count: number, rows: number[], cols: number[]) => void;
}

export class BlockEngine implements ILocalEngine<BlockGameState, BlockAction> {
  boardSize = 10;
  board: number[][] = [];
  hand: (BlockShape | null)[] = [null, null, null];
  score: number = 0;
  combo: number = 0;
  isDead: boolean = false;
  
  status: GameStatusType = GameStatus.Waiting;
  
  private config?: BlockEngineConfig;

  configure(config: Partial<BlockEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  initGame(config?: BlockEngineConfig): void {
    if (config) {
      this.configure(config);
    }
    
    // Set board size based on difficulty
    const diff = this.config?.difficulty || config?.difficulty || GameDifficulty.Medium;
    this.boardSize = diff === GameDifficulty.Easy ? 8 : (diff === GameDifficulty.Hard ? 12 : 10);
    
    this.board = this.createEmptyBoard(this.boardSize);
    this.hand = getRandomShapes(3);
    this.score = 0;
    this.combo = 0;
    this.isDead = false;
    this.status = GameStatus.Playing;
  }

  loadState(state: any, config?: Partial<BlockEngineConfig>): void {
    if (config) {
      this.configure(config);
    }
    if (!state) return;
    this.boardSize = state.size || 10;
    this.board = state.board || this.createEmptyBoard(this.boardSize);
    this.score = state.score || 0;
    
    const loadedHand = state.hand || [null, null, null];
    if (loadedHand.every((s: any) => s === null)) {
      this.hand = getRandomShapes(3);
    } else {
      this.hand = loadedHand;
    }
    
    this.isDead = false;
    this.status = GameStatus.Playing;
  }

  stop(): void {
    // No continuous loop to stop
  }

  handleAction(action: BlockAction): void {
    if (this.isDead || this.status !== GameStatus.Playing) return;

    if (action.type === BlockActionType.Place) {
      if (action.handIndex !== undefined && action.startRow !== undefined && action.startCol !== undefined) {
        this.placeShape(action.handIndex, action.startRow, action.startCol);
      }
    }
  }

  getState(): BlockGameState {
    return {
      board: this.board.map(row => [...row]),
      hand: [...this.hand],
      score: this.score,
      isDead: this.isDead,
      boardSize: this.boardSize
    };
  }

  private createEmptyBoard(size: number): number[][] {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  private canPlace(shape: BlockShape, startRow: number, startCol: number, currentBoard: number[][]): boolean {
    const size = this.boardSize;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          const br = startRow + r;
          const bc = startCol + c;
          if (br < 0 || br >= size || bc < 0 || bc >= size) return false;
          if (currentBoard[br][bc] !== 0) return false;
        }
      }
    }
    return true;
  }

  private placeShape(handIndex: number, startRow: number, startCol: number): boolean {
    const shape = this.hand[handIndex];
    if (!shape) return false;

    if (!this.canPlace(shape, startRow, startCol, this.board)) return false;

    // Place the shape
    let blocksPlaced = 0;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          this.board[startRow + r][startCol + c] = shape.id;
          blocksPlaced++;
        }
      }
    }

    // Check for cleared lines
    const size = this.boardSize;
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    for (let r = 0; r < size; r++) {
      if (this.board[r].every(cell => cell !== 0)) rowsToClear.push(r);
    }
    for (let c = 0; c < size; c++) {
      let isFull = true;
      for (let r = 0; r < size; r++) {
        if (this.board[r][c] === 0) { isFull = false; break; }
      }
      if (isFull) colsToClear.push(c);
    }

    // Clear lines
    rowsToClear.forEach(r => {
      for (let c = 0; c < size; c++) this.board[r][c] = 0;
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < size; r++) this.board[r][c] = 0;
    });

    const linesCleared = rowsToClear.length + colsToClear.length;

    // Calculate score
    let points = blocksPlaced * 2; // 2 points per placed block
    if (linesCleared > 0) {
      this.combo++;
      // Super-linear multiline exponential scaling:
      // 1 line/col = 100, 2 lines = 360 (3.6x), 3 lines = 800 (8x), 4 lines = 1600 (16x), 5+ = 3000+
      const lineBaseScores = [0, 100, 360, 800, 1600, 3000];
      const basePoints = linesCleared < lineBaseScores.length
        ? lineBaseScores[linesCleared]
        : 3000 + (linesCleared - 5) * 1500;

      // Combo multiplier: Combo 1: 1.0x, Combo 2: 1.5x, Combo 3: 2.0x, Combo 4: 2.5x, Combo 5+: 3.0x+
      const comboMult = 1 + (this.combo - 1) * 0.5;
      let clearScore = Math.round(basePoints * comboMult);

      // Check board wipe (All clear / Board clear)
      const isBoardClear = this.board.every(row => row.every(cell => cell === 0));
      if (isBoardClear) {
        clearScore += 1500; // Perfect clear bonus!
      }

      points += clearScore;

      if (this.config?.onLinesClear) {
        this.config.onLinesClear(linesCleared, rowsToClear, colsToClear);
      }
      if (this.config?.onSound) {
        this.config.onSound('clear', linesCleared);
      }
    } else {
      this.combo = 0;
      if (this.config?.onSound) {
        this.config.onSound('place');
      }
    }

    this.score += points;

    // Set placed shape to null; when all 3 shapes in hand are placed, deal a fresh triad!
    this.hand[handIndex] = null;
    if (this.hand.every(s => s === null)) {
      this.hand = getRandomShapes(3);
    }

    this.checkGameOver();
    
    if (this.config?.onSyncState) this.config.onSyncState();

    return true;
  }

  private checkGameOver() {
    const size = this.boardSize;
    let canPlaceAny = false;
    
    for (const shape of this.hand) {
      if (!shape) continue;
      let placed = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (this.canPlace(shape, r, c, this.board)) {
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) {
        canPlaceAny = true;
        break;
      }
    }

    if (!canPlaceAny && this.hand.some(s => s !== null)) {
      this.isDead = true;
      this.status = GameStatus.Finished;
    }
  }
}
