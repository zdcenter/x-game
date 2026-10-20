import { GameDifficulty, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect, Signal } from '@angular/core';
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
  clearingCells = signal<string[]>([]);
  clearingSet = computed(() => new Set(this.clearingCells()));
  private clearTimerId: any = null;
  lastScoreGain = signal<{ score: number; lines: number; ts: number } | null>(null);

  // Visual Theme: 'crystal' (Harmonious Multi-Gem) | 'gold' (Royal Amber Gold) | 'ocean' (Deep Ocean Ice)
  colorTheme = signal<'crystal' | 'gold' | 'ocean'>((storageGet('block_theme') as any) || 'crystal');

  setColorTheme(theme: 'crystal' | 'gold' | 'ocean') {
    this.colorTheme.set(theme);
    storageSet('block_theme', theme);
  }

  cycleColorTheme() {
    const cur = this.colorTheme();
    const next = cur === 'crystal' ? 'gold' : (cur === 'gold' ? 'ocean' : 'crystal');
    this.setColorTheme(next);
    this.audio.playClick();
  }

  localStatus = signal<GameStatusType | string>(GameStatus.Waiting);

  private _pendingClearRows: number[] = [];
  private _pendingClearCols: number[] = [];

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

  loadBestScore() {
    const savedBest = parseInt(storageGet('block_best_score') || '0', 10);
    if (savedBest > this.bestScore()) {
      this.bestScore.set(savedBest);
    }
    if (this.auth.isAuthenticated()) {
      this.getStats().subscribe(res => {
        if (res && res.length > 0) {
          const maxBest = Math.max(...res.map(s => s.BestScore || 0), savedBest, this.bestScore());
          this.bestScore.set(maxBest);
          storageSet('block_best_score', maxBest.toString());
        }
      });
    }
  }

  constructor() {
    super();

    // Always load personal best score on startup
    this.loadBestScore();

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

    // Auto-save for single player using BaseGameStore engine
    effect(() => {
      if (this.currentRoomMode() === GameMode.Single && this.localStatus() === GameStatus.Playing) {
        this.localScore();
        this.localBoard();
        this.localHand();
        this.saveSinglePlayerProgress();
      }
    });
  }

  bestScore = signal<number>(0);

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
      this.loadBestScore();
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

  private ensureEngineConfigured(mode: string = this.currentRoomMode()) {
    this.engine.configure({
      mode,
      difficulty: this.currentDifficulty(),
      onSound: (sound, combo) => {
        if (sound === 'clear') {
          const count = combo || Math.max(this.clearTrigger(), this._pendingClearRows.length + this._pendingClearCols.length, 1);
          this.audio.playBlock('clear', count);
        } else {
          this.audio.playBlock(sound);
        }
      },
      onSyncState: () => this.syncState(),
      onLinesClear: (c, rows, cols) => {
        this._pendingClearRows = rows;
        this._pendingClearCols = cols;
        this.clearTrigger.set(c);
        setTimeout(() => this.clearTrigger.set(0), 1100);
        if (c >= 2) this.shakeTrigger.update(n => n + 1);
      }
    });
  }

  private startLocalGame(seed?: number) {
    this.ensureEngineConfigured(GameMode.Single);
    this.engine.initGame({
      mode: GameMode.Single,
      difficulty: this.currentDifficulty(),
      seed
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
    this.saveSinglePlayerProgress();
  }

  private onGlobalStart(seed?: number) {
    this.ensureEngineConfigured(this.currentRoomMode());
    this.engine.initGame({
      mode: this.currentRoomMode(),
      difficulty: this.currentDifficulty(),
      seed
    });
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
  }

  placeShape(handIndex: number, startRow: number, startCol: number) {
    this._pendingClearRows = [];
    this._pendingClearCols = [];
    const prevScore = this.localScore();

    this.engine.handleAction({
      type: BlockActionType.Place,
      handIndex,
      startRow,
      startCol
    });
    this.updateSignals();

    const gained = this.localScore() - prevScore;
    if (this._pendingClearRows.length > 0 || this._pendingClearCols.length > 0) {
      const size = this.boardSize();
      const keys: string[] = [];
      this._pendingClearRows.forEach(r => {
        for (let c = 0; c < size; c++) keys.push(`${r}-${c}`);
      });
      this._pendingClearCols.forEach(c => {
        for (let r = 0; r < size; r++) {
          const k = `${r}-${c}`;
          if (!keys.includes(k)) keys.push(k);
        }
      });
      this.clearingCells.set(keys);
      if (this.clearTimerId) clearTimeout(this.clearTimerId);
      this.clearTimerId = setTimeout(() => {
        this.clearingCells.set([]);
        this.clearTimerId = null;
      }, 320); // 320ms 极速利落清理，绝不让方块卡住发呆！
      this.lastScoreGain.set({
        score: gained,
        lines: this._pendingClearRows.length + this._pendingClearCols.length,
        ts: Date.now()
      });
    }

    if (this.currentRoomMode() === GameMode.Single) {
      if (this.localScore() > this.bestScore()) {
        this.bestScore.set(this.localScore());
        storageSet('block_best_score', this.localScore().toString());
      }
    }

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
    this.audio.playBlock('gameover');
    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({
        action: C2SAction.GameOver,
        score: this.localScore(),
        matrix: this.localBoard()
      });
    } else {
      if (this.localScore() > this.bestScore()) {
        this.bestScore.set(this.localScore());
        storageSet('block_best_score', this.localScore().toString());
      }
      this.clearSinglePlayerSave();
      this.submitSingleStat({ score: this.localScore(), won: false }).subscribe(res => {
        if (res && res.isNewRecord) {
          this.bestScore.set(this.localScore());
          storageSet('block_best_score', this.localScore().toString());
        }
      });
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

  // ── 接入 BaseGameStore 统一单机断点续玩与终局安全清理引擎 ──────────────────
  protected override enableSinglePlayerSave = true;

  protected override getSinglePlayerSaveKey(): string {
    return 'block_save';
  }

  protected override getSinglePlayerSaveData(): any {
    if (this.isDead() || this.localStatus() !== GameStatus.Playing) return null;
    return {
      score: this.localScore(),
      board: this.localBoard(),
      hand: this.localHand(),
      size: this.boardSize()
    };
  }

  protected override restoreSinglePlayerSaveData(save: any): boolean {
    if (save.size !== this.boardSize()) return false;
    this.ensureEngineConfigured(GameMode.Single);
    this.engine.loadState(save);
    this.localStatus.set(GameStatus.Playing);
    this.updateSignals();
    return true;
  }

  override loadSinglePlayerProgress(): boolean {
    const ok = super.loadSinglePlayerProgress();
    if (!ok) {
      this.startLocalGame();
    }
    return ok;
  }
}
