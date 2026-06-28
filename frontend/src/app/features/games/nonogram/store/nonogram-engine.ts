export type CellState = 0 | 1 | 2; // 0: unknown, 1: filled, 2: crossed

export interface NonogramBoard {
  width: number;
  height: number;
  grid: CellState[][];
  rowHints: number[][];
  colHints: number[][];
}

export class NonogramEngine {
  
  static extractHints(grid: number[][]): { rowHints: number[][], colHints: number[][] } {
    const height = grid.length;
    const width = grid[0].length;
    const rowHints: number[][] = [];
    const colHints: number[][] = [];

    for (let y = 0; y < height; y++) {
      rowHints.push(this.getLineHints(grid[y]));
    }

    for (let x = 0; x < width; x++) {
      const col = [];
      for (let y = 0; y < height; y++) {
        col.push(grid[y][x]);
      }
      colHints.push(this.getLineHints(col));
    }
    
    return { rowHints, colHints };
  }

  static getLineHints(line: number[]): number[] {
    const hints: number[] = [];
    let count = 0;
    for (const val of line) {
      if (val === 1) {
        count++;
      } else if (count > 0) {
        hints.push(count);
        count = 0;
      }
    }
    if (count > 0) {
      hints.push(count);
    }
    if (hints.length === 0) {
      hints.push(0);
    }
    return hints;
  }

  static generate(width: number, height: number): { grid: number[][], rowHints: number[][], colHints: number[][] } {
    while (true) {
      const grid: number[][] = [];
      for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
          row.push(Math.random() < 0.55 ? 1 : 0);
        }
        grid.push(row);
      }

      const { rowHints, colHints } = this.extractHints(grid);
      const isSolvable = this.solveLogic(width, height, rowHints, colHints);
      
      if (isSolvable) {
        return { grid, rowHints, colHints };
      }
    }
  }

  static solveLogic(width: number, height: number, rowHints: number[][], colHints: number[][]): boolean {
    const state: CellState[][] = Array(height).fill(0).map(() => Array(width).fill(0));
    let changed = true;

    while (changed) {
      changed = false;

      // Rows
      for (let y = 0; y < height; y++) {
        const { lineChanged, ok } = this.processLine(state[y], rowHints[y]);
        if (!ok) return false;
        if (lineChanged) changed = true;
      }

      // Cols
      for (let x = 0; x < width; x++) {
        const col: CellState[] = [];
        for (let y = 0; y < height; y++) {
          col.push(state[y][x]);
        }
        const { lineChanged, ok } = this.processLine(col, colHints[x]);
        if (!ok) return false;
        if (lineChanged) {
          changed = true;
          for (let y = 0; y < height; y++) {
            state[y][x] = col[y];
          }
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (state[y][x] === 0) {
          return false; // needs guessing
        }
      }
    }

    return true;
  }

  static processLine(line: CellState[], hints: number[]): { lineChanged: boolean, ok: boolean } {
    const n = line.length;
    
    if (hints.length === 1 && hints[0] === 0) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (line[i] === 1) return { lineChanged: false, ok: false };
        if (line[i] === 0) {
          line[i] = 2;
          changed = true;
        }
      }
      return { lineChanged: changed, ok: true };
    }

    const validArrangements: CellState[][] = [];

    const backtrack = (idx: number, hintIdx: number, current: CellState[]) => {
      if (hintIdx === hints.length) {
        for (let i = idx; i < n; i++) {
          if (line[i] === 1) return;
          current[i] = 2;
        }
        validArrangements.push([...current]);
        return;
      }

      const h = hints[hintIdx];
      let needed = 0;
      for (let i = hintIdx; i < hints.length; i++) needed += hints[i];
      needed += hints.length - 1 - hintIdx;

      const maxStart = n - needed;
      for (let start = idx; start <= maxStart; start++) {
        let canPlaceEmpties = true;
        for (let i = idx; i < start; i++) {
          if (line[i] === 1) {
            canPlaceEmpties = false;
            break;
          }
          current[i] = 2;
        }
        if (!canPlaceEmpties) continue;

        let canPlaceBlock = true;
        for (let i = start; i < start + h; i++) {
          if (line[i] === 2) {
            canPlaceBlock = false;
            break;
          }
          current[i] = 1;
        }

        if (canPlaceBlock) {
          if (start + h < n) {
            if (line[start + h] === 1) {
              canPlaceBlock = false;
            } else {
              current[start + h] = 2;
            }
            if (canPlaceBlock) {
              backtrack(start + h + 1, hintIdx + 1, current);
            }
          } else {
            backtrack(start + h, hintIdx + 1, current);
          }
        }
      }
    };

    backtrack(0, 0, new Array(n).fill(0));

    if (validArrangements.length === 0) {
      return { lineChanged: false, ok: false };
    }

    let changed = false;
    for (let i = 0; i < n; i++) {
      if (line[i] === 0) {
        const firstVal = validArrangements[0][i];
        let allSame = true;
        for (const arr of validArrangements) {
          if (arr[i] !== firstVal) {
            allSame = false;
            break;
          }
        }
        if (allSame) {
          line[i] = firstVal;
          changed = true;
        }
      }
    }

    return { lineChanged: changed, ok: true };
  }

  // Check if player's current grid satisfies all hints and is full (or at least all filled cells are correct)
  static checkWin(grid: CellState[][], answerGrid: number[][]): boolean {
    const height = grid.length;
    const width = grid[0].length;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isFilled = grid[y][x] === 1;
        const answerFilled = answerGrid[y][x] === 1;
        if (isFilled !== answerFilled) {
          return false; // mismatch
        }
      }
    }
    return true; // perfectly matches
  }
}
