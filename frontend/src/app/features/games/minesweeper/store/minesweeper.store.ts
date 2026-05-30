import { Injectable, computed, inject, effect, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalMinesweeperEngine } from './minesweeper-engine';

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
  errors: { [playerId: string]: number };
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
  
  private playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Local state for single player mode
  private currentMode = signal<string>('single');
  private localEngine = signal<LocalMinesweeperEngine | null>(null);
  private tick = signal(0);

  // Derive all state from the WebSocketService's global gameState
  private rawState = computed(() => this.ws.gameState() || {
    board: { cells: [], status: GameStatus.Waiting, width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 },
    boards: {},
    scores: {},
    cooldowns: {},
    errors: {},
    host: '',
    status: GameStatus.Waiting
  });

  // For Steal mode it's just rawState().board. For Speed mode it's rawState().boards[playerId]
  private myBoardData = computed(() => {
    this.tick(); // register dependency to force updates for local mutations
    if (this.currentMode() === 'single') {
      const engine = this.localEngine();
      if (engine) {
        return {
          // Deep clone the cells so that Angular's OnPush change detection sees new object references,
          // matching the behavior of incoming WebSocket JSON payloads.
          cells: engine.cells.map(row => row.map(cell => ({ ...cell }))),
          status: engine.status,
          width: engine.width,
          height: engine.height,
          mines: engine.mines,
          revealed_cnt: engine.revealedCnt,
          start_at: engine.startAt
        };
      }
    }
    
    const s = this.rawState();
    if (s.boards && s.boards[this.playerId()]) {
      return s.boards[this.playerId()];
    }
    return s.board || { cells: [], status: GameStatus.Waiting, width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 };
  });

  readonly board = computed<Cell[][]>(() => this.myBoardData().cells || []);
  readonly status = computed<GameStatus>(() => {
    if (this.currentMode() === 'single') {
      this.tick();
      return this.localEngine()?.status || GameStatus.Waiting;
    }
    const s = this.rawState() as any;
    
    const mapStatus = (st: any): GameStatus => {
      if (st === 0 || st === 'waiting') return GameStatus.Waiting;
      if (st === 1 || st === 'starting') return GameStatus.Starting;
      if (st === 2 || st === 'playing') return GameStatus.Playing;
      if (st === 3 || st === 'finished') return GameStatus.Finished;
      return GameStatus.Waiting;
    };

    if (s.status !== undefined) {
      return mapStatus(s.status);
    }
    
    return mapStatus(this.myBoardData().status);
  });
  
  readonly scores = computed<Record<string, number>>(() => {
    if (this.currentMode() === 'single') return { [this.playerId()]: 0 };
    return this.rawState().scores || {};
  });
  
  readonly cooldowns = computed<Record<string, number>>(() => {
    if (this.currentMode() === 'single') return {};
    return this.rawState().cooldowns || {};
  });

  readonly myErrors = computed<number>(() => {
    if (this.currentMode() === 'single') return 0;
    const errors = this.rawState().errors || {};
    return errors[this.playerId()] || 0;
  });

  readonly opponentErrors = computed<number>(() => {
    if (this.currentMode() === 'single') return 0;
    const s = this.rawState();
    const errors = s.errors || {};
    // For steal mode fallback, if we need it somewhere specific
    const opponentId = Object.keys(s.scores || {}).find(id => id !== this.playerId());
    if (!opponentId) return 0;
    return errors[opponentId] || 0;
  });
  
  readonly startAt = computed(() => this.myBoardData().start_at || 0);
  
  readonly host = computed<string>(() => {
    if (this.currentMode() === 'single') return this.playerId();
    return (this.rawState() as any).host || '';
  });
  
  readonly speedOpponents = computed(() => {
    if (this.currentMode() !== 'pk_speed') return [];
    const s = this.rawState();
    if (!s.boards) return [];
    
    const opponents = [];
    for (const [id, board] of Object.entries(s.boards as Record<string, any>)) {
      if (id === this.playerId()) continue;
      if (!board || !board.width) continue;
      
      const totalSafe = (board.width * board.height) - board.mines;
      const progress = (board.revealed_cnt / totalSafe) * 100;
      opponents.push({
        id,
        progress: Math.min(100, Math.max(0, progress)),
        errors: (s.errors && s.errors[id]) || 0
      });
    }
    return opponents;
  });

  readonly width = computed(() => this.myBoardData().width || 16);
  readonly height = computed(() => this.myBoardData().height || 16);
  readonly totalMines = computed(() => this.myBoardData().mines || 40);

  readonly myRevealedCnt = computed(() => this.myBoardData().revealed_cnt || 0);
  readonly totalSafeCells = computed(() => (this.width() * this.height()) - this.totalMines());
  
  readonly myProgress = computed(() => {
    const total = this.totalSafeCells();
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (this.myRevealedCnt() / total) * 100));
  });

  readonly remainingMines = computed(() => {
    let flagged = 0;
    for (const row of this.board()) {
      for (const cell of row) {
        if (cell.state === CellState.Flagged) flagged++;
      }
    }
    return this.totalMines() - flagged;
  });

  constructor() {}

  startLocalGame(width: number, height: number, mines: number) {
    this.currentMode.set('single');
    this.ws.disconnect('minesweeper'); // Ensure we don't hold a WebSocket for single player
    this.localEngine.set(new LocalMinesweeperEngine(width, height, mines));
    this.tick.set(this.tick() + 1);
  }

  joinGame(roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'medium', hostId?: string) {
    if (mode === 'single') {
       this.currentMode.set('single');
    } else {
      this.currentMode.set(mode);
      this.ws.connect('minesweeper', roomId, playerId, mode, difficulty, hostId);
    }
  }

  leaveGame() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
    }
    // Give it a tiny delay to ensure the message is sent before the connection closes
    setTimeout(() => {
      this.ws.disconnect('minesweeper');
    }, 100);
  }

  startGame() {
    if (this.currentMode() === 'single') {
       const engine = this.localEngine();
       if (engine) {
          engine.status = GameStatus.Playing;
          this.tick.set(this.tick() + 1);
       }
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  restartGame() {
    if (this.currentMode() === 'single') {
       const engine = this.localEngine();
       if (engine) {
          this.startLocalGame(engine.width, engine.height, engine.mines);
       }
    } else {
      this.ws.send({ type: 'restart_game' });
    }
  }

  dismissRoom() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'dismiss_room' });
    }
  }

  revealCell(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playClick();
    
    if (this.currentMode() === 'single') {
      const engine = this.localEngine();
      if (engine) {
        engine.revealCell(x, y);
        this.tick.set(this.tick() + 1);
      }
    } else {
      this.ws.send({ type: 'reveal', x, y });
    }
  }

  toggleFlag(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playFlag();
    
    if (this.currentMode() === 'single') {
      const engine = this.localEngine();
      if (engine) {
        engine.toggleFlag(x, y);
        this.tick.set(this.tick() + 1);
      }
    } else {
      this.ws.send({ type: 'flag', x, y });
    }
  }
}

