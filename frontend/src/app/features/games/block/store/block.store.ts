import { GameDifficulty, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameTimerService } from '../../../../core/services/game-timer.service';
import { AudioService } from '../../../../core/services/audio.service';
import { BlockEngine, BlockActionType, BlockGameState } from './block-engine';
import { BlockShape } from '../utils/shapes';
import { C2SAction } from '../../../../core/models/websocket.model';
import { storageGet, storageSet, storageRemove } from '../../../../core/utils/browser.util';

export interface BlockOpponent {
  id: string;
  score: number;
  matrix: number[][];
  hand: number[];
  finished: boolean;
}

@Injectable({ providedIn: 'root' })
export class BlockStore extends BaseGameStore {
  readonly gameId = 'block';

  private timer = inject(GameTimerService);
  private audio = inject(AudioService);

  private engine = new BlockEngine();

  // Configuration
  boardSize = signal(10); // Default 10x10
  

  // Local State Signals mapped from Engine
  localBoard = signal<number[][]>([]);
  localScore = signal(0);
  localHand = signal<(BlockShape | null)[]>([null, null, null]);
  isDead = signal(false);
  clearTrigger = signal<number>(0);
  shakeTrigger = signal<number>(0);

  localStatus = signal<GameStatusType | string>(GameStatus.Waiting);

  readonly singlePlayerStatus = computed(() => this.localStatus());


  opponents = computed<BlockOpponent[]>(() => {
    const st = this.rawState() as any;
    if (!st || !st.players) return [];
    return Object.values(st.players)
      .filter((p: any) => p.id !== this.playerId())
      .map((p: any) => ({
        id: p.id,
        score: p.score,
        matrix: p.matrix,
        hand: p.hand,
        finished: p.finished
      }));
  });

  board = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localBoard();
    const st = this.rawState() as any;
    if (!st || !st.players || !st.players[this.playerId()]) return this.localBoard();
    return st.players[this.playerId()].matrix || this.localBoard();
  });

  score = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localScore();
    const st = this.rawState() as any;
    if (!st || !st.players || !st.players[this.playerId()]) return 0;
    return st.players[this.playerId()].score;
  });

  hand = computed(() => {
    return this.localHand();
  });

  constructor() {
    super();

    // Initialize local board size and empty board
    this.localBoard.set(this.engine.board);

    effect(() => {
      const st = this.rawState();
      if (this.currentRoomMode() !== GameMode.Single && st) {
        if (st.status === GameStatus.Starting && st.globalStartAt) {
          const delay = Math.max(0, st.globalStartAt - Date.now());
          this.timer.startCountdown();
          setTimeout(() => {
            this.audio.playBlock('error');
            this.onGlobalStart(st.seed);
          }, delay);
        } else if (st.status === GameStatus.Playing) {
           if (this.engine.status !== GameStatus.Playing && !this.engine.isDead) {
             this.onGlobalStart(st.seed);
           }
        } else if (st.status === GameStatus.Waiting) {
           this.engine.stop();
        }
      }
    });

    // Auto-save for single player
    effect(() => {
      if (this.currentRoomMode() === GameMode.Single && this.localStatus() === GameStatus.Playing) {
        const save = {
          score: this.localScore(),
          board: this.localBoard(),
          hand: this.localHand(),
          size: this.boardSize()
        };
        storageSet('block_save', JSON.stringify(save));
      }
    });
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, diff: string = GameDifficulty.Medium, hostId: string = '', target: number = 1) {
    this.currentDifficulty.set(diff);
    super.joinRoom(roomId, mode, diff, hostId, target);
    
    // Set difficulty size
    const size = diff === GameDifficulty.Easy ? 8 : (diff === GameDifficulty.Hard ? 12 : 10);
    this.boardSize.set(size);
    this.localBoard.set(Array.from({ length: size }, () => Array(size).fill(0)));
    
    if (mode === GameMode.Single) {
      this.localStatus.set(GameStatus.Waiting);
      this.loadSinglePlayerProgress();
    }
  }

  override leaveRoom() {
    super.leaveRoom();
    this.engine.stop();
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame();
    } else {
      super.startGame();
    }
  }

  override restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame();
    } else {
      super.restartGame();
    }
  }

  private startLocalGame(seed?: number) {
    this.engine.initGame({
      mode: GameMode.Single,
      difficulty: this.currentDifficulty(),
      seed,
      onSound: (sound) => this.audio.playBlock(sound),
      onSyncState: () => this.syncState(),
      onLinesClear: (c) => {
        this.clearTrigger.set(c);
        setTimeout(() => this.clearTrigger.set(0), 1100);
        if (c >= 2) this.shakeTrigger.update(n => n + 1);
      }
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
    this.saveSinglePlayerProgress();
  }

  private onGlobalStart(seed?: number) {
    this.engine.initGame({
      mode: this.currentRoomMode(),
      difficulty: this.currentDifficulty(),
      seed,
      onSound: (sound) => this.audio.playBlock(sound),
      onSyncState: () => this.syncState(),
      onLinesClear: (c) => {
        this.clearTrigger.set(c);
        setTimeout(() => this.clearTrigger.set(0), 1100);
        if (c >= 2) this.shakeTrigger.update(n => n + 1);
      }
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
  }

  placeShape(handIndex: number, startRow: number, startCol: number) {
    this.engine.handleAction({
      type: BlockActionType.Place,
      handIndex,
      startRow,
      startCol
    });
    this.updateSignals();
    if (this.engine.isDead) {
      this.onGameOver();
    }
  }

  canPlace(shape: BlockShape, startRow: number, startCol: number, board: number[][]): boolean {
    const size = this.boardSize();
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          const br = startRow + r;
          const bc = startCol + c;
          if (br < 0 || br >= size || bc < 0 || bc >= size) return false;
          if (board[br][bc] !== 0) return false;
        }
      }
    }
    return true;
  }

  private updateSignals() {
    const state = this.engine.getState();
    this.localBoard.set(state.board);
    this.localHand.set(state.hand);
    this.localScore.set(state.score);
    this.isDead.set(state.isDead);
    this.boardSize.set(state.boardSize);
  }

  private onGameOver() {
    this.localStatus.set(GameStatus.Finished);
    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({
        action: C2SAction.GameOver,
        score: this.localScore(),
        matrix: this.localBoard()
      });
    } else {
      storageRemove('block_save');
      this.submitSingleStat({ score: this.localScore(), won: false }).subscribe();
    }
  }

  private syncState() {
    if (this.currentRoomMode() !== GameMode.Single && !this.isDead()) {
      this.ws.send({
        action: C2SAction.Update,
        score: this.localScore(),
        matrix: this.localBoard(),
        hand: this.localHand().map(s => s ? s.id : 0)
      });
    }
  }

  private saveSinglePlayerProgress() {
    if (this.currentRoomMode() !== GameMode.Single || this.isDead()) return;
    const save = {
      score: this.localScore(),
      board: this.localBoard(),
      hand: this.localHand(),
      size: this.boardSize()
    };
    storageSet('block_save', JSON.stringify(save));
  }

  private loadSinglePlayerProgress() {
    const saveStr = storageGet('block_save');
    if (saveStr) {
      try {
        const save = JSON.parse(saveStr);
        if (save.size === this.boardSize()) {
          this.engine.loadState(save);
          this.localStatus.set(GameStatus.Playing);
          this.updateSignals();
          return;
        }
      } catch (e) {}
    }
    // Only auto-start if there's no saved game? Wait, original logic called startLocalGame().
    // If not auto-starting, just leave it as waiting.
    // Original logic: this.startLocalGame();
    this.startLocalGame();
  }
}
