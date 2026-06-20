import { GameMode, GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { AudioService } from '../../../../core/services/audio.service';
import { getEmptyGrid, Piece, Tetromino } from '../models/tetris.model';
import { TetrisEngine, TetrisActionType, TetrisState } from './tetris-engine';
import { C2SAction } from '../../../../core/models/websocket.model';

export interface TetrisOpponent {
  id: string;
  score: number;
  lines: number;
  matrix: number[][];
  finished: boolean;
  garbageReceived: number;
}

@Injectable()
export class TetrisStore extends BaseGameStore implements OnDestroy {
  readonly gameId = 'tetris';

  private audio = inject(AudioService);

  // Engine
  private engine = new TetrisEngine();

  // Local State Signals
  grid = signal<number[][]>(getEmptyGrid());
  currentPiece = signal<Piece | null>(null);
  nextPieces = signal<Tetromino[]>([]);
  holdPiece = signal<Tetromino | null>(null);
  canHold = signal<boolean>(true);
  score = signal<number>(0);
  lines = signal<number>(0);
  level = signal<number>(1);
  bestScore = signal<number>(0);
  isDead = signal<boolean>(false);
  localStatus = signal<GameStatusType | string>(GameStatus.Waiting);
  ghostY = signal<number>(-1);
  shakeTrigger = signal<number>(0);
  levelUpSignal = signal<number>(0);
  comboTrigger = signal<number>(0);

  readonly singlePlayerStatus = computed(() => this.localStatus());

  override readonly singlePlayerList = computed(() => []);

  // Opponents State
  opponents = computed<TetrisOpponent[]>(() => {
    const st = this.rawState() as any;
    if (!st || !st.players) return [];
    return Object.values(st.players)
      .filter((p: any) => p.id !== this.playerId())
      .map((p: any) => ({
        id: p.id,
        score: p.score,
        lines: p.lines,
        matrix: p.matrix || [],
        finished: p.finished,
        garbageReceived: p.garbageReceived || 0
      }));
  });

  constructor() {
    super();
    effect(() => {
      const st = this.rawState() as any;
      if (this.currentRoomMode() !== GameMode.Single) {
        if (st?.status === GameStatus.Playing) { // PLAYING
          if (this.status() === GameStatus.Playing && !this.isDead()) {
            // Apply garbage
            const me = st.players[this.playerId()];
            if (me && me.garbageReceived > 0) {
              this.engine.handleAction({ type: TetrisActionType.ApplyGarbage, amount: me.garbageReceived });
              this.updateSignals();
            }
          }
        }
      }
    });

    // Handle game start/stop based on status change
    effect(() => {
      const st = this.rawState();
      if (this.currentRoomMode() !== GameMode.Single) {
        if (st?.status === GameStatus.Playing) {
          if (!this.engine.isDead && this.engine.status !== GameStatus.Playing) {
            this.onGlobalStart();
          }
        } else if (st?.status === GameStatus.Finished) {
          this.engine.stop();
        } else if (st?.status === GameStatus.Starting || st?.status === GameStatus.Waiting) {
          this.isDead.set(false);
          this.engine.isDead = false;
        }
      }
    });

    // Setup an interval to continually poll and update signals since the engine's setInterval runs independently
    setInterval(() => {
      if (this.engine.status === GameStatus.Playing ||
          (this.engine.isDead && this.localStatus() === GameStatus.Playing)) {
        this.updateSignals();
      }
    }, 1000 / 60); // 60fps refresh for UI mapping
  }

  override joinRoom(roomId: string, mode: GameModeType | string = GameMode.Single, difficulty: string = '', hostId: string = '', target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);
    if (mode === GameMode.Single) {
      this.localStatus.set(GameStatus.Waiting);
      this.engine.stop();
      this.resetLocalState();
    }
  }

  override leaveRoom() {
    this.engine.stop();
    super.leaveRoom();
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.localStatus.set(GameStatus.Playing);
      this.resetLocalState();
      
      // Load best score
      if (this.auth.isAuthenticated()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single);
          if (stat) this.bestScore.set(stat.BestScore);
        });
      }

      this.engine.initGame({
        onSound: (s) => this.audio.playTetris(s),
        onHardDrop: () => this.shakeTrigger.update(n => n + 1),
        onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); },
        onCombo: (c) => { this.comboTrigger.set(c); setTimeout(() => this.comboTrigger.set(0), 1100); },
      });
      this.updateSignals();
    } else {
      super.startGame();
    }
  }

  override restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startGame();
    } else {
      super.restartGame();
    }
  }

  private onGameOver() {
    this.engine.stop();
    this.localStatus.set(GameStatus.Finished);
    this.isDead.set(true);
    if (this.currentRoomMode() === GameMode.Single) {
      // Submit stat
      if (this.auth.isAuthenticated()) {
        this.submitSingleStat({ score: this.score() }).subscribe(res => {
          if (res.isNewRecord) {
            this.bestScore.set(this.score());
          }
        });
      }
    } else {
      this.ws.send({ action: C2SAction.GameOver, score: this.engine.score, lines: this.engine.lines });
    }
  }

  private onGlobalStart() {
    this.resetLocalState();
    const seed = this.rawState()?.seed || Date.now();
    this.engine.initGame({
      seed,
      mode: this.currentRoomMode(),
      onSound: (s) => this.audio.playTetris(s),
      onGarbageSent: (lines) => {
        this.ws.send({ action: C2SAction.Attack, lines });
      },
      onSyncState: () => {
        this.syncState();
      },
      onHardDrop: () => this.shakeTrigger.update(n => n + 1),
      onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); },
      onCombo: (c) => { this.comboTrigger.set(c); setTimeout(() => this.comboTrigger.set(0), 1100); },
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
  }

  private resetLocalState() {
    this.grid.set(getEmptyGrid());
    this.score.set(0);
    this.lines.set(0);
    this.level.set(1);
    this.holdPiece.set(null);
    this.canHold.set(true);
    this.isDead.set(false);
  }

  private syncState() {
    this.ws.send({
      action: C2SAction.Move,
      score: this.engine.score,
      lines: this.engine.lines,
      matrix: this.engine.grid
    });
  }

  private updateSignals() {
    const state = this.engine.getState();
    this.grid.set(state.grid);
    this.currentPiece.set(state.currentPiece);
    this.nextPieces.set(state.nextPieces);
    this.holdPiece.set(state.holdPiece);
    this.canHold.set(state.canHold);
    this.score.set(state.score);
    this.lines.set(state.lines);
    this.level.set(state.level);
    this.isDead.set(state.isDead);
    this.ghostY.set(state.ghostY);
    if (state.isDead && this.localStatus() !== GameStatus.Finished) {
      this.onGameOver();
    }
  }

  // Movements wrapper
  moveLeft() { this.engine.handleAction({ type: TetrisActionType.MoveLeft }); this.updateSignals(); }
  moveRight() { this.engine.handleAction({ type: TetrisActionType.MoveRight }); this.updateSignals(); }
  rotate() { this.engine.handleAction({ type: TetrisActionType.Rotate }); this.updateSignals(); }
  softDrop() { this.engine.handleAction({ type: TetrisActionType.SoftDrop }); this.updateSignals(); }
  hardDrop() { this.engine.handleAction({ type: TetrisActionType.HardDrop }); this.updateSignals(); }
  hold() { this.engine.handleAction({ type: TetrisActionType.Hold }); this.updateSignals(); }

  ngOnDestroy() {
    this.engine.stop();
  }
}
