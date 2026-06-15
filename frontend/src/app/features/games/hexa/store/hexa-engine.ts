import { GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { generatePieces } from './hexa-pieces';
import { PRNG } from '../../../../core/utils/prng';

export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

export interface HexCell extends HexCoord {
  filled: boolean;
  color?: string;
}

export interface HexPiece {
  id: string;
  shape: HexCoord[];
  color: string;
}

export enum HexaActionType {
  PlacePiece = 'place_piece',
  Reset = 'reset',
  LoadState = 'load_state'
}

export type HexaAction = 
  | { type: HexaActionType.PlacePiece; piece: HexPiece; origin: HexCoord; pieceIndex: number }
  | { type: HexaActionType.Reset; seed?: number }
  | { type: HexaActionType.LoadState; cells: any; score: number; combo: number; pieces: HexPiece[]; piecesPlaced: number; gameOver: boolean };

export interface HexaState {
  cells: HexCell[];
  score: number;
  combo: number;
  availablePieces: HexPiece[];
  piecesPlaced: number;
  gameOver: boolean;
  status: GameStatusType;
}

export class HexaEngine implements ILocalEngine<HexaState, HexaAction> {
  private readonly radius = 4;
  cells: Map<string, HexCell> = new Map();
  score = 0;
  combo = 0;
  availablePieces: HexPiece[] = [];
  piecesPlaced = 0;
  gameOver = false;
  status: GameStatusType = GameStatus.Waiting;
  
  private prng: PRNG | undefined;

  constructor() {
    this.initBoard();
  }

  static coordToString(c: HexCoord): string {
    return `${c.q},${c.r},${c.s}`;
  }

  private initBoard() {
    this.cells.clear();
    for (let q = -this.radius; q <= this.radius; q++) {
      for (let r = -this.radius; r <= this.radius; r++) {
        const s = -q - r;
        if (Math.abs(s) <= this.radius) {
          const coord = { q, r, s };
          this.cells.set(HexaEngine.coordToString(coord), { ...coord, filled: false });
        }
      }
    }
  }

  initGame(config: { seed?: number } = {}): void {
    if (config.seed) {
      this.prng = new PRNG(config.seed);
    } else {
      this.prng = undefined;
    }
    this.resetGame();
  }

  private resetGame() {
    this.initBoard();
    this.score = 0;
    this.combo = 0;
    this.piecesPlaced = 0;
    this.gameOver = false;
    this.status = GameStatus.Playing;
    this.availablePieces = generatePieces(3, this.prng);
  }

  getState(): HexaState {
    return {
      cells: Array.from(this.cells.values()),
      score: this.score,
      combo: this.combo,
      availablePieces: this.availablePieces,
      piecesPlaced: this.piecesPlaced,
      gameOver: this.gameOver,
      status: this.status
    };
  }

  handleAction(action: HexaAction): void {
    if (action.type === HexaActionType.PlacePiece) {
      this.executePlacePiece(action.piece, action.origin, action.pieceIndex);
    } else if (action.type === HexaActionType.Reset) {
      this.initGame({ seed: action.seed });
    } else if (action.type === HexaActionType.LoadState) {
      this.score = action.score;
      this.combo = action.combo;
      if (action.cells && Array.isArray(action.cells)) {
        this.cells.clear();
        for (const cell of action.cells) {
          this.cells.set(HexaEngine.coordToString({ q: cell.q, r: cell.r, s: cell.s }), cell);
        }
      }
      this.availablePieces = action.pieces;
      this.piecesPlaced = action.piecesPlaced;
      this.gameOver = action.gameOver;
      this.status = action.gameOver ? GameStatus.Finished : 'playing';
    }
  }

  canPlacePiece(piece: HexPiece, origin: HexCoord): boolean {
    for (const offset of piece.shape) {
      const targetQ = origin.q + offset.q;
      const targetR = origin.r + offset.r;
      const targetS = origin.s + offset.s;
      
      const key = HexaEngine.coordToString({ q: targetQ, r: targetR, s: targetS });
      const cell = this.cells.get(key);
      
      if (!cell || cell.filled) {
        return false;
      }
    }
    return true;
  }

  private executePlacePiece(piece: HexPiece, origin: HexCoord, pieceIndex: number): { linesCleared: number } | null {
    if (this.gameOver || this.status !== GameStatus.Playing) return null;
    if (!this.canPlacePiece(piece, origin)) return null;

    // Place the piece
    for (const offset of piece.shape) {
      const targetQ = origin.q + offset.q;
      const targetR = origin.r + offset.r;
      const targetS = origin.s + offset.s;
      
      const key = HexaEngine.coordToString({ q: targetQ, r: targetR, s: targetS });
      const cell = this.cells.get(key);
      if (cell) {
        cell.filled = true;
        cell.color = piece.color;
      }
    }

    this.score += piece.shape.length; // points for placing
    this.piecesPlaced++;

    // Check for cleared lines
    const cleared = this.checkAndClearLines();

    // Replace the used piece with a new one
    const newPieces = [...this.availablePieces];
    newPieces[pieceIndex] = generatePieces(1, this.prng)[0];
    this.availablePieces = newPieces;

    // Check Game Over
    const currentPieces = this.availablePieces.filter(p => p !== null && p !== undefined);
    if (this.checkGameOver(currentPieces)) {
      this.gameOver = true;
      this.status = GameStatus.Finished;
    }

    return { linesCleared: cleared.lines };
  }

  private checkAndClearLines(): { lines: number } {
    const toClear = new Set<string>();
    let lines = 0;

    // Check lines for q, r, s axes
    for (let axis of ['q', 'r', 's'] as const) {
      for (let i = -this.radius; i <= this.radius; i++) {
        const lineCells = this.getLineCells(axis, i);
        if (lineCells.length > 0 && lineCells.every(c => c.filled)) {
          lines++;
          lineCells.forEach(c => toClear.add(HexaEngine.coordToString(c)));
        }
      }
    }

    toClear.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.filled = false;
        delete cell.color;
      }
    });

    if (lines > 0) {
      this.combo++;
      // Score formula: (lines * 10) * combo
      this.score += (lines * 10) * this.combo;
    } else {
      this.combo = 0;
    }

    return { lines };
  }

  private getLineCells(axis: 'q' | 'r' | 's', value: number): HexCell[] {
    const res: HexCell[] = [];
    for (const cell of this.cells.values()) {
      if (cell[axis] === value) {
        res.push(cell);
      }
    }
    return res;
  }

  private checkGameOver(availablePieces: HexPiece[]): boolean {
    if (availablePieces.length === 0) return false;

    for (const piece of availablePieces) {
      for (const cell of this.cells.values()) {
        if (this.canPlacePiece(piece, { q: cell.q, r: cell.r, s: cell.s })) {
          return false;
        }
      }
    }
    return true;
  }
}
