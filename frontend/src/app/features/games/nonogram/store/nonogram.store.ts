import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { AudioService } from '../../../../core/services/audio.service';
import { C2SAction } from '../../../../core/models/websocket.model';
import { NonogramEngine, CellState } from './nonogram-engine';

export interface LocalNonogramState {
  width: number;
  height: number;
  grid: CellState[][];
  answerGrid: number[][];
  rowHints: number[][];
  colHints: number[][];
  status: GameStatusType;
  startAt: number;
  endAt?: number;
}

export interface NonogramHistoryEntry {
  x: number;
  y: number;
  prevState: CellState;
  batchId?: number;
}

@Injectable()
export class NonogramStore extends BaseGameStore {
  readonly gameId = GameId.Nonogram;
  private audio = inject(AudioService);

  private localState = signal<LocalNonogramState | null>(null);
  readonly history = signal<NonogramHistoryEntry[]>([]);
  
  // Single mode compatibility
  override readonly singlePlayerList = computed(() => []);
  readonly singlePlayerStatus = computed<GameStatusType | string>(() =>
    this.localState()?.status || 'waiting'
  );
  override readonly singlePlayerWinners = computed(() => {
    return this.localState()?.status === GameStatus.Finished ? [this.playerId()] : [];
  });

  // Mode: Fill or Cross
  readonly drawMode = signal<'fill' | 'cross'>('fill');

  readonly width = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.width || 5;
    return (this.rawState() as any)?.width || 5;
  });

  readonly height = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.height || 5;
    return (this.rawState() as any)?.height || 5;
  });

  readonly rowHints = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.rowHints || [];
    return (this.rawState() as any)?.row_hints || [];
  });

  readonly colHints = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.colHints || [];
    return (this.rawState() as any)?.col_hints || [];
  });

  /** Track which rows are currently fulfilled according to row hints */
  readonly completedRows = computed<boolean[]>(() => {
    const g = this.grid();
    const hints = this.rowHints() as number[][];
    if (!g || !hints || g.length === 0 || hints.length === 0) return [];
    return hints.map((expected: number[], y: number) => {
      const row = g[y];
      if (!row) return false;
      const current = NonogramEngine.getLineHints(row.map((c: CellState) => c === 1 ? 1 : 0));
      return current.length === expected.length && current.every((v: number, i: number) => v === expected[i]);
    });
  });

  /** Track which columns are currently fulfilled according to col hints */
  readonly completedCols = computed<boolean[]>(() => {
    const g = this.grid();
    const hints = this.colHints() as number[][];
    const h = this.height();
    if (!g || !hints || g.length === 0 || hints.length === 0) return [];
    return hints.map((expected: number[], x: number) => {
      const col: number[] = [];
      for (let y = 0; y < h; y++) {
        col.push(g[y]?.[x] === 1 ? 1 : 0);
      }
      const current = NonogramEngine.getLineHints(col);
      return current.length === expected.length && current.every((v: number, i: number) => v === expected[i]);
    });
  });

  // Current board grid (Supports Director View for Spectators & Opponents)
  readonly grid = computed<CellState[][]>(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.grid || [];
    if (this.currentRoomMode() === GameMode.Steal) {
      return (this.rawState() as any)?.board || [];
    }

    // Speed mode:
    const isSpec = this.isSpectator();
    const focus = this.focusedPlayerId();
    const myId = this.playerId();
    const raw = this.rawState() as any;
    const players = raw?.players;

    // Determine target player to display
    let targetId = '';
    if (isSpec) {
      if (focus) {
        targetId = focus;
      } else {
        const list = this.playersList();
        const opp = list.find((p: any) => p && p.id && p.id !== myId);
        targetId = opp ? opp.id : (list[0]?.id || '');
      }
    } else if (focus && focus !== myId) {
      targetId = focus;
    }

    if (targetId && (isSpec || targetId !== myId) && players) {
      const p = (typeof players === 'object' && !Array.isArray(players))
        ? (players[targetId] || players[Object.keys(players).find(k => k.toLowerCase() === targetId.toLowerCase()) || ''])
        : (Array.isArray(players) ? players.find((x: any) => x?.id === targetId || x?.id?.toLowerCase() === targetId.toLowerCase()) : null);
      if (p?.grid && Array.isArray(p.grid) && p.grid.length > 0) {
        return p.grid as CellState[][];
      }
    }

    if (!isSpec && this.localState()?.grid) {
      return this.localState()!.grid;
    }

    // Default initialized blank grid matching puzzle dimensions
    const w = this.width();
    const h = this.height();
    if (w > 0 && h > 0) {
      return Array.from({ length: h }, () => Array(w).fill(0 as CellState));
    }
    return [];
  });
  
  readonly totalFilled = computed(() => {
    // In Nonogram, the sum of all numbers in all row hints is mathematically
    // identical to the total number of cells that must be filled.
    const hints = this.rowHints();
    if (hints && hints.length > 0) {
      let sum = 0;
      for (const row of hints) {
        if (Array.isArray(row)) {
          for (const n of row) sum += (Number(n) || 0);
        }
      }
      if (sum > 0) return sum;
    }
    const state = this.localState();
    if (state?.answerGrid && state.answerGrid.length > 0) {
      let count = 0;
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          if (state.answerGrid[y]?.[x] === 1) count++;
        }
      }
      if (count > 0) return count;
    }
    return (this.rawState() as any)?.total_filled || 1;
  });

  readonly localProgress = computed(() => {
    const total = this.totalFilled();
    if (total <= 0) return 0;
    const g = this.grid();
    if (!g || g.length === 0) return 0;
    let filled = 0;
    for (const row of g) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (cell === 1) filled++;
        }
      }
    }
    return Math.min(100, Math.round((filled / total) * 100));
  });

  private tick = signal(0);

  readonly timeSpent = computed(() => {
    this.tick(); // subscribe to tick updates
    const state = this.localState();
    if (!state || !state.startAt) return 0;
    const end = state.endAt || Date.now();
    return Math.floor((end - state.startAt) / 1000);
  });

  constructor() {
    super();
    effect(() => {
      const s = this.status();
      if (s === GameStatus.Finished) {
        this.audio.playPuzzle('success');
      } else if (s === GameStatus.Starting) {
        this.audio.playPuzzle('move');
      }
    });

    // Timer tick for timeSpent updates
    effect((onCleanup) => {
      const s = this.status();
      if (s === GameStatus.Playing) {
        const interval = setInterval(() => this.tick.update(v => v + 1), 1000);
        onCleanup(() => clearInterval(interval));
      }
    });

    // Submit stats when game finishes in single mode
    effect(() => {
      const s = this.status();
      if (s === GameStatus.Finished && this.currentRoomMode() === GameMode.Single) {
        this.submitSingleStat({ time: this.timeSpent(), won: true }).subscribe();
      }
    });

    // Sync localState status with rawState status for PK modes
    effect(() => {
      const raw = this.rawState() as any;
      if (this.currentRoomMode() !== GameMode.Single && raw && raw.status) {
        const state = untracked(() => this.localState());
        if (state && state.status !== raw.status && raw.status !== GameStatus.Playing) {
          this.localState.set({ ...state, status: raw.status });
        }
      }
    });

    // Speed mode sync: when rawState updates and mode is speed, we must sync the answers if we are starting
    effect(() => {
      const raw = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Speed && raw && raw.status === GameStatus.Playing && this.localState()?.status !== GameStatus.Playing) {
        // Init local board for speed mode based on server config
        const w = raw.width || 5;
        const h = raw.height || 5;
        const answerGrid = raw.board || raw.answerGrid; // Actually for speed mode backend doesn't send answer, so we have to use the backend's hints to solve it locally? Wait!
        // The backend for speed mode DOES NOT send the answerBoard to prevent cheating, but here we can just do generation on client if single, but server does it for Speed.
        // The frontend needs to verify win in speed mode, so we need either local solver or just send progress.
        // For now, if speed mode, we can just use the hints and local solver to verify, or wait for server.
        // Actually, in speed mode, the server can verify, but local verification is faster.
        // Let's just track the local grid and calculate progress.
        const grid: CellState[][] = Array(h).fill(0).map(() => Array(w).fill(0));
        
        this.localState.set({
          width: w,
          height: h,
          grid,
          answerGrid: [], // We don't have it locally in speed mode
          rowHints: raw.row_hints,
          colHints: raw.col_hints,
          status: GameStatus.Playing,
          startAt: Date.now()
        });
      }
    });

    // Steal mode sync: sync the backend board to local grid
    effect(() => {
      const raw = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Steal && raw && raw.status === GameStatus.Playing) {
        const w = raw.width || 5;
        const h = raw.height || 5;
        const serverBoard = raw.board;
        
        if (this.localState()?.status !== GameStatus.Playing) {
          const grid: CellState[][] = Array(h).fill(0).map(() => Array(w).fill(0));
          if (serverBoard) {
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                grid[y][x] = serverBoard[y][x] as CellState;
              }
            }
          }
          this.localState.set({
            width: w,
            height: h,
            grid,
            answerGrid: [],
            rowHints: raw.row_hints,
            colHints: raw.col_hints,
            status: GameStatus.Playing,
            startAt: Date.now()
          });
        } else if (serverBoard) {
          const state = this.localState();
          if (state) {
            const newGrid = state.grid.map(row => [...row]);
            let changed = false;
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                if (newGrid[y][x] !== serverBoard[y][x] && serverBoard[y][x] !== 0) {
                  newGrid[y][x] = serverBoard[y][x] as CellState;
                  changed = true;
                }
              }
            }
            if (changed) {
              this.localState.set({ ...state, grid: newGrid });
            }
          }
        }
      }
    });

    // Save state and difficulty preference to local storage using BaseGameStore engine
    effect(() => {
      const mode = this.currentRoomMode();
      const diff = this.currentDifficulty();
      
      if (mode === GameMode.Single && diff && typeof localStorage !== 'undefined') {
        localStorage.setItem('nonogram_difficulty', diff as string);
      }
      this.localState();
      this.saveSinglePlayerProgress();
    });
  }

  override joinRoom(
    roomId: string,
    mode: string = GameMode.Single,
    difficulty?: string,
    hostId?: string,
    target: number = 1,
    password?: string,
    bountyCoins?: number,
    isSpectator?: boolean
  ) {
    if (mode === GameMode.Single) {
      const savedDiff = typeof localStorage !== 'undefined' ? localStorage.getItem('nonogram_difficulty') : null;
      if (savedDiff && (!difficulty || difficulty === GameDifficulty.Medium)) {
        difficulty = savedDiff;
      }
    }
    const finalDiff = difficulty || GameDifficulty.Easy;
    super.joinRoom(roomId, mode, finalDiff, hostId, target, password, bountyCoins, isSpectator);

    if (mode === GameMode.Single) {
      this.currentDifficulty.set(finalDiff);
      this.initSinglePlayer(finalDiff);
    }
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const state = this.localState();
      if (state && state.status !== GameStatus.Finished) {
        this.localState.set({
          ...state,
          status: GameStatus.Playing,
          startAt: Date.now()
        });
      } else {
        this.initSinglePlayer(this.currentDifficulty() as string, true);
      }
    } else {
      super.startGame();
    }
  }
  
  toggleDrawMode() {
    this.drawMode.set(this.drawMode() === 'fill' ? 'cross' : 'fill');
  }

  setDrawMode(mode: 'fill' | 'cross') {
    this.drawMode.set(mode);
  }

  determineNextState(x: number, y: number, isRightClick: boolean = false, forceMode?: 'fill' | 'cross'): CellState {
    const state = this.localState();
    if (!state) return 0;
    const current = state.grid[y][x];
    const targetMode = forceMode ? forceMode : (isRightClick ? 'cross' : this.drawMode());
    
    if (targetMode === 'fill') {
      return current === 1 ? 0 : 1;
    } else {
      return current === 2 ? 0 : 2;
    }
  }

  setCell(x: number, y: number, nextState: CellState, batchId?: number) {
    this.setCellsBatch([{ x, y }], nextState, batchId);
  }

  setCellsBatch(cells: { x: number; y: number }[], nextState: CellState, batchId?: number) {
    if (this.status() !== GameStatus.Playing) return;

    const state = this.localState();
    if (!state) return;

    if (this.currentRoomMode() === GameMode.Steal) {
      for (const { x, y } of cells) {
        if (state.grid[y] && state.grid[y][x] !== nextState) {
          this.ws.send({ action: C2SAction.Move, x, y });
        }
      }
      return;
    }

    const newGrid = state.grid.map(row => [...row]);
    const changes: NonogramHistoryEntry[] = [];

    for (const { x, y } of cells) {
      if (y >= 0 && y < state.height && x >= 0 && x < state.width) {
        const current = newGrid[y][x];
        if (current !== nextState) {
          changes.push({ x, y, prevState: current, batchId });
          newGrid[y][x] = nextState;
        }
      }
    }

    if (changes.length === 0) return;

    this.history.update(h => [...h, ...changes]);
    this.audio.playPuzzle('move');
    this.localState.set({ ...state, grid: newGrid });
    this.checkProgressAndWin(newGrid, state);
  }

  handleCellClick(x: number, y: number, isRightClick: boolean = false, forceMode?: 'fill' | 'cross') {
    if (this.status() !== GameStatus.Playing) return;
    if (this.isSpectator()) return;

    if (this.currentRoomMode() === GameMode.Steal) {
      // Steal mode: we don't handle cross locally, it's just visual, but fill is sent to server
      const mode = forceMode ? forceMode : (isRightClick ? 'cross' : this.drawMode());
      if (mode === 'cross') {
         // Local visual only for steal mode? Better not complicate, steal mode usually no cross needed or we can support it.
         // Let's just send Move for Fill
      } else {
         this.ws.send({ action: C2SAction.Move, x, y });
      }
      return;
    }

    // Single & Speed mode (local interaction)
    const state = this.localState();
    if (!state) return;
    
    // Copy grid
    const newGrid = state.grid.map(row => [...row]);
    const current = newGrid[y][x];
    
    let targetMode = forceMode ? forceMode : (isRightClick ? 'cross' : this.drawMode());
    let nextState: CellState = 0;
    
    if (targetMode === 'fill') {
      nextState = current === 1 ? 0 : 1;
    } else {
      nextState = current === 2 ? 0 : 2;
    }
    
    if (nextState !== current) {
      this.history.update(h => [...h, { x, y, prevState: current }]);
    }
    
    newGrid[y][x] = nextState;
    this.audio.playPuzzle('move');
    
    this.localState.set({ ...state, grid: newGrid });
    
    // Check win condition
    this.checkProgressAndWin(newGrid, state);
  }

  private checkProgressAndWin(newGrid: CellState[][], state: LocalNonogramState) {
    if (this.currentRoomMode() === GameMode.Single) {
      if (NonogramEngine.checkWin(newGrid, state.answerGrid)) {
        this.localState.set({ ...this.localState()!, status: GameStatus.Finished, endAt: Date.now() });
      }
    } else if (this.currentRoomMode() === GameMode.Speed) {
      const targetRowHints = state.rowHints || this.rowHints();
      const targetColHints = state.colHints || this.colHints();
      const currentHints = NonogramEngine.extractHints(newGrid);
      const isWin = JSON.stringify(currentHints.rowHints) === JSON.stringify(targetRowHints) &&
                    JSON.stringify(currentHints.colHints) === JSON.stringify(targetColHints);
      
      let filledCount = 0;
      for (const row of newGrid) {
        if (Array.isArray(row)) {
          for (const cell of row) {
            if (cell === 1) filledCount++;
          }
        }
      }
      const total = this.totalFilled();
      const progress = total > 0 ? Math.min(100, Math.round((filledCount / total) * 100)) : 0;
      
      this.ws.send({ action: 'progress', progress, finished: isWin, grid: newGrid });
      if (isWin) {
        this.localState.set({ ...this.localState()!, status: GameStatus.Finished, endAt: Date.now() });
      }
    }
  }

  undo() {
    if (this.status() !== GameStatus.Playing) return;
    if (this.currentRoomMode() === GameMode.Steal) return;
    
    const state = this.localState();
    const hist = this.history();
    if (!state || hist.length === 0) return;

    const lastMove = hist[hist.length - 1];
    const targetBatchId = lastMove.batchId;

    let countToUndo = 1;
    if (targetBatchId !== undefined) {
      while (countToUndo < hist.length && hist[hist.length - 1 - countToUndo].batchId === targetBatchId) {
        countToUndo++;
      }
    }

    const movesToUndo = hist.slice(hist.length - countToUndo);
    const newGrid = state.grid.map(row => [...row]);
    for (let i = movesToUndo.length - 1; i >= 0; i--) {
      const m = movesToUndo[i];
      newGrid[m.y][m.x] = m.prevState;
    }
    
    this.history.set(hist.slice(0, hist.length - countToUndo));
    this.localState.set({ ...state, grid: newGrid });
    this.audio.playPuzzle('move');
    
    this.checkProgressAndWin(newGrid, state);
  }

  clearBoard() {
    if (this.status() !== GameStatus.Playing) return;
    if (this.currentRoomMode() === GameMode.Steal) return;
    
    const state = this.localState();
    if (!state) return;

    const newGrid = Array(state.height).fill(0).map(() => Array(state.width).fill(0));
    this.history.set([]);
    this.localState.set({ ...state, grid: newGrid });
    this.audio.playPuzzle('move');

    this.checkProgressAndWin(newGrid, state);
  }

  useHint() {
    if (this.status() !== GameStatus.Playing) return;
    if (this.currentRoomMode() !== GameMode.Single) return; // Only allow hints in single player
    
    const state = this.localState();
    if (!state || !state.answerGrid || state.answerGrid.length === 0) return;

    // Find an empty or incorrectly filled cell
    const candidates: {x: number, y: number}[] = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const correct = state.answerGrid[y][x];
        const current = state.grid[y][x];
        // If it should be filled (1) but isn't
        if (correct === 1 && current !== 1) candidates.push({x, y});
        // If it should be empty/crossed (0) but is filled (1)
        if (correct === 0 && current === 1) candidates.push({x, y});
      }
    }

    if (candidates.length === 0) return; // Already perfect, shouldn't happen unless won

    // Pick 3 random cells to fix/reveal if grid is large, else 1
    const numToFix = state.width > 5 ? Math.min(3, candidates.length) : 1;
    
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const newGrid = state.grid.map(row => [...row]);
    
    for (let i = 0; i < numToFix; i++) {
      const cell = candidates[i];
      const correct = state.answerGrid[cell.y][cell.x];
      // Save to history before modifying so player can undo hint? 
      // Usually hints aren't undoable, or they are. Let's make it undoable.
      this.history.update(h => [...h, { x: cell.x, y: cell.y, prevState: state.grid[cell.y][cell.x] }]);
      
      newGrid[cell.y][cell.x] = correct === 1 ? 1 : 2; // Fill or Cross
    }

    this.localState.set({ ...state, grid: newGrid });
    this.audio.playPuzzle('success');
    this.checkProgressAndWin(newGrid, state);
  }

  playAgain() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.initSinglePlayer(this.currentDifficulty() as string, true);
      this.startGame();
    } else {
      super.restartGame();
    }
  }

  private initSinglePlayer(difficulty: string, forceNew = false) {
    const savedDiff = typeof localStorage !== 'undefined' ? localStorage.getItem('nonogram_difficulty') : null;
    if (savedDiff && (!difficulty || difficulty === GameDifficulty.Medium)) {
      difficulty = savedDiff;
      this.currentDifficulty.set(difficulty);
    }

    if (!forceNew) {
      if (this.loadSinglePlayerProgress()) {
        return;
      }
    }

    let w = 5, h = 5;
    if (difficulty === GameDifficulty.Medium) { w = 10; h = 10; }
    else if (difficulty === GameDifficulty.Hard) { w = 15; h = 15; }
    else if (difficulty === GameDifficulty.Expert) { w = 20; h = 20; }
    else if (difficulty === GameDifficulty.Master) { w = 25; h = 25; }

    const { grid: answerGrid, rowHints, colHints } = NonogramEngine.generate(w, h);
    const grid: CellState[][] = Array(h).fill(0).map(() => Array(w).fill(0));
    
    this.localState.set({
      width: w,
      height: h,
      grid,
      answerGrid,
      rowHints,
      colHints,
      status: GameStatus.Playing,
      startAt: Date.now()
    });
    this.history.set([]);
  }

  // ── 接入 BaseGameStore 统一单机断点续玩与终局安全清理引擎 ──────────────────
  protected override enableSinglePlayerSave = true;

  protected override getSinglePlayerSaveKey(): string {
    return 'nonogram_saved_game';
  }

  protected override getSinglePlayerSaveData(): any {
    const state = this.localState();
    if (!state || state.status !== GameStatus.Playing) return null;
    return { state, difficulty: this.currentDifficulty() };
  }

  protected override restoreSinglePlayerSaveData(parsed: any): boolean {
    if (!parsed || !parsed.state || parsed.state.status !== GameStatus.Playing) return false;
    if (parsed.difficulty) {
      this.currentDifficulty.set(parsed.difficulty);
    }
    this.localState.set(parsed.state);
    return true;
  }
}
