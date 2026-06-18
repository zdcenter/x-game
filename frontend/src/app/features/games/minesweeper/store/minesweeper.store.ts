import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, effect, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalMinesweeperEngine, MinesweeperActionType } from './minesweeper-engine';
import { AdService } from '../../../../core/services/ad.service';
import { ToastService } from '../../../../core/services/toast.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { BaseGameStore } from '../../../../core/store/base-game.store';

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
    status: GameStatusType;
    revealed_cnt: number;
    start_at?: number;
  };
  scores: { [playerId: string]: number };
  cooldowns: { [playerId: string]: number };
  errors: { [playerId: string]: number };
}


@Injectable()
export class MinesweeperStore extends BaseGameStore {
  readonly gameId = GameId.Minesweeper;

  private audio = inject(AudioService);
  private adService = inject(AdService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  
  // Local state for single player mode
  private localEngine = signal<LocalMinesweeperEngine | null>(null);
  private tick = signal(0);
  
  bestTime = signal<number>(0);

  // Override derived state
  override readonly singlePlayerList = computed(() => []);

  // For Steal mode it's just rawState().board. For Speed mode it's rawState().boards[playerId]
  private myBoardData = computed(() => {
    this.tick(); // register dependency to force updates for local mutations
    if (this.currentRoomMode() === GameMode.Single) {
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
    
    const s = this.rawState() as any;
    if (!s) {
      return { cells: [], status: 'waiting', width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 };
    }
    
    if (this.currentRoomMode() === GameMode.Speed) {
      return (s.boards && s.boards[this.playerId()]) ? s.boards[this.playerId()] : null;
    }
    return s.board || { cells: [], status: 'waiting', width: 0, height: 0, mines: 0, revealed_cnt: 0, start_at: 0 };
  });

  readonly board = computed<Cell[][]>(() => this.myBoardData()?.cells || []);
  override readonly singlePlayerStatus = computed<GameStatusType>(() =>
    this.localEngine()?.status || 'waiting'
  );
  
  readonly scores = computed<Record<string, number>>(() => {
    if (this.currentRoomMode() === GameMode.Single) return { [this.playerId()]: 0 };
    const s = this.rawState() as any;
    return s ? (s.scores || {}) : {};
  });
  
  readonly cooldowns = computed<Record<string, number>>(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    const s = this.rawState() as any;
    return s ? (s.cooldowns || {}) : {};
  });

  readonly myErrors = computed<number>(() => {
    if (this.currentRoomMode() === GameMode.Single) return 0;
    const s = this.rawState() as any;
    const errors = s ? (s.errors || {}) : {};
    return errors[this.playerId()] || 0;
  });

  readonly opponentErrors = computed<number>(() => {
    if (this.currentRoomMode() === GameMode.Single) return 0;
    const s = this.rawState() as any;
    if (!s) return 0;
    const errors = s.errors || {};
    // For steal mode fallback, if we need it somewhere specific
    const opponentId = Object.keys(s.scores || {}).find(id => id !== this.playerId());
    if (!opponentId) return 0;
    return errors[opponentId] || 0;
  });
  
  readonly startAt = computed(() => this.myBoardData()?.start_at || 0);
  
  readonly host = computed<string>(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.playerId();
    const s = this.rawState() as any;
    return s ? (s.host || '') : '';
  });
  
  readonly speedOpponents = computed(() => {
    if (this.currentRoomMode() !== GameMode.Speed) return [];
    const s = this.rawState() as any;
    if (!s || !s.boards) return [];
    
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

  constructor() {
    super();
  }

  startLocalGame(width: number, height: number, mines: number, difficulty: string = GameDifficulty.Medium) {
    this.currentRoomMode.set(GameMode.Single);
    this.currentDifficulty.set(difficulty);
    this.ws.disconnect(GameId.Minesweeper); // Ensure we don't hold a WebSocket for single player
    
    const engine = new LocalMinesweeperEngine();
    engine.initGame({ width, height, mines });
    this.localEngine.set(engine);
    
    // Load best time
    if (this.auth.currentUser()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single && s.Difficulty === difficulty);
          if (stat) this.bestTime.set(stat.BestTime);
        });
    }
    
    this.tick.set(this.tick() + 1);
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
       const engine = this.localEngine();
       if (engine) {
          engine.status = GameStatus.Playing;
          engine.startAt = Date.now();
          this.tick.set(this.tick() + 1);
       }
    } else {
      super.startGame();
    }
  }



  dispatch(action: any) {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine) {
        const prevStatus = engine.status;
        engine.handleAction(action);
        this.tick.set(this.tick() + 1);

        if (prevStatus !== GameStatus.Finished && engine.status === GameStatus.Finished) {
          const isWin = !engine.cells.some(row => row.some(c => c.state === CellState.Exploded));
          if (isWin) {
            const timeSec = engine.startAt > 0 ? Math.round((Date.now() - engine.startAt) / 1000) : 0;
            this.submitSingleStat({ time: timeSec, won: true }).subscribe();
          }
        }
      }
    } else {
      this.ws.send(action);
    }
  }

  revealCell(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playClick();
    this.dispatch({ type: MinesweeperActionType.Reveal, x, y });
  }

  toggleFlag(x: number, y: number) {
    if (this.status() !== GameStatus.Playing) return;
    this.audio.playFlag();
    this.dispatch({ type: MinesweeperActionType.Flag, x, y });
  }

  applyHint() {
    if (this.currentRoomMode() !== GameMode.Single || this.status() !== GameStatus.Playing) {
      return;
    }
    this.dispatch({ type: MinesweeperActionType.Hint });
  }
}

