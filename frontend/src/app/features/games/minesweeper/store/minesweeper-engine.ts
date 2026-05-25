import { Cell, CellState, GameStatus } from './minesweeper.store';

export class LocalMinesweeperEngine {
  width: number;
  height: number;
  mines: number;
  cells: Cell[][];
  status: GameStatus;
  revealedCnt: number;
  startAt: number;
  isMinesPlaced: boolean;

  constructor(width: number, height: number, mines: number) {
    this.width = width;
    this.height = height;
    this.mines = mines;
    this.status = GameStatus.Playing;
    this.revealedCnt = 0;
    this.startAt = Date.now();
    this.isMinesPlaced = false;
    this.cells = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        x,
        y,
        state: CellState.Hidden,
        neighbors: 0,
        isMine: false // Private tracking for local engine
      }))
    );
  }

  revealCell(x: number, y: number) {
    if (this.status === GameStatus.Finished || !this.isValid(x, y)) {
      return;
    }

    const cell = this.cells[y][x] as any; // Type casting to access internal isMine
    if (cell.state !== CellState.Hidden) {
      return;
    }

    // First click logic
    if (!this.isMinesPlaced) {
      this.placeMines(x, y);
      this.isMinesPlaced = true;
    }

    if (cell.isMine) {
      cell.state = CellState.Exploded;
      this.status = GameStatus.Finished;
      this.revealAllMines();
      return;
    }

    this.floodFillReveal(x, y);
    this.checkWinCondition();
  }

  toggleFlag(x: number, y: number) {
    if (this.status === GameStatus.Finished || !this.isValid(x, y)) {
      return;
    }

    const cell = this.cells[y][x];
    if (cell.state === CellState.Hidden) {
      cell.state = CellState.Flagged;
    } else if (cell.state === CellState.Flagged) {
      cell.state = CellState.Hidden;
    }
  }

  private placeMines(excludeX: number, excludeY: number) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = this.width * this.height * 10;

    const safeZone = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = excludeX + dx;
        const ny = excludeY + dy;
        if (this.isValid(nx, ny)) {
          safeZone.add(`${nx},${ny}`);
        }
      }
    }

    while (placed < this.mines && attempts < maxAttempts) {
      attempts++;
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);

      if (safeZone.has(`${x},${y}`) && attempts < maxAttempts / 2) {
        continue;
      }

      const cell = this.cells[y][x] as any;
      if (!cell.isMine) {
        cell.isMine = true;
        placed++;
      }
    }

    this.calculateNeighbors();
  }

  private calculateNeighbors() {
    const dirs = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x] as any;
        if (cell.isMine) continue;

        let count = 0;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isValid(nx, ny) && (this.cells[ny][nx] as any).isMine) {
            count++;
          }
        }
        cell.neighbors = count;
      }
    }
  }

  private floodFillReveal(x: number, y: number) {
    const cell = this.cells[y][x];
    if (cell.state !== CellState.Hidden) {
      return;
    }

    cell.state = CellState.Revealed;
    this.revealedCnt++;

    if (cell.neighbors === 0) {
      const dirs = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
      ];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.isValid(nx, ny)) {
          this.floodFillReveal(nx, ny);
        }
      }
    }
  }

  private checkWinCondition() {
    if (this.status === GameStatus.Finished) return;

    const totalSafeCells = (this.width * this.height) - this.mines;
    
    // In strict single player, winning is just revealing all safe cells
    if (this.revealedCnt === totalSafeCells) {
      this.status = GameStatus.Finished;
      // Auto-flag remaining mines
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const cell = this.cells[y][x] as any;
          if (cell.isMine && cell.state === CellState.Hidden) {
            cell.state = CellState.Flagged;
          }
        }
      }
    }
  }

  private revealAllMines() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x] as any;
        if (cell.isMine && cell.state === CellState.Hidden) {
          cell.state = CellState.Revealed; // Just reveal them as neutral
        } else if (!cell.isMine && cell.state === CellState.Flagged) {
          // Incorrectly flagged
          cell.state = CellState.Exploded; 
        }
      }
    }
  }

  private isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}
