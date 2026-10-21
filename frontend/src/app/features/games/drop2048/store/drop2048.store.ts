import { GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { AudioService } from '../../../../core/services/audio.service';
import { storageGet, storageSet, storageRemove } from '../../../../core/utils/browser.util';
import { Drop2048Engine, Drop2048ActionType, DropBlock, ComboText, DROP2048_ROWS, DROP2048_COLS } from './drop2048-engine';
export type { DropBlock, ComboText };
import { C2SAction } from '../../../../core/models/websocket.model';

export interface Drop2048Opponent {
  id: string;
  score: number;
  finished: boolean;
}

@Injectable()
export class Drop2048Store extends BaseGameStore implements OnDestroy {
  readonly gameId = 'drop2048';

  private audio = inject(AudioService);

  // Engine
  private engine = new Drop2048Engine();

  readonly ROWS = DROP2048_ROWS;
  readonly COLS = DROP2048_COLS;

  // Local State Signals
  board = signal<DropBlock[]>([]);
  activeBlock = signal<{ id: string, val: number, c: number, r: number } | null>(null);
  nextVal = signal<number>(2);
  nextVal2 = signal<number>(4);
  localScore = signal<number>(0);
  isDead = signal<boolean>(false);
  combos = signal<ComboText[]>([]);
  particles = signal<{ id: string, x: number, y: number, color: string, size: number, tx?: number, ty?: number }[]>([]);
  bestScore = signal<number>(parseInt(storageGet('drop2048_best') || '0', 10));
  ghostRow = signal<number>(-1);
  comboCount = signal<number>(0);
  level = signal<number>(1);

  readonly maxTile = computed(() => {
    const b = this.board();
    if (!b || b.length === 0) return 2;
    return Math.max(...b.map(x => x.val).filter(v => v > 0), 2);
  });

  localStatus = signal<GameStatusType | string>(GameStatus.Waiting);
  hasRevived = signal<boolean>(false);
  shakeTrigger = signal<number>(0);
  levelUpSignal = signal<number>(0);

  readonly score = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localScore();
    const st = this.rawState() as any;
    if (!st || !st.players || !st.players[this.playerId()]) return this.localScore();
    return st.players[this.playerId()].score || 0;
  });


  readonly singlePlayerStatus = computed(() => this.localStatus());

  override readonly singlePlayerList = computed(() => []);

  opponents = computed<Drop2048Opponent[]>(() => {
    const st = this.rawState() as any;
    if (!st || !st.players) return [];
    return Object.values(st.players)
      .filter((p: any) => p.id !== this.playerId())
      .map((p: any) => ({
        id: p.id,
        score: p.score,
        finished: p.finished
      }));
  });

  constructor() {
    super();

    // Auto-save for single player using BaseGameStore engine
    effect(() => {
      if (this.currentRoomMode() === GameMode.Single) {
        this.board();
        this.activeBlock();
        this.localScore();
        this.saveSinglePlayerProgress();
      }
    });

    // Handle global game state changes
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

    // We still need an interval to sync engine state to Angular signals because engine uses requestAnimationFrame
    setInterval(() => {
      if (this.engine.status === GameStatus.Playing || this.engine.isDead) {
        this.updateSignals();
        if (this.engine.isDead && this.localStatus() !== GameStatus.Finished) {
          this.onGameOver();
        }
      }
    }, 1000 / 60);
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, diff: string = '', hostId: string = '', target: number = 1) {
    super.joinRoom(roomId, mode, diff, hostId, target);
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
      if (this.loadSinglePlayerProgress()) {
        return;
      }
      
      this.localStatus.set(GameStatus.Playing);
      this.resetLocalState();
      
      if (this.auth.isAuthenticated()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single);
          if (stat) this.bestScore.set(stat.BestScore);
        });
      }

      this.engine.initGame({
        mode: GameMode.Single,
        onSound: (sound, combo) => {
          if (sound === 'move' || sound === 'drop' || sound === 'merge' || sound === 'wild') {
            this.audio.playDrop2048(sound, combo);
          }
        },
        onBigMerge: () => this.shakeTrigger.update(n => n + 1),
        onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); }
      });
      this.updateSignals();
    } else {
      super.startGame();
    }
  }

  override restartGame() {
    super.restartGame();
    if (this.currentRoomMode() === GameMode.Single) {
      this.resetLocalState();
      this.startGame();
    }
  }

  // ── 接入 BaseGameStore 统一单机断点续玩与终局安全清理引擎 ──────────────────
  protected override enableSinglePlayerSave = true;

  protected override getSinglePlayerSaveKey(): string {
    return 'drop2048_save';
  }

  protected override getSinglePlayerSaveData(): any {
    if (this.isDead() || this.localStatus() === GameStatus.Finished) {
      return null;
    }
    return {
      board: this.board(),
      activeBlock: this.activeBlock(),
      nextVal: this.nextVal(),
      nextVal2: this.nextVal2(),
      localScore: this.localScore(),
      isDead: this.isDead(),
      localStatus: this.localStatus()
    };
  }

  protected override restoreSinglePlayerSaveData(data: any): boolean {
    if (data.isDead || data.localStatus !== GameStatus.Playing) {
      return false;
    }
    this.engine.loadState(data);
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
    return true;
  }

  private onGameOver() {
    this.localStatus.set(GameStatus.Finished);
    this.isDead.set(true);
    this.clearSinglePlayerSave();
    if (this.currentRoomMode() === GameMode.Single) {
      if (this.auth.isAuthenticated()) {
        this.submitSingleStat({ score: this.localScore() }).subscribe(res => {
          if (res.isNewRecord) {
            this.bestScore.set(this.localScore());
            storageSet('drop2048_best', this.localScore().toString());
          }
        });
      }
    } else {
      this.ws.send({ action: C2SAction.GameOver, score: this.engine.score });
    }
  }

  private onGlobalStart() {
    this.resetLocalState();
    const seed = this.rawState()?.seed || Date.now();
    this.engine.initGame({
      seed,
      mode: this.currentRoomMode(),
      onSound: (sound, combo) => {
        if (sound === 'move' || sound === 'drop' || sound === 'merge' || sound === 'wild') {
          this.audio.playDrop2048(sound, combo);
        }
      },
      onSyncState: () => this.syncState(),
      onBigMerge: () => this.shakeTrigger.update(n => n + 1),
      onLevelUp: (lv) => { this.levelUpSignal.set(lv); setTimeout(() => this.levelUpSignal.set(0), 1600); }
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
  }

  private resetLocalState() {
    this.board.set([]);
    this.activeBlock.set(null);
    this.localScore.set(0);
    this.isDead.set(false);
    this.combos.set([]);
    this.particles.set([]);
    this.ghostRow.set(-1);
    this.comboCount.set(0);
    this.level.set(1);
    this.hasRevived.set(false);
  }

  private syncState() {
    this.ws.send({
      action: C2SAction.Move,
      score: this.engine.score
    });
  }

  private updateSignals() {
    const state = this.engine.getState();
    this.board.set(state.board);
    this.activeBlock.set(state.activeBlock);
    this.nextVal.set(state.nextVal);
    this.nextVal2.set(state.nextVal2);
    this.level.set(state.level);

    if (state.score > this.bestScore()) {
      this.bestScore.set(state.score);
      storageSet('drop2048_best', state.score.toString());
    }

    this.localScore.set(state.score);
    this.isDead.set(state.isDead);
    this.combos.set(state.combos);
    this.particles.set(state.particles);
    this.ghostRow.set(state.ghostRow);
    this.comboCount.set(state.comboCount);
  }

  moveLeft() { this.engine.handleAction({ type: Drop2048ActionType.MoveLeft }); this.updateSignals(); }
  moveRight() { this.engine.handleAction({ type: Drop2048ActionType.MoveRight }); this.updateSignals(); }
  softDrop() {
    this.engine.handleAction({ type: Drop2048ActionType.SoftDrop });
    this.updateSignals();
    if (this.engine.isDead) this.onGameOver();
  }
  hardDrop() {
    this.dropActive();
  }
  dropActive() {
    this.engine.handleAction({ type: Drop2048ActionType.Drop });
    this.updateSignals();
    if (this.engine.isDead) this.onGameOver();
  }

  reviveGame() {
    this.hasRevived.set(true);
    this.engine.revive();
    this.localStatus.set(GameStatus.Playing);
    this.isDead.set(false);
    this.updateSignals();
  }

  moveActive(delta: number) {
    if (delta === -1) this.moveLeft();
    else if (delta === 1) this.moveRight();
  }

  getColorForValue(val: number) { return this.engine.getColorForValue(val); }

  ngOnDestroy() {
    this.engine.stop();
  }
}
