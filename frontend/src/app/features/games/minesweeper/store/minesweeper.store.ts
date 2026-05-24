import { Injectable, computed, inject, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';

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

  // Derive all state from the WebSocketService's global gameState
  private rawState = computed(() => this.ws.gameState() || {
    board: { cells: [], status: GameStatus.Waiting, width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 },
    scores: {},
    cooldowns: {},
    host: ''
  });

  readonly board = computed<Cell[][]>(() => this.rawState().board?.cells || []);
  readonly status = computed<GameStatus>(() => this.rawState().board?.status || GameStatus.Waiting);
  readonly scores = computed<Record<string, number>>(() => this.rawState().scores || {});
  readonly cooldowns = computed<Record<string, number>>(() => this.rawState().cooldowns || {});
  readonly startAt = computed(() => this.rawState().board?.start_at || 0);
  readonly host = computed<string>(() => (this.rawState() as any).host || '');

  readonly width = computed(() => this.rawState().board?.width || 16);
  readonly height = computed(() => this.rawState().board?.height || 16);
  readonly totalMines = computed(() => this.rawState().board?.mines || 40);

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

