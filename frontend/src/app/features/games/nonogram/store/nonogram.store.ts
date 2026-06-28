import { Injectable, computed, inject, signal, effect } from '@angular/core';
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

@Injectable()
export class NonogramStore extends BaseGameStore {
  readonly gameId = GameId.Nonogram;
  private audio = inject(AudioService);

  private localState = signal<LocalNonogramState | null>(null);
  
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
    return (this.rawState() as any)?.rowHints || [];
  });

  readonly colHints = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localState()?.colHints || [];
    return (this.rawState() as any)?.colHints || [];
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

  handleCellClick(x: number, y: number, isRightClick: boolean = false) {
    if (this.status() !== GameStatus.Playing) return;

    if (this.currentRoomMode() === GameMode.Steal) {
      // Steal mode: we don't handle cross locally, it's just visual, but fill is sent to server
      const mode = isRightClick ? 'cross' : this.drawMode();
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
    
    let targetMode = isRightClick ? 'cross' : this.drawMode();
    let nextState: CellState = 0;
    
    if (targetMode === 'fill') {
      nextState = current === 1 ? 0 : 1;
    } else {
      nextState = current === 2 ? 0 : 2;
    }
    
    newGrid[y][x] = nextState;
    this.audio.playPuzzle('move');
    
    this.localState.set({ ...state, grid: newGrid });
    
    // Check win condition
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
      progress = (filledCount / this.totalFilled()) * 100;
      
      this.ws.send({ action: 'progress', progress, finished: isWin });
      if (isWin) {
        this.localState.set({ ...this.localState()!, status: GameStatus.Finished, endAt: Date.now() });
      }
    }
  }

  playAgain() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.initSinglePlayer(this.currentDifficulty() as string);
      this.startGame();
    } else {
      super.restartGame();
    }
  }

  private initSinglePlayer(difficulty: string) {
    let w = 5, h = 5;
    if (difficulty === GameDifficulty.Medium) { w = 10; h = 10; }
    else if (difficulty === GameDifficulty.Hard) { w = 15; h = 15; }

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
  }
}
