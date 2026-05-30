export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

export interface HexCell extends HexCoord {
  filled: boolean;
  color?: string; // used for rendering the blocks
}

export interface HexPiece {
  id: string;
  shape: HexCoord[];
  color: string;
}

export class HexaEngine {
  private readonly radius = 4;
  cells: Map<string, HexCell> = new Map();
  score = 0;
  combo = 0;

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

  placePiece(piece: HexPiece, origin: HexCoord): { linesCleared: number, cellsCleared: HexCoord[], gameOver: boolean } {
    if (!this.canPlacePiece(piece, origin)) {
      return { linesCleared: 0, cellsCleared: [], gameOver: false };
    }

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

    // Check for cleared lines
    const cleared = this.checkAndClearLines();
    
    return {
      linesCleared: cleared.lines,
      cellsCleared: cleared.clearedCells,
      gameOver: false // Will be checked externally against available pieces
    };
  }

  private checkAndClearLines(): { lines: number, clearedCells: HexCoord[] } {
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

    const clearedCells: HexCoord[] = [];
    toClear.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.filled = false;
        delete cell.color;
        clearedCells.push({ q: cell.q, r: cell.r, s: cell.s });
      }
    });

    if (lines > 0) {
      this.combo++;
      // Score formula: (lines * 10) * combo
      this.score += (lines * 10) * this.combo;
    } else {
      this.combo = 0;
    }

    return { lines, clearedCells };
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

  checkGameOver(availablePieces: HexPiece[]): boolean {
    if (availablePieces.length === 0) return false;

    // If ANY of the available pieces can be placed ANYWHERE, game is not over.
    for (const piece of availablePieces) {
      for (const cell of this.cells.values()) {
        if (this.canPlacePiece(piece, { q: cell.q, r: cell.r, s: cell.s })) {
          return false;
        }
      }
    }
    return true;
  }

  loadState(cells: any, score: number, combo: number) {
    this.score = score;
    this.combo = combo;
    if (cells) {
      this.cells = new Map(cells);
    }
  }

  getState() {
    return {
      cells: Array.from(this.cells.entries()),
      score: this.score,
      combo: this.combo
    };
  }
}
