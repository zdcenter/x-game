import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, effect, signal, untracked } from '@angular/core';
import { AudioService } from '../../../../core/services/audio.service';
import { LocalSlidingEngine, SlidingAction, SlidingActionType, applySlideMove } from './sliding-engine';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';

@Injectable()
export class SlidingStore extends BaseGameStore {
  readonly gameId = GameId.Sliding;
  private audio = inject(AudioService);

  private localEngine = signal<LocalSlidingEngine | null>(null);
  private pkOptimisticBoard = signal<{ size: number; cells: number[]; emptyIdx: number; status: string; startAt: number; moves: number } | null>(null);
  readonly bestTime = signal<number>(0);

  // playersList & status are required by BaseGameStore
  override readonly singlePlayerList = computed(() => []);

  readonly singlePlayerStatus = computed<GameStatusType | string>(() =>
    this.localEngine()?.status || 'waiting'
  );

  readonly globalStartAt = computed(() => {
    return (this.rawState() as any)?.globalStartAt || 0;
  });

  readonly myBoard = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      const le = this.localEngine();
      if (!le) return null;
      return { size: le.size, cells: le.cells, emptyIdx: le.emptyIdx, status: le.status, startAt: le.startAt, moves: le.moves };
    }
    return this.pkOptimisticBoard() || (this.rawState() as any)?.boards?.[this.playerId()] || null;
  });

  readonly myProgress = computed(() => {
    const board = this.myBoard();
    if (!board) return 0;
    let correct = 0;
    const total = board.size * board.size - 1; // Not counting empty cell
    for (let i = 0; i < total; i++) {
      if (board.cells[i] === i + 1) correct++;
    }
    return (correct / total) * 100;
  });

  readonly myCorrectCount = computed(() => {
    const board = this.myBoard();
    if (!board) return 0;
    let correct = 0;
    const total = board.size * board.size - 1; // Not counting empty cell
    for (let i = 0; i < total; i++) {
      if (board.cells[i] === i + 1) correct++;
    }
    return correct;
  });

  readonly totalCells = computed(() => {
    const board = this.myBoard();
    if (!board) return 15;
    return board.size * board.size - 1;
  });

  readonly allBoards = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    return (this.rawState() as any)?.boards || {};
  });

  readonly otherPlayers = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const boards = (this.rawState() as any)?.boards || {};
    const others = [];
    for (const [id, board] of Object.entries(boards)) {
      if (id !== this.playerId()) {
        others.push({ id, board: board as any });
      }
    }
    return others;
  });

  override readonly singlePlayerWinners = computed(() => {
    
    return this.localEngine()?.status === GameStatus.Finished ? [this.playerId()] : [];
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

    // Synchronize server board state into pkOptimisticBoard
    effect(() => {
      const raw = this.rawState() as any;
      const myServerBoard = raw?.boards?.[this.playerId()];
      if (!myServerBoard) {
        this.pkOptimisticBoard.set(null);
        return;
      }

      const currentOpt = untracked(() => this.pkOptimisticBoard());
      // Re-anchor when not currently playing, or if server is at or ahead of optimistic moves, or first init
      if (!currentOpt || myServerBoard.status !== GameStatus.Playing || myServerBoard.moves >= currentOpt.moves) {
        this.pkOptimisticBoard.set({
          size: myServerBoard.size,
          cells: [...myServerBoard.cells],
          emptyIdx: myServerBoard.emptyIdx,
          status: myServerBoard.status,
          startAt: myServerBoard.startAt,
          moves: myServerBoard.moves
        });
      } else if (myServerBoard.status === GameStatus.Finished && currentOpt.status !== GameStatus.Finished) {
        this.pkOptimisticBoard.set({
          ...currentOpt,
          status: GameStatus.Finished
        });
      }
    });
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Medium, hostId?: string, target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);

    if (mode === GameMode.Single) {
      const engine = new LocalSlidingEngine(difficulty);
      this.localEngine.set(engine);
      
      // Load best time
      if (this.auth.isAuthenticated()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single && s.Difficulty === difficulty);
          if (stat) this.bestTime.set(stat.BestTime);
        });
      }
    }
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const le = this.localEngine();
      if (le) {
        le.status = GameStatus.Playing;
        le.startAt = Date.now();
        this.localEngine.set(Object.assign(new LocalSlidingEngine(this.currentDifficulty() as string), le));
      }
    } else {
      super.startGame();
    }
  }

  dispatch(action: SlidingAction) {
    if (this.status() !== GameStatus.Playing) return;

    if (this.currentRoomMode() === GameMode.Single) {
      const le = this.localEngine();
      if (le) {
        const moved = le.handleAction(action);
        if (moved) {
          this.tick.set(this.tick() + 1);
          this.audio.playPuzzle('move');
          
          // Submit stat if finished
          if (le.status === GameStatus.Finished && this.auth.isAuthenticated()) {
            const timeSecs = Math.floor((le.endAt! - le.startAt!) / 1000);
            this.submitSingleStat({ time: timeSecs }).subscribe(res => {
              if (res.isNewRecord) {
                this.bestTime.set(timeSecs);
              }
            });
          }
          
          // Force reactivity
          this.localEngine.set(Object.assign(new LocalSlidingEngine(this.currentDifficulty() as string), le));
        }
      }
    } else {
      if (action.type === SlidingActionType.Move) {
        const opt = this.pkOptimisticBoard();
        if (opt && opt.status === GameStatus.Playing) {
          const clonedCells = [...opt.cells];
          const draft = { size: opt.size, cells: clonedCells, emptyIdx: opt.emptyIdx, moves: opt.moves };
          if (applySlideMove(draft, action.index)) {
            this.pkOptimisticBoard.set({
              ...opt,
              cells: draft.cells,
              emptyIdx: draft.emptyIdx,
              moves: draft.moves
            });
            this.audio.playPuzzle('move');
            this.ws.send({ action: C2SAction.Move, idx: action.index });
            return;
          }
        }
        // Fallback send if board not ready
        this.ws.send({ action: C2SAction.Move, idx: action.index });
        this.audio.playPuzzle('move');
      }
    }
  }

  playAgain() {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = new LocalSlidingEngine(this.currentDifficulty() as string);
      this.localEngine.set(engine);
      this.startGame();
    } else {
      super.restartGame();
    }
  }
}
