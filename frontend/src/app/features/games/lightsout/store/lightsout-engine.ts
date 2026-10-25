import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export enum LightsoutActionType {
  Toggle = 'toggle',
  Undo = 'undo',
  Forfeit = 'forfeit'
}

export type LightsoutAction =
  | { type: LightsoutActionType.Toggle, row: number, col: number }
  | { type: LightsoutActionType.Undo }
  | { type: LightsoutActionType.Forfeit };

export class LocalLightsoutEngine implements ILocalEngine<any, LightsoutAction> {
  status: GameStatusType = GameStatus.Waiting;
  board: boolean[][] = [];
  solution: boolean[][] = [];
  moves: number = 0;
  size: number = 5;
  difficulty: string = GameDifficulty.Medium;
  finished: boolean = false;
  playerId: string = '';
  moveHistory: { row: number, col: number }[] = [];
  targetMode: 'on' | 'off' = 'on';

  private onWin?: () => void;

  initGame(config: { playerId: string, difficulty: string, size: number, targetMode?: 'on' | 'off', onWin?: () => void }) {
    this.playerId = config.playerId;
    this.difficulty = config.difficulty;
    this.size = config.size;
    this.targetMode = config.targetMode || 'on';
    this.onWin = config.onWin;
    this.moveHistory = [];

    this.initSinglePlayerBoard(this.size);
    this.status = GameStatus.Playing;
    this.finished = false;
  }

  getState() {
    return this;
  }

  handleAction(action: LightsoutAction) {
    if (this.status !== GameStatus.Playing || this.finished) return;

    if (action.type === LightsoutActionType.Forfeit) {
      this.status = GameStatus.Finished;
      this.finished = true;
      return;
    }

    if (action.type === LightsoutActionType.Undo) {
      if (this.moveHistory.length === 0) return;
      const last = this.moveHistory.pop()!;
      this.toggleCell(last.row, last.col);
      if (this.moves > 0) this.moves--;
      return;
    }

    if (action.type === LightsoutActionType.Toggle) {
      const { row, col } = action;
      this.toggleCell(row, col);
      this.moveHistory.push({ row, col });
      this.moves++;

      if (this.checkWin()) {
        this.status = GameStatus.Finished;
        this.finished = true;
        if (this.onWin) this.onWin();
      }
    }
  }

  private toggleCell(r: number, c: number) {
    const s = this.size;
    this.board[r][c] = !this.board[r][c];
    if (r > 0) this.board[r - 1][c] = !this.board[r - 1][c];
    if (r < s - 1) this.board[r + 1][c] = !this.board[r + 1][c];
    if (c > 0) this.board[r][c - 1] = !this.board[r][c - 1];
    if (c < s - 1) this.board[r][c + 1] = !this.board[r][c + 1];

    if (this.solution.length === s) {
      this.solution[r][c] = !this.solution[r][c];
    }
  }

  private checkWin(): boolean {
    const targetState = this.targetMode === 'on';
    for (const row of this.board) {
      for (const cell of row) {
        if (cell !== targetState) return false;
      }
    }
    return true;
  }

  private initSinglePlayerBoard(s: number) {
    const targetState = this.targetMode === 'on';
    // Initialize starting state as the target victory state
    this.board = Array(s).fill(null).map(() => Array(s).fill(targetState));
    this.solution = Array(s).fill(null).map(() => Array(s).fill(false));

    // Scramble by applying random toggles from the solved target state
    // This mathematically guarantees 100% solvability back to targetState!
    const clicks = s * s * 2;
    for (let i = 0; i < clicks; i++) {
      const r = Math.floor(Math.random() * s);
      const c = Math.floor(Math.random() * s);
      this.toggleCell(r, c);
    }
    
    // In rare case that it scrambles back to won state, toggle at least 2 corners
    if (this.checkWin()) {
      this.toggleCell(0, 0);
      this.toggleCell(s - 1, s - 1);
    }

    this.moves = 0;
  }
}
