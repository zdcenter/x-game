import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';


export enum SlidingActionType {
  Move = 'move'
}

export type SlidingAction = {
  type: SlidingActionType.Move;
  index: number;
};

export class LocalSlidingEngine implements ILocalEngine<any, SlidingAction> {
  size: number;
  cells: number[];
  emptyIdx: number;
  status: GameStatusType = GameStatus.Playing;
  startAt: number = 0;
  endAt: number = 0;
  moves: number = 0;

  constructor(difficulty: string = GameDifficulty.Medium) {
    this.size = this.parseDifficulty(difficulty);
    this.cells = Array.from({ length: this.size * this.size }, (_, i) => i + 1);
    this.cells[this.size * this.size - 1] = 0;
    this.emptyIdx = this.size * this.size - 1;
    this.shuffle(this.size * this.size * 100);
    this.startAt = Date.now();
  }


  private parseDifficulty(difficulty: string): number {
    if (difficulty.startsWith('custom_')) {
      const parts = difficulty.split('_');
      if (parts.length >= 2) {
        const s = parseInt(parts[1], 10);
        if (!isNaN(s) && s >= 3 && s <= 10) {
          return s;
        }
      }
    }
    switch (difficulty) {
      case GameDifficulty.Easy:
      case 'beginner': return 4;
      case GameDifficulty.Hard:
      case 'advanced': return 6;
      case GameDifficulty.Medium:
      case 'intermediate':
      default: return 5;
    }
  }

  private getValidNeighbors(idx: number): number[] {
    const row = Math.floor(idx / this.size);
    const col = idx % this.size;
    const neighbors: number[] = [];

    if (row > 0) neighbors.push(idx - this.size); // up
    if (row < this.size - 1) neighbors.push(idx + this.size); // down
    if (col > 0) neighbors.push(idx - 1); // left
    if (col < this.size - 1) neighbors.push(idx + 1); // right

    return neighbors;
  }

  shuffle(movesToShuffle: number) {
    let lastIdx = -1;
    for (let i = 0; i < movesToShuffle; i++) {
      const neighbors = this.getValidNeighbors(this.emptyIdx);
      if (neighbors.length === 0) continue;
      
      const candidates = neighbors.length > 1 ? neighbors.filter(n => n !== lastIdx) : neighbors;
      const nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
      lastIdx = this.emptyIdx;

      [this.cells[this.emptyIdx], this.cells[nextIdx]] = [this.cells[nextIdx], this.cells[this.emptyIdx]];
      this.emptyIdx = nextIdx;
    }

    if (this.checkWin()) {
      const neighbors = this.getValidNeighbors(this.emptyIdx);
      if (neighbors.length > 0) {
        const nextIdx = neighbors[0];
        [this.cells[this.emptyIdx], this.cells[nextIdx]] = [this.cells[nextIdx], this.cells[this.emptyIdx]];
        this.emptyIdx = nextIdx;
      }
    }
  }

  initGame(config: any): void {
    // Already initialized in constructor, or apply config if needed
    if (config?.difficulty) {
      this.size = this.parseDifficulty(config.difficulty);
      this.cells = Array.from({ length: this.size * this.size }, (_, i) => i + 1);
      this.cells[this.size * this.size - 1] = 0;
      this.emptyIdx = this.size * this.size - 1;
      this.shuffle(this.size * this.size * 50);
      this.startAt = Date.now();
      this.moves = 0;
      this.status = GameStatus.Playing;
    }
  }

  getState(): any {
    return this;
  }

  handleAction(action: SlidingAction): boolean {
    if (action.type === SlidingActionType.Move) {
      return this.move(action.index);
    }
    return false;
  }

  move(idx: number): boolean {
    if (this.status !== GameStatus.Playing) return false;
    
    const moved = applySlideMove(this, idx);
    if (moved) {
      if (this.checkWin()) {
        this.status = GameStatus.Finished;
        this.endAt = Date.now();
      }
      return true;
    }
    return false;
  }

  checkWin(): boolean {
    for (let i = 0; i < this.size * this.size - 1; i++) {
      if (this.cells[i] !== i + 1) return false;
    }
    return this.cells[this.size * this.size - 1] === 0;
  }
}

/**
 * Pure helper function to apply a move on any board structure (used by both local engine and PK optimistic update).
 */
export function applySlideMove(
  board: { size: number; cells: number[]; emptyIdx: number; moves: number },
  idx: number
): boolean {
  if (idx < 0 || idx >= board.size * board.size || idx === board.emptyIdx) {
    return false;
  }

  const size = board.size;
  const emptyRow = Math.floor(board.emptyIdx / size);
  const emptyCol = board.emptyIdx % size;
  const targetRow = Math.floor(idx / size);
  const targetCol = idx % size;

  if (emptyRow === targetRow) {
    if (targetCol < emptyCol) {
      for (let col = emptyCol - 1; col >= targetCol; col--) {
        const curr = emptyRow * size + col;
        [board.cells[board.emptyIdx], board.cells[curr]] = [board.cells[curr], board.cells[board.emptyIdx]];
        board.emptyIdx = curr;
      }
    } else {
      for (let col = emptyCol + 1; col <= targetCol; col++) {
        const curr = emptyRow * size + col;
        [board.cells[board.emptyIdx], board.cells[curr]] = [board.cells[curr], board.cells[board.emptyIdx]];
        board.emptyIdx = curr;
      }
    }
    board.moves++;
    return true;
  }

  if (emptyCol === targetCol) {
    if (targetRow < emptyRow) {
      for (let row = emptyRow - 1; row >= targetRow; row--) {
        const curr = row * size + emptyCol;
        [board.cells[board.emptyIdx], board.cells[curr]] = [board.cells[curr], board.cells[board.emptyIdx]];
        board.emptyIdx = curr;
      }
    } else {
      for (let row = emptyRow + 1; row <= targetRow; row++) {
        const curr = row * size + emptyCol;
        [board.cells[board.emptyIdx], board.cells[curr]] = [board.cells[curr], board.cells[board.emptyIdx]];
        board.emptyIdx = curr;
      }
    }
    board.moves++;
    return true;
  }

  return false;
}
