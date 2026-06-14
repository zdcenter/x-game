import { Cell, CellState } from './minesweeper.store';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { GameStatusType, GameStatus } from '../../../../core/models/game.model';

export enum MinesweeperActionType {
  Reveal = 'reveal',
  Flag = 'flag',
  Hint = 'hint'
}

export type MinesweeperAction = 
  | { type: MinesweeperActionType.Reveal, x: number, y: number }
  | { type: MinesweeperActionType.Flag, x: number, y: number }
  | { type: MinesweeperActionType.Hint };

export class LocalMinesweeperEngine implements ILocalEngine<any, MinesweeperAction> {
  width: number = 0;
  height: number = 0;
  mines: number = 0;
  cells: Cell[][] = [];
  status: GameStatusType = GameStatus.Waiting;
  revealedCnt: number = 0;
  startAt: number = 0;
  isMinesPlaced: boolean = false;

  initGame(config: { width: number, height: number, mines: number }) {
    this.width = config.width;
    this.height = config.height;
    this.mines = config.mines;
    this.status = GameStatus.Playing;
    this.revealedCnt = 0;
    this.startAt = Date.now();
    this.isMinesPlaced = false;
    this.cells = Array.from({ length: this.height }, (_, y) =>
      Array.from({ length: this.width }, (_, x) => ({
        x,
        y,
        state: CellState.Hidden,
        neighbors: 0,
        isMine: false
      }))
    );
  }

  getState() {
    return this;
  }

  handleAction(action: MinesweeperAction) {
    if (action.type === MinesweeperActionType.Reveal) {
      this.revealCell(action.x, action.y);
    } else if (action.type === MinesweeperActionType.Flag) {
      this.toggleFlag(action.x, action.y);
    } else if (action.type === MinesweeperActionType.Hint) {
      this.applyHint();
    }
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

  applyHint(): { success: boolean, message: string } {
    if (this.status === GameStatus.Finished) {
      return { success: false, message: 'game.already_finished' };
    }

    if (!this.isMinesPlaced) {
      // If first click hasn't happened, just reveal a random cell
      const rx = Math.floor(Math.random() * this.width);
      const ry = Math.floor(Math.random() * this.height);
      this.revealCell(rx, ry);
      return { success: true, message: 'game.hint_safe_revealed' };
    }

    const unflaggedMines: {x: number, y: number}[] = [];
    const hiddenSafeCells: {x: number, y: number}[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x] as any;
        if (cell.state === CellState.Hidden) {
          if (cell.isMine) {
            unflaggedMines.push({x, y});
          } else {
            hiddenSafeCells.push({x, y});
          }
        }
      }
    }

    if (unflaggedMines.length > 0) {
      // Randomly pick an unflagged mine and flag it
      const target = unflaggedMines[Math.floor(Math.random() * unflaggedMines.length)];
      this.cells[target.y][target.x].state = CellState.Flagged;
      this.checkWinCondition();
      return { success: true, message: 'game.hint_mine_flagged' };
    } else if (hiddenSafeCells.length > 0) {
      // All mines are flagged, reveal a safe cell
      const target = hiddenSafeCells[Math.floor(Math.random() * hiddenSafeCells.length)];
      this.revealCell(target.x, target.y);
      return { success: true, message: 'game.hint_safe_revealed' };
    }

    return { success: false, message: 'game.no_hint_available' };
  }
}
