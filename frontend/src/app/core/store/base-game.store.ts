import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { WebSocketService } from '../services/websocket.service';
import { AuthStore } from '../auth/auth.store';
import { GameStoreInterface } from '../interfaces/game-store.interface';
import { GameMode, GameModeType, GameDifficulty, GameDifficultyType, GameStatusType, GameStatus } from '../models/game.model';
import { C2SAction, MessageType } from '../models/websocket.model';
import { GameRegistryService } from '../services/game-registry.service';
import { GameStatsService, SubmitStatResponse, XPResult } from '../services/game-stats.service';
import { XpService } from '../services/xp.service';
import { AchievementService } from '../services/achievement.service';
import { AudioService } from '../services/audio.service';
import { LayoutService } from '../services/layout.service';

@Injectable()
export abstract class BaseGameStore implements GameStoreInterface {
  readonly ws = inject(WebSocketService);
  readonly auth = inject(AuthStore);
  readonly gameRegistry = inject(GameRegistryService);
  protected readonly stats = inject(GameStatsService);
  protected readonly xpService = inject(XpService);
  protected readonly achievementService = inject(AchievementService);
  protected readonly layoutService = inject(LayoutService);

  // Last stat submission result — cleared on new game start
  readonly lastStatResult = signal<SubmitStatResponse | null>(null);

  // PK stat auto-submit tracking (plain properties, not signals)
  private _pkPrevStatus = '';
  private _pkStatSubmitted = false;
  
  protected readonly audioService = inject(AudioService);

  constructor() {
    // Sync target from WS game state so currentRoomTarget is always up-to-date
    // for both room creators (set in joinRoom) and joiners (set when state arrives).
    effect(() => {
      const t = (this.ws.gameState() as any)?.target;
      if (t > 0) {
        untracked(() => this.currentRoomTarget.set(t));
      }
    });

    // Auto-submit PK match result when game transitions Playing → Finished.
    // Runs once per room (guarded by _pkStatSubmitted flag).
    effect(() => {
      const mode = this.currentRoomMode();
      const cur = this.status();

      if (mode === GameMode.Single) {
        this._pkPrevStatus = '';
        this._pkStatSubmitted = false;
        return;
      }

      if (
        cur === GameStatus.Finished &&
        this._pkPrevStatus === GameStatus.Playing &&
        !this._pkStatSubmitted &&
        this.auth.isAuthenticated()
      ) {
        this._pkStatSubmitted = true;
        untracked(() => this._submitPKStat());
      }
      // Reset for each new round when host restarts mid-series
      if (cur === GameStatus.Waiting && this._pkPrevStatus === GameStatus.Finished) {
        this._pkStatSubmitted = false;
      }
      this._pkPrevStatus = cur as string;
    });

    // Play countdown audio when starting
    effect(() => {
      if (this.status() === GameStatus.Starting) {
        untracked(() => this.audioService.playCountdown());
      }
    });

    // Automatically scroll to top when game starts playing or countdown begins
    effect(() => {
      const cur = this.status();
      if (cur === GameStatus.Starting || cur === GameStatus.Playing) {
        untracked(() => this.layoutService.scrollToTop());
      }
    });
  }

  readonly roomId = signal<string>('');
  readonly currentRoomMode = signal<GameModeType | string>(GameMode.Single);
  readonly currentDifficulty = signal<GameDifficultyType | string>(GameDifficulty.Medium);
  readonly currentRoomTarget = signal<number>(1);

  readonly playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Derive all state from the WebSocketService's global gameState
  protected rawState = computed(() => this.ws.gameState());

  // Default implementations for aliases required by GameStoreInterface
  readonly hostId = computed<string>(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.playerId();
    const s = this.rawState() as any;
    return s ? (s.host || '') : '';
  });

  readonly readyPlayers = computed<Record<string, boolean>>(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    return (this.rawState() as any)?.readyPlayers || {};
  });

  // 子类必须提供游戏ID用于 websocket 路由
  abstract readonly gameId: string;

  // 子类必须实现单机状态
  abstract readonly singlePlayerStatus: import('@angular/core').Signal<GameStatusType | string>;

  // 默认实现：单个玩家自己；需要特殊列表的游戏（如五子棋双方）可 override
  readonly singlePlayerList = computed<any[]>(() => [{ id: this.playerId() }]);

  // 默认实现：无明确胜者（得分类游戏）；需要显示胜者的游戏可 override
  readonly singlePlayerWinners = computed<string[]>(() => []);

  readonly playersList = computed<any[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerList();
    }
    const players = (this.rawState() as any)?.players;
    if (!players) return [];
    // Ensure id is present in the object
    return Object.keys(players).map(k => ({ id: k, ...players[k] }));
  });

  readonly winners = computed<string[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerWinners();
    }
    return (this.rawState() as any)?.winners || [];
  });

  readonly status = computed<GameStatusType | string>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerStatus();
    }
    const st = this.rawState() as any;
    if (!st) return GameStatus.Waiting;
    let s = st.status;
    if (typeof s === 'number') {
      const statusMap: any[] = [GameStatus.Waiting, GameStatus.Starting, GameStatus.Playing, GameStatus.Finished];
      return statusMap[s] || 'waiting';
    }
    return s || 'waiting';
  });

  readonly isWaiting = computed(() => this.status() === GameStatus.Waiting);
  readonly isStarting = computed(() => this.status() === GameStatus.Starting);
  readonly isPlaying = computed(() => this.status() === GameStatus.Playing);
  readonly isFinished = computed(() => this.status() === GameStatus.Finished);

  // ── 多局模式 (Multi-Round) ────────────────────────────────────────────────
  /** 各玩家本系列已累积赢局数。只要后端 GetState 包含 wins 字段即可读取。 */
  readonly pkWins = computed<Record<string, number>>(
    () => ((this.rawState() as any)?.wins || {}) as Record<string, number>
  );

  /** 当前系列是否已决出胜负（有人达到 target 局）。 */
  readonly isSeriesOver = computed<boolean>(() => {
    if (this.currentRoomMode() === GameMode.Single) return true;
    const target = this.currentRoomTarget();
    if (target <= 1) return true;
    const wins = this.pkWins();
    return Object.values(wins).some(w => w >= target);
  });

  /** PK 多局时显示的比分标签，如 "1 : 0"。系列结束或单机时返回空字符串。 */
  readonly pkScoreLabel = computed<string>(() => {
    if (this.isSeriesOver()) return '';
    const wins = this.pkWins();
    const me = this.playerId();
    const myW = wins[me] || 0;
    const oppW = Object.entries(wins).filter(([k]) => k !== me).reduce((a, [, v]) => a + v, 0);
    return `${myW} : ${oppW}`;
  });

  joinRoom(roomId: string, mode: GameModeType | string = GameMode.Single, difficulty: GameDifficultyType | string = GameDifficulty.Medium, hostId?: string, target: number = 1, password: string = '') {
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomTarget.set(target);
    this._pkPrevStatus = '';
    this._pkStatSubmitted = false;
    this.lastStatResult.set(null);
    if (mode !== GameMode.Single) {
      this.ws.connect(this.gameId, roomId, this.playerId(), mode as string, difficulty as string, hostId, '', password, target);
    }
  }

  leaveRoom() {
    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({ type: C2SAction.LeaveRoom });
    }
    // Give it a tiny delay to ensure the message is sent before the connection closes
    setTimeout(() => {
      this.ws.disconnect(this.gameId);
    }, 100);
    this.roomId.set('');
    this.currentRoomMode.set(GameMode.Single);
  }

  startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerStart();
    } else {
      this.ws.send({ action: C2SAction.StartGame });
    }
  }

  restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerRestart();
      return;
    }
    this.ws.send({
      type: MessageType.Room,
      action: C2SAction.RestartGame
    });
  }

  changeRoomGame(targetGameId: string) {
    if (this.currentRoomMode() === GameMode.Single) return;
    
    const targetConfig = this.gameRegistry.getConfig(targetGameId);
    let targetMode = this.currentRoomMode() as string;
    let targetDiff = this.currentDifficulty() as string;
    
    if (targetConfig) {
       if (!targetConfig.modes.some(m => m.id === targetMode)) {
         const mpMode = targetConfig.modes.find(m => m.id !== GameMode.Single);
         targetMode = mpMode ? mpMode.id : targetConfig.modes[0].id;
       }
       if (!targetConfig.difficulties.some(d => d.id === targetDiff)) {
         targetDiff = targetConfig.difficulties[0].id;
       }
    }

    this.ws.send({
      type: C2SAction.ChangeGame,
      game: targetGameId,
      mode: targetMode,
      difficulty: targetDiff
    });
  }

  // 子类实现单机游戏的开始和重置逻辑
  protected onSinglePlayerStart() {}
  protected onSinglePlayerRestart() {}

  dismissRoom() {
    this.ws.send({ type: C2SAction.DismissRoom });
  }

  ready() {
    this.ws.send({ type: C2SAction.Ready });
  }

  cancelReady() {
    this.ws.send({ type: C2SAction.CancelReady });
  }

  kickPlayer(playerId: string) {
    this.ws.send({ type: C2SAction.KickPlayer, target: playerId });
  }

  // ── 统计辅助方法 ──────────────────────────────────────────────────────────

  /** 获取本游戏的个人最佳统计（使用子类 gameId）。 */
  protected getStats() {
    return this.stats.getStats(this.gameId);
  }

  /**
   * 提交单机模式统计，自动填入 gameId / mode / difficulty。
   * 子类只需传入游戏特有的 score / time / won。
   */
  protected submitSingleStat(payload: { score?: number; time?: number; won?: boolean } = {}): Observable<SubmitStatResponse> {
    this.lastStatResult.set(null);
    return this.stats.submitStat(this.gameId, {
      mode: GameMode.Single,
      difficulty: this.currentDifficulty() as string,
      score: payload.score ?? 0,
      time:  payload.time  ?? 0,
      won:   payload.won   ?? true,
    }).pipe(
      tap(res => {
        this.lastStatResult.set(res);
        if (res.xp_result?.xp_earned) {
          this.xpService.showXpGain(res.xp_result.xp_earned);
        }
        if (res.new_achievements?.length) {
          this.achievementService.handleNewAchievements(res.new_achievements);
        }
      })
    );
  }

  /**
   * 子类可 override 此方法，返回本游戏 PK 模式下的 score / time。
   * 默认从 rawState.players[playerId] 提取 score 字段。
   */
  protected extractPKStatPayload(): { score: number; time: number } {
    const playerState = (this.rawState() as any)?.players?.[this.playerId()];
    return {
      score: playerState?.score ?? 0,
      time:  playerState?.time  ?? playerState?.time_taken ?? 0,
    };
  }

  /** PK 对战结束时由 effect 自动调用，外部不应直接调用。 */
  private _submitPKStat(): void {
    const won = this.winners().includes(this.playerId());
    const { score, time } = this.extractPKStatPayload();
    this.stats.submitStat(this.gameId, {
      mode:       this.currentRoomMode() as string,
      difficulty: this.currentDifficulty() as string,
      score,
      time,
      won,
    }).subscribe({
      next: res => {
        this.lastStatResult.set(res);
        if (res.xp_result?.xp_earned) {
          this.xpService.showXpGain(res.xp_result.xp_earned);
        }
        if (res.new_achievements?.length) {
          this.achievementService.handleNewAchievements(res.new_achievements);
        }
      },
      error: () => {}
    });
  }
}
