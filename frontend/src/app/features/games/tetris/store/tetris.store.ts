import { GameMode, GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect, untracked, OnDestroy } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { AudioService } from '../../../../core/services/audio.service';
import { getEmptyGrid, Piece, Tetromino, TetrisColorTheme } from '../models/tetris.model';
import { TetrisEngine, TetrisActionType, TetrisState } from './tetris-engine';
import { C2SAction } from '../../../../core/models/websocket.model';
import { storageGet, storageSet } from '../../../../core/utils/browser.util';

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
  tetrisTrigger = signal<number>(0);
  hasRevived = signal<boolean>(false);
  particles = signal<any[]>([]);
  clearingRows = signal<number[]>([]);
  isDissolving = signal<boolean>(false);
  dissolvingRows = signal<number[]>([]);

  // Battle PK Combat Signals
  pendingGarbage = signal<number>(0);
  garbageLockUntil = signal<number>(0);
  bufferSecondsLeft = signal<string>('0.0');
  attackLaser = signal<{ lines: number; id: number } | null>(null);
  counterNotice = signal<{ lines: number; id: number } | null>(null);
  incomingNotice = signal<{ lines: number; id: number } | null>(null);

  private lastReceivedGarbageTotal = 0;

  // Color Theme Signal with persistence
  colorTheme = signal<TetrisColorTheme>(
    (storageGet('tetris_color_theme') as TetrisColorTheme) || 'crystal'
  );

  cycleColorTheme() {
    const current = this.colorTheme();
    const next: TetrisColorTheme = current === 'crystal' ? 'gold' : current === 'gold' ? 'ocean' : 'crystal';
    this.colorTheme.set(next);
    storageSet('tetris_color_theme', next);
  }

  readonly singlePlayerStatus = computed(() => this.localStatus());

  override readonly singlePlayerList = computed(() => []);

  // Opponents State
  opponents = computed<TetrisOpponent[]>(() => {
    const st = this.rawState() as any;
    if (!st || !st.players) return [];
    const isSpec = this.isSpectator();
    const myId = this.playerId();
    return Object.values(st.players)
      .filter((p: any) => p && (isSpec || p.id !== myId))
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
            // Queue incoming garbage into tactical warning meter instead of abrupt insertion
            const me = st.players?.[this.playerId()];
            if (me && me.garbageReceived > this.lastReceivedGarbageTotal) {
              const incoming = me.garbageReceived - this.lastReceivedGarbageTotal;
              this.lastReceivedGarbageTotal = me.garbageReceived;
              this.engine.handleAction({ type: TetrisActionType.QueueGarbage, amount: incoming });
              this.incomingNotice.set({ lines: incoming, id: Date.now() });
              setTimeout(() => this.incomingNotice.set(null), 2500);
              this.updateSignals();
            }
          }
        }
      }
    });

    // Handle game start/stop strictly based on SERVER status changes (prevents local state death from triggering auto-restart)
    let prevServerStatus: string | undefined = undefined;
    effect(() => {
      const st = this.rawState();
      if (this.currentRoomMode() !== GameMode.Single) {
        const curStatus = st?.status;
        if (curStatus !== prevServerStatus) {
          if (curStatus === GameStatus.Playing) {
            untracked(() => {
              this.onGlobalStart();
            });
          } else if (curStatus === GameStatus.Finished) {
            untracked(() => {
              this.engine.stop();
              this.localStatus.set(GameStatus.Finished);
            });
          } else if (curStatus === GameStatus.Starting || curStatus === GameStatus.Waiting) {
            untracked(() => {
              this.isDead.set(false);
              this.engine.isDead = false;
              this.engine.stop();
              this.localStatus.set(curStatus);
            });
          }
          prevServerStatus = curStatus;
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

  override joinRoom(
    roomId: string,
    mode: GameModeType | string = GameMode.Single,
    difficulty: string = '',
    hostId: string = '',
    target: number = 1,
    password: string = '',
    bounty: number = 0,
    isSpectator: boolean = false
  ) {
    super.joinRoom(roomId, mode, difficulty, hostId, target, password, bounty, isSpectator);
    if (mode === GameMode.Single) {
      this.localStatus.set(GameStatus.Waiting);
      this.engine.stop();
      this.resetLocalState();
      
      const savedBest = parseInt(storageGet('tetris_best_score') || '0', 10);
      this.bestScore.set(savedBest);
      
      if (this.auth.isAuthenticated()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single);
          if (stat) {
             const maxBest = Math.max(stat.BestScore, savedBest);
             this.bestScore.set(maxBest);
             storageSet('tetris_best_score', maxBest.toString());
          }
        });
      }
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
      
      // bestScore is already loaded in joinRoom


      this.engine.initGame({
        mode: GameMode.Single,
        onSound: (s, lines, combo) => this.audio.playTetris(s, lines, combo),
        onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); },
        onCombo: (c) => { this.comboTrigger.set(c); setTimeout(() => this.comboTrigger.set(0), 1100); },
        onTetris: () => { this.tetrisTrigger.update(n => n + 1); },
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
      onSound: (s, lines, combo) => this.audio.playTetris(s, lines, combo),
      onGarbageSent: (lines) => {
        this.ws.send({ action: C2SAction.Attack, lines });
        this.attackLaser.set({ lines, id: Date.now() });
        setTimeout(() => this.attackLaser.set(null), 1000);
      },
      onCounter: (lines) => {
        this.counterNotice.set({ lines, id: Date.now() });
        setTimeout(() => this.counterNotice.set(null), 1200);
      },
      onGarbageWarning: (pending) => {
        this.pendingGarbage.set(pending);
      },
      onGarbageRise: (lines) => {
        this.shakeTrigger.update(n => n + 1);
      },
      onSyncState: () => {
        this.syncState();
      },
      onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); },
      onCombo: (c) => { this.comboTrigger.set(c); setTimeout(() => this.comboTrigger.set(0), 1100); },
      onTetris: () => { this.tetrisTrigger.update(n => n + 1); },
      onGameOver: () => { this.onGameOver(); },
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
    this.hasRevived.set(false);
    this.particles.set([]);
    this.clearingRows.set([]);
    this.pendingGarbage.set(0);
    this.garbageLockUntil.set(0);
    this.bufferSecondsLeft.set('0.0');
    this.attackLaser.set(null);
    this.counterNotice.set(null);
    this.incomingNotice.set(null);
    this.lastReceivedGarbageTotal = 0;
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
    this.particles.set([...(state.particles || [])]);
    this.clearingRows.set(state.clearingRows || []);
    this.isDissolving.set(state.isDissolving || false);
    this.dissolvingRows.set(state.dissolvingRows || []);
    this.pendingGarbage.set(state.pendingGarbage || 0);
    this.garbageLockUntil.set(state.garbageLockUntil || 0);
    
    const lockUntil = state.garbageLockUntil || 0;
    if (lockUntil > Date.now()) {
      this.bufferSecondsLeft.set(((lockUntil - Date.now()) / 1000).toFixed(1));
    } else {
      this.bufferSecondsLeft.set('0.0');
    }
    
    if (this.currentRoomMode() === GameMode.Single && state.score > this.bestScore()) {
      this.bestScore.set(state.score);
      storageSet('tetris_best_score', state.score.toString());
    }
    
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

  reviveGame() {
    if (this.currentRoomMode() === GameMode.Single && !this.hasRevived() && this.isDead()) {
      this.hasRevived.set(true);
      this.engine.revive();
      this.localStatus.set(GameStatus.Playing);
      this.updateSignals();
    }
  }

  ngOnDestroy() {
    this.engine.stop();
  }
}
