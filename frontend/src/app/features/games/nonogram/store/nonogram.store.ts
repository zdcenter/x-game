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

  // Current board grid
  readonly grid = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.grid || [];
    // For steal mode, backend sends the shared board
    // For speed mode, backend doesn't send the board, we track it locally
    return (this.rawState() as any)?.board || this.localState()?.grid || [];
  });
  
  readonly totalFilled = computed(() => {
     if (this.currentRoomMode() === GameMode.Single) {
        const state = this.localState();
        if (!state) return 0;
        let count = 0;
        for (let y = 0; y < state.height; y++) {
          for (let x = 0; x < state.width; x++) {
             if (state.answerGrid[y][x] === 1) count++;
          }
        }
        return count;
     }
     return (this.rawState() as any)?.total_filled || 1;
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

    // Save state to local storage
    effect(() => {
      const state = this.localState();
      const mode = this.currentRoomMode();
      const diff = this.currentDifficulty();
      
      if (mode === GameMode.Single && state && state.status !== GameStatus.Finished) {
        localStorage.setItem('nonogram_saved_game', JSON.stringify({ state, difficulty: diff }));
      } else if (state?.status === GameStatus.Finished) {
        localStorage.removeItem('nonogram_saved_game');
      }
    });
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Medium, hostId?: string, target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);

    if (mode === GameMode.Single) {
      this.initSinglePlayer(difficulty);
    }
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const state = this.localState();
      if (state) {
        this.localState.set({
          ...state,
          status: GameStatus.Playing,
          startAt: Date.now()
        });
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

  setCell(x: number, y: number, nextState: CellState) {
    if (this.status() !== GameStatus.Playing) return;

    const state = this.localState();
    if (!state) return;

    const current = state.grid[y][x];
    if (current === nextState) return; // No change needed

    if (this.currentRoomMode() === GameMode.Steal) {
       this.ws.send({ action: C2SAction.Move, x, y });
       return;
    }
    
    const newGrid = state.grid.map(row => [...row]);
    this.history.update(h => [...h, { x, y, prevState: current }]);
    newGrid[y][x] = nextState;
    this.audio.playPuzzle('move');
    this.localState.set({ ...state, grid: newGrid });
    this.checkProgressAndWin(newGrid, state);
  }

  handleCellClick(x: number, y: number, isRightClick: boolean = false, forceMode?: 'fill' | 'cross') {
    if (this.status() !== GameStatus.Playing) return;

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
      // For speed mode, we don't have answerGrid, so we check if the current grid satisfies all hints.
      // Easiest way is to extract hints from current grid and compare with original hints.
      const currentHints = NonogramEngine.extractHints(newGrid);
      const isWin = JSON.stringify(currentHints.rowHints) === JSON.stringify(state.rowHints) &&
                    JSON.stringify(currentHints.colHints) === JSON.stringify(state.colHints);
      
      let progress = 0;
      let filledCount = 0;
      for(let yy=0; yy<state.height; yy++) {
        for(let xx=0; xx<state.width; xx++) {
           if (newGrid[yy][xx] === 1) filledCount++;
        }
      }
      progress = this.totalFilled() > 0 ? (filledCount / this.totalFilled()) * 100 : 0;
      
      this.ws.send({ action: 'progress', progress, finished: isWin });
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
    const newGrid = state.grid.map(row => [...row]);
    newGrid[lastMove.y][lastMove.x] = lastMove.prevState;
    
    this.history.set(hist.slice(0, -1));
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
    if (!forceNew) {
      const saved = localStorage.getItem('nonogram_saved_game');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.state && parsed.state.status === GameStatus.Playing) {
            this.currentDifficulty.set(parsed.difficulty || difficulty);
            this.localState.set(parsed.state);
            return;
          }
        } catch(e) {}
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
}
