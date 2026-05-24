import { Injectable, computed, inject, effect, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';

export enum CellState {
  Hidden = 0,
  Revealed = 1,
  Flagged = 2,
  Exploded = 3
}

export interface Cell {
  x: number;
  y: number;
  state: CellState;
  neighbors: number;
  owner?: string;
}

export interface GameState {
  board: {
    width: number;
    height: number;
    mines: number;
    cells: Cell[][];
    status: GameStatus;
    revealed_cnt: number;
    start_at?: number;
  };
  scores: { [playerId: string]: number };
  cooldowns: { [playerId: string]: number };
}

export enum GameStatus {
  Waiting = 'waiting',
  Starting = 'starting',
  Playing = 'playing',
  Finished = 'finished',
}

@Injectable()
export class MinesweeperStore {
  private ws = inject(WebSocketService);
  private audio = inject(AudioService);
  private auth = inject(AuthStore);
  
  private playerId = computed(() => this.auth.currentUser()?.username || 'Guest');

  // Derive all state from the WebSocketService's global gameState
  private rawState = computed(() => this.ws.gameState() || {
    board: { cells: [], status: GameStatus.Waiting, width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 },
    boards: {},
    scores: {},
    cooldowns: {},
    host: '',
    status: GameStatus.Waiting
  });

  // For Steal mode it's just rawState().board. For Speed mode it's rawState().boards[playerId]
  private myBoardData = computed(() => {
    const s = this.rawState();
    if (s.boards && s.boards[this.playerId()]) {
      return s.boards[this.playerId()];
    }
    return s.board || { cells: [], status: GameStatus.Waiting, width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 };
  });

  readonly board = computed<Cell[][]>(() => this.myBoardData().cells || []);
  readonly status = computed<GameStatus>(() => {
    const s = this.rawState();
    // Use top-level status if it exists (Speed Mode), otherwise fallback to board status
    if (s.boards && s.status) return s.status;
    return this.myBoardData().status || GameStatus.Waiting;
  });
  readonly scores = computed<Record<string, number>>(() => this.rawState().scores || {});
  readonly cooldowns = computed<Record<string, number>>(() => this.rawState().cooldowns || {});
  readonly startAt = computed(() => this.myBoardData().start_at || 0);
  readonly host = computed<string>(() => (this.rawState() as any).host || '');
  
  // Calculate opponent progress for Speed Mode
  readonly opponentProgress = computed(() => {
    const s = this.rawState();
    if (!s.boards) return null;
    
    // Find the opponent's board
    const opponentId = Object.keys(s.boards).find(id => id !== this.playerId());
    if (!opponentId) return null;
    
    const oppBoard = s.boards[opponentId];
    if (!oppBoard || !oppBoard.width) return null;
    
    const totalSafe = (oppBoard.width * oppBoard.height) - oppBoard.mines;
    const progress = (oppBoard.revealed_cnt / totalSafe) * 100;
    return Math.min(100, Math.max(0, progress));
  });

  readonly width = computed(() => this.myBoardData().width || 16);
  readonly height = computed(() => this.myBoardData().height || 16);
  readonly totalMines = computed(() => this.myBoardData().mines || 40);

  readonly remainingMines = computed(() => {
    let flagged = 0;
    for (const row of this.board()) {
      for (const cell of row) {
        if (cell.state === CellState.Flagged) flagged++;
      }
    }
    return this.totalMines() - flagged;
  });

  // Play audio based on state changes (simplified for MVP)
  constructor() {
    effect(() => {
      const status = this.status();
      if (status === GameStatus.Finished) {
        this.audio.playWin();
      }
    });
  }

  joinGame(roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'medium') {
    this.ws.connect(roomId, playerId, mode, difficulty);
  }

  leaveGame() {
    this.ws.disconnect();
  }

  startGame() {
    this.ws.send({ type: 'start_game' });
  }

  restartGame() {
    this.ws.send({ type: 'restart_game' });
  }

  revealCell(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playClick();
    this.ws.send({ type: 'reveal', x, y });
  }

  toggleFlag(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playFlag();
    this.ws.send({ type: 'flag', x, y });
  }
}

