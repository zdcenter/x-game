import { Injectable, computed, signal, effect } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Classic2048Engine } from './classic2048-engine';

@Injectable()
export class Classic2048Store extends BaseGameStore {
  readonly gameId = 'classic2048';

  // Local state signals
  cells = signal<number[][]>([]);
  localScore = signal(0);
  localMoves = signal(0);
  localCanUndo = signal(false);
  localStatus = signal<GameStatusType>(GameStatus.Waiting);
  hasRevived = signal(false);
  particles = signal<any[]>([]);
  shakeTrigger = signal(0);

  // For PK mode
  pkBoards = signal<Record<string, { cells: number[][], score: number, status: string }>>({});

  private engine = new Classic2048Engine();

  readonly singlePlayerStatus = computed(() => this.localStatus());

  override readonly playersList = computed<any[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerList();
    }
    const boards = this.pkBoards();
    return Object.keys(boards).map(k => ({ id: k, board: boards[k] }));
  });

  private pkInitialized = false;

  constructor() {
    super();

    effect(() => {
      const st = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Single || !st) {
        this.pkInitialized = false;
        return;
      }
      
      if (st.boards) {
        this.pkBoards.set(st.boards);
        const myBoard = st.boards[this.playerId()];
        if (myBoard) {
          const globalStatus = this.status();

          // Initialize local engine for PK when starting or restarting
          if (!this.pkInitialized || globalStatus === GameStatus.Starting || (globalStatus === GameStatus.Playing && this.engine.status === 'waiting')) {
            if (myBoard.cells && myBoard.cells.length > 0) {
              this.engine.cells = myBoard.cells.map((r: number[]) => [...r]);
              this.engine.boardSize = myBoard.cells.length;
              this.engine.score = myBoard.score || 0;
              this.engine.status = 'playing';
              this.syncEngineState();
              this.pkInitialized = true;
            }
          }

          // If game finished on server, sync final status
          if (myBoard.status === 'finished' || st.status === 'finished') {
            this.localStatus.set(GameStatus.Finished);
            this.pkInitialized = false;
          }
        }
      }
    });

  }

  protected override onSinglePlayerStart() {
    this.hasRevived.set(false);
    this.engine.initGame({ 
      difficulty: this.currentDifficulty(),
      onReviveShake: () => this.shakeTrigger.update(n => n + 1)
    });
    this.syncEngineState();
  }

  protected override onSinglePlayerRestart() {
    this.onSinglePlayerStart();
  }

  move(dir: string) {
    if (this.status() !== GameStatus.Playing) return;

    if (this.currentRoomMode() === GameMode.Single) {
      const changed = this.engine.handleAction({ action: 'move', dir });
      if (changed) {
        this.syncEngineState();
        if (this.engine.status === 'finished') {
          this.localStatus.set(GameStatus.Finished);
        }
      }
    } else {
      // PK Mode: Optimistic local update for instantaneous 0ms feedback
      const changed = this.engine.handleAction({ action: 'move', dir });
      if (changed) {
        this.syncEngineState();
        this.ws.send({ action: 'move', dir });
      }
    }
  }

  undo() {
    if (this.status() !== GameStatus.Playing || this.currentRoomMode() !== GameMode.Single) return;
    const changed = this.engine.handleAction({ action: 'undo' });
    if (changed) {
      this.syncEngineState();
    }
  }

  reviveGame() {
    this.hasRevived.set(true);
    this.engine.revive();
    this.localStatus.set(GameStatus.Playing);
    
    // Sync state frequently to show sequential explosion
    const syncInterval = setInterval(() => {
      this.syncEngineState();
    }, 16);

    setTimeout(() => {
      clearInterval(syncInterval);
      this.syncEngineState(); // final sync
    }, 2500); // Wait enough time for all explosions to finish
  }

  private syncEngineState() {
    this.cells.set([...this.engine.cells.map(r => [...r])]);
    this.localScore.set(this.engine.score);
    this.localMoves.set(this.engine.moves);
    this.localCanUndo.set(this.engine.history.length > 0);
    this.localStatus.set(this.engine.status as GameStatusType);
    this.particles.set([...this.engine.particles]);
  }


}
