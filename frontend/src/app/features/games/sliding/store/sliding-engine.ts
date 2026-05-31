import { GameStatus } from './sliding.store';

export class LocalSlidingEngine {
  size: number;
  cells: number[];
  emptyIdx: number;
  status: GameStatus = GameStatus.Playing;
  startAt: number = 0;
  endAt: number = 0;
  moves: number = 0;

  static readonly STORAGE_KEY = 'x_game_sliding_single_state';

  constructor(difficulty: string = 'medium') {
    this.size = this.parseDifficulty(difficulty);
    this.cells = Array.from({ length: this.size * this.size }, (_, i) => i + 1);
    this.cells[this.size * this.size - 1] = 0;
    this.emptyIdx = this.size * this.size - 1;
    this.shuffle(this.size * this.size * 100);
    this.startAt = Date.now();
  }

  saveToStorage(difficulty: string) {
    try {
      const data = {
        difficulty,
        size: this.size,
        cells: this.cells,
        emptyIdx: this.emptyIdx,
        status: this.status,
        startAt: this.startAt,
        endAt: this.endAt,
        moves: this.moves
      };
      localStorage.setItem(LocalSlidingEngine.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save sliding engine state', e);
    }
  }

  static loadFromStorage(): { engine: LocalSlidingEngine, difficulty: string } | null {
    try {
      const dataStr = localStorage.getItem(LocalSlidingEngine.STORAGE_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data && data.size && data.cells) {
          const engine = new LocalSlidingEngine(data.difficulty || 'medium');
          engine.size = data.size;
          engine.cells = data.cells;
          engine.emptyIdx = data.emptyIdx;
          engine.status = data.status;
          engine.startAt = data.startAt;
          engine.endAt = data.endAt || 0;
          engine.moves = data.moves || 0;
          return { engine, difficulty: data.difficulty || 'medium' };
        }
      }
    } catch (e) {
      console.error('Failed to load sliding engine state', e);
    }
    return null;
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
      case 'easy':
      case 'beginner': return 4;
      case 'hard':
      case 'advanced': return 6;
      case 'medium':
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
    for (let i = 0; i < movesToShuffle; i++) {
      const neighbors = this.getValidNeighbors(this.emptyIdx);
      if (neighbors.length > 0) {
        const nextIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Swap
        [this.cells[this.emptyIdx], this.cells[nextIdx]] = [this.cells[nextIdx], this.cells[this.emptyIdx]];
        this.emptyIdx = nextIdx;
      }
    }
  }

  move(idx: number): boolean {
    if (this.status !== GameStatus.Playing) return false;
    
    if (idx < 0 || idx >= this.size * this.size) return false;

    const emptyRow = Math.floor(this.emptyIdx / this.size);
    const emptyCol = this.emptyIdx % this.size;
    const targetRow = Math.floor(idx / this.size);
    const targetCol = idx % this.size;

    const dist = Math.abs(emptyRow - targetRow) + Math.abs(emptyCol - targetCol);
    
    if (dist === 1) {
      [this.cells[this.emptyIdx], this.cells[idx]] = [this.cells[idx], this.cells[this.emptyIdx]];
      this.emptyIdx = idx;
      this.moves++;

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
