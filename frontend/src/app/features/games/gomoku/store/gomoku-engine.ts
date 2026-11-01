import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { GomokuAI, GomokuColor } from './gomoku-ai';

export enum GomokuActionType {
  Move = 'move',
  Surrender = 'surrender'
}

export type GomokuAction =
  | { type: GomokuActionType.Move, y: number, x: number }
  | { type: GomokuActionType.Surrender };

export class LocalGomokuEngine implements ILocalEngine<any, GomokuAction> {
  board: GomokuColor[][] = [];
  status: GameStatusType = GameStatus.Waiting;
  winner: string | undefined = undefined;
  currentTurn: string = '';
  lastMove: number[] | null = null;
  winningLine: number[][] | null = null;
  players: string[] = [];
  playerColors: Record<string, GomokuColor> = {};

  private ai: GomokuAI | null = null;
  private aiDifficulty: string = GameDifficulty.Medium;
  private playerId: string = '';
  private onStateChange?: () => void;
  private onAiMove?: () => void;
  private onGameOver?: (win: boolean) => void;

  initGame(config: { playerId: string, difficulty: string, onStateChange?: () => void, onAiMove?: () => void, onGameOver?: (win: boolean) => void }) {
    this.playerId = config.playerId;
    this.aiDifficulty = config.difficulty;
    this.onStateChange = config.onStateChange;
    this.onAiMove = config.onAiMove;
    this.onGameOver = config.onGameOver;

    this.board = this.createEmptyBoard();
    this.status = GameStatus.Playing;
    this.winner = undefined;
    this.players = [this.playerId, 'AI'];
    this.playerColors = {
      [this.playerId]: 1, // Black
      'AI': 2 // White
    };
    this.currentTurn = this.playerId;
    this.lastMove = null;
    this.winningLine = null;
    this.ai = new GomokuAI(2, this.aiDifficulty);
  }

  private createEmptyBoard(): GomokuColor[][] {
    const b: GomokuColor[][] = [];
    for (let i = 0; i < 15; i++) {
      b.push(new Array(15).fill(0));
    }
    return b;
  }

  getState() {
    return this;
  }

  handleAction(action: GomokuAction) {
    if (this.status !== GameStatus.Playing) return;

    if (action.type === GomokuActionType.Surrender) {
      this.status = GameStatus.Finished;
      this.winner = 'AI';
      if (this.onGameOver) this.onGameOver(false);
      return;
    }

    if (action.type === GomokuActionType.Move) {
      if (this.currentTurn !== this.playerId) return;
      const { y, x } = action;
      if (this.board[y][x] !== 0) return;

      // Player move
      this.board[y][x] = this.playerColors[this.playerId];
      this.lastMove = [y, x];
      
      const winLine = this.checkWin(y, x, this.board[y][x]);
      if (winLine) {
        this.winningLine = winLine;
        this.status = GameStatus.Finished;
        this.winner = this.playerId;
        if (this.onGameOver) this.onGameOver(true);
        return;
      }
      
      if (this.checkDraw()) {
        this.status = GameStatus.Finished;
        this.winner = 'tie';
        if (this.onGameOver) this.onGameOver(false);
        return;
      }

      this.currentTurn = 'AI';
      if (this.onStateChange) this.onStateChange();
      
      // AI Move: offloaded to Web Worker to keep main UI thread locked at 60fps
      this.computeBestMove(this.board).then(([aiY, aiX]) => {
        if (this.status !== GameStatus.Playing) return;

        if (aiY !== -1) {
          this.board[aiY][aiX] = this.playerColors['AI'];
          this.lastMove = [aiY, aiX];
          if (this.onAiMove) this.onAiMove();
          
          const aiWinLine = this.checkWin(aiY, aiX, this.board[aiY][aiX]);
          if (aiWinLine) {
            this.winningLine = aiWinLine;
            this.status = GameStatus.Finished;
            this.winner = 'AI';
            if (this.onGameOver) this.onGameOver(false);
            if (this.onStateChange) this.onStateChange();
            return;
          }

          if (this.checkDraw()) {
            this.status = GameStatus.Finished;
            this.winner = 'tie';
            if (this.onGameOver) this.onGameOver(false);
            if (this.onStateChange) this.onStateChange();
            return;
          }
        }
        this.currentTurn = this.playerId;
        if (this.onStateChange) this.onStateChange();
      });
    }
  }

  private computeBestMove(board: GomokuColor[][]): Promise<[number, number]> {
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(new URL('./gomoku-ai.worker.ts', import.meta.url), { type: 'module' });
        return new Promise((resolve) => {
          worker.onmessage = ({ data }) => {
            worker.terminate();
            resolve(data.bestMove);
          };
          worker.onerror = () => {
            worker.terminate();
            resolve(this.ai ? this.ai.getBestMove(board) : [-1, -1]);
          };
          worker.postMessage({
            board,
            myColor: 2,
            difficulty: this.aiDifficulty
          });
        });
      } catch {
        // Fallback if Worker construction is restricted
      }
    }
    return Promise.resolve(this.ai ? this.ai.getBestMove(board) : [-1, -1]);
  }

  private checkWin(y: number, x: number, color: GomokuColor): number[][] | null {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dy, dx] of dirs) {
      let count = 1;
      const line = [[y, x]];
      for (let i = 1; i < 5; i++) {
        const ny = y + dy * i;
        const nx = x + dx * i;
        if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15 && this.board[ny][nx] === color) {
          count++;
          line.push([ny, nx]);
        } else break;
      }
      for (let i = 1; i < 5; i++) {
        const ny = y - dy * i;
        const nx = x - dx * i;
        if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15 && this.board[ny][nx] === color) {
          count++;
          line.push([ny, nx]);
        } else break;
      }
      if (count >= 5) return line;
    }
    return null;
  }

  private checkDraw(): boolean {
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        if (this.board[y][x] === 0) return false;
      }
    }
    return true;
  }
}
