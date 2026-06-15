import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { GameStatusType, GameStatus } from '../../../../core/models/game.model';

export interface SudokuCell {
  r: number;
  c: number;
  val: number; // 0 means empty
  fixed: boolean;
  notes: Set<number>;
  error: boolean;
}

export interface SudokuHistory {
  board: SudokuCell[][];
}

export enum SudokuActionType {
  PutNumber = 'putNumber',
  ToggleNote = 'toggleNote',
  ClearCell = 'clearCell',
  Undo = 'undo',
  ClearBoard = 'clear_board',
  SyncSteal = 'syncSteal'
}

export type SudokuAction = 
  | { type: SudokuActionType.PutNumber, r: number, c: number, val: number, solution: string }
  | { type: SudokuActionType.ToggleNote, r: number, c: number, val: number }
  | { type: SudokuActionType.ClearCell, r: number, c: number }
  | { type: SudokuActionType.Undo }
  | { type: SudokuActionType.ClearBoard }
  | { type: SudokuActionType.SyncSteal, currentBoardStr: string };

export class SudokuEngine implements ILocalEngine<any, SudokuAction> {
  board: SudokuCell[][] = [];
  history: SudokuHistory[] = [];
  status: GameStatusType = GameStatus.Waiting;

  initGame(config: { puzzle: string }) {
    this.history = [];
    const p = config.puzzle;
    if (!p) {
      this.board = [];
      return;
    }

    const b: SudokuCell[][] = [];
    for (let r = 0; r < 9; r++) {
      b[r] = [];
      for (let c = 0; c < 9; c++) {
        const char = p[r * 9 + c];
        const val = (char === '.' || char === '0' || char === '-') ? 0 : parseInt(char, 10);
        b[r][c] = {
          r, c,
          val,
          fixed: val !== 0,
          notes: new Set<number>(),
          error: false
        };
      }
    }
    this.board = b;
    this.status = GameStatus.Playing;
  }

  getState() {
    return this;
  }

  handleAction(action: SudokuAction) {
    if (this.status !== GameStatus.Playing) return;

    if (action.type === SudokuActionType.PutNumber) {
      const cell = this.board[action.r][action.c];
      if (cell.fixed) return;
      this.saveHistory();
      cell.val = action.val;
      cell.notes.clear();
      this.autoEraseNotes(action.r, action.c, action.val);
      this.checkBoard(action.solution);
    } 
    else if (action.type === SudokuActionType.ToggleNote) {
      const cell = this.board[action.r][action.c];
      if (cell.fixed || cell.val !== 0) return;
      this.saveHistory();
      if (cell.notes.has(action.val)) {
        cell.notes.delete(action.val);
      } else {
        cell.notes.add(action.val);
      }
    }
    else if (action.type === SudokuActionType.ClearCell) {
      const cell = this.board[action.r][action.c];
      if (cell.fixed) return;
      this.saveHistory();
      cell.val = 0;
      cell.notes.clear();
      cell.error = false;
      this.checkBoard(''); // Will clear errors
    }
    else if (action.type === SudokuActionType.Undo) {
      if (this.history.length === 0) return;
      const last = this.history.pop()!;
      // deep clone back
      this.board = last.board.map(row => row.map(c => ({
        ...c,
        notes: new Set(c.notes)
      })));
      this.checkBoard('');
    }
    else if (action.type === SudokuActionType.SyncSteal) {
      const currentStr = action.currentBoardStr;
      if (!currentStr || this.board.length === 0) return;
      let changed = false;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const char = currentStr[r * 9 + c];
          const expectedVal = (char === '.' || char === '0' || char === '-') ? 0 : parseInt(char, 10);
          if (this.board[r][c].val !== expectedVal && expectedVal !== 0) {
            this.board[r][c].val = expectedVal;
            this.board[r][c].fixed = true; // Mark as fixed once filled by anyone
            this.board[r][c].notes.clear();
            this.autoEraseNotes(r, c, expectedVal);
            changed = true;
          }
        }
      }
      if (changed) this.checkBoard('');
    }
  }

  private saveHistory() {
    // max 20 steps
    if (this.history.length > 20) this.history.shift();
    const clone = this.board.map(row => row.map(c => ({
      ...c,
      notes: new Set(c.notes)
    })));
    this.history.push({ board: clone });
  }

  private autoEraseNotes(r: number, c: number, val: number) {
    for (let i = 0; i < 9; i++) {
      if (this.board[r][i] && !this.board[r][i].fixed) this.board[r][i].notes.delete(val);
      if (this.board[i][c] && !this.board[i][c].fixed) this.board[i][c].notes.delete(val);
    }
    const boxR = Math.floor(r / 3) * 3;
    const boxC = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[boxR + i][boxC + j] && !this.board[boxR + i][boxC + j].fixed) {
          this.board[boxR + i][boxC + j].notes.delete(val);
        }
      }
    }
  }

  private checkBoard(solution: string) {
    if (!this.board || this.board.length === 0) return;
    
    // Clear all errors first
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c]) this.board[r][c].error = false;
      }
    }

    if (solution) {
      let allFilledCorrectly = true;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = this.board[r][c];
          if (cell.val !== 0) {
            const expected = parseInt(solution[r * 9 + c], 10);
            if (cell.val !== expected) {
              cell.error = true;
              allFilledCorrectly = false;
            }
          } else {
            allFilledCorrectly = false;
          }
        }
      }
      if (allFilledCorrectly) {
        this.status = GameStatus.Finished;
      }
    } else {
      // Basic rules check (rows, cols, boxes)
      for (let i = 0; i < 9; i++) {
        this.checkGroup(this.board[i]);
        this.checkGroup([this.board[0][i], this.board[1][i], this.board[2][i], this.board[3][i], this.board[4][i], this.board[5][i], this.board[6][i], this.board[7][i], this.board[8][i]]);
      }
      for (let boxR = 0; boxR < 3; boxR++) {
        for (let boxC = 0; boxC < 3; boxC++) {
          const group = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              group.push(this.board[boxR * 3 + i][boxC * 3 + j]);
            }
          }
          this.checkGroup(group);
        }
      }
      
      let allFilledAndValid = true;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = this.board[r][c];
          if (cell.val === 0 || cell.error) {
            allFilledAndValid = false;
          }
        }
      }
      if (allFilledAndValid) {
        this.status = GameStatus.Finished;
      }
    }
  }

  private checkGroup(cells: SudokuCell[]) {
    const counts = new Map<number, SudokuCell[]>();
    for (const cell of cells) {
      if (cell.val !== 0) {
        if (!counts.has(cell.val)) counts.set(cell.val, []);
        counts.get(cell.val)!.push(cell);
      }
    }
    for (const [val, group] of counts.entries()) {
      if (group.length > 1) {
        for (const cell of group) {
          cell.error = true;
        }
      }
    }
  }
}
