import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export enum LightsoutActionType {
  Toggle = 'toggle',
  Forfeit = 'forfeit'
}

export type LightsoutAction =
  | { type: LightsoutActionType.Toggle, row: number, col: number }
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

  private onWin?: () => void;

  initGame(config: { playerId: string, difficulty: string, size: number, onWin?: () => void }) {
    this.playerId = config.playerId;
    this.difficulty = config.difficulty;
    this.size = config.size;
    this.onWin = config.onWin;

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

    if (action.type === LightsoutActionType.Toggle) {
      const { row, col } = action;
      this.toggleCell(row, col);
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
    for (const row of this.board) {
      for (const cell of row) {
        if (cell) return false;
      }
    }
    return true;
  }

  private initSinglePlayerBoard(s: number) {
    this.board = Array(s).fill(null).map(() => Array(s).fill(false));
    this.solution = Array(s).fill(null).map(() => Array(s).fill(false));

    const clicks = s * s * 2;
    for (let i = 0; i < clicks; i++) {
      const r = Math.floor(Math.random() * s);
      const c = Math.floor(Math.random() * s);
      this.toggleCell(r, c);
    }
    
    if (this.checkWin()) {
      this.toggleCell(0, 0);
      this.toggleCell(s-1, s-1);
    }

    this.moves = 0;
  }
}
