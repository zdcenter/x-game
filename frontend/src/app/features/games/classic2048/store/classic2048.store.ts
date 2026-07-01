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

  constructor() {
    super();

    effect(() => {
      const st = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Single || !st) return;
      
      if (st.boards) {
        this.pkBoards.set(st.boards);
        // Sync local player board
        const myBoard = st.boards[this.playerId()];
        if (myBoard) {
          this.cells.set(myBoard.cells || []);
          this.localScore.set(myBoard.score || 0);
          if (myBoard.status) {
            this.localStatus.set(myBoard.status as GameStatusType);
          }
        }
      }
    });

  }

  protected override onSinglePlayerStart() {
    this.engine.initGame({ difficulty: this.currentDifficulty() });
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
      this.ws.send({ action: 'move', dir });
    }
  }

  undo() {
    if (this.status() !== GameStatus.Playing || this.currentRoomMode() !== GameMode.Single) return;
    const changed = this.engine.handleAction({ action: 'undo' });
    if (changed) {
      this.syncEngineState();
    }
  }

  private syncEngineState() {
    this.cells.set([...this.engine.cells.map(r => [...r])]);
    this.localScore.set(this.engine.score);
    this.localMoves.set(this.engine.moves);
    this.localCanUndo.set(this.engine.history.length > 0);
    this.localStatus.set(this.engine.status as GameStatusType);
  }


}
