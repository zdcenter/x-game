import { Injectable, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
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
import { CoinService } from '../services/coin.service';
import { LiveActivityService } from '../services/live-activity.service';
import { CrossGameJoinService } from '../services/cross-game-join.service';
import { storageGet, storageSet, storageRemove } from '../utils/browser.util';

@Injectable()
export abstract class BaseGameStore implements GameStoreInterface {
  readonly ws = inject(WebSocketService);
  readonly auth = inject(AuthStore);
  readonly gameRegistry = inject(GameRegistryService);
  protected readonly stats = inject(GameStatsService);
  protected readonly xpService = inject(XpService);
  protected readonly coinService = inject(CoinService);
  protected readonly achievementService = inject(AchievementService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly liveActivity = inject(LiveActivityService);
  protected readonly crossGameJoin = inject(CrossGameJoinService);

  // Last stat submission result — cleared on new game start
  readonly lastStatResult = signal<SubmitStatResponse | null>(null);

  // PK stat auto-submit tracking (plain properties, not signals)
  private _pkPrevStatus = '';
  private _pkStatSubmitted = false;
  
  protected readonly audioService = inject(AudioService);

  constructor() {
    // Sync target & difficulty from WS game state so they are always up-to-date
    // for both room creators and joiners/guests.
    effect(() => {
      const gs = this.ws.gameState() as any;
      const wsDiff = this.ws.currentDifficulty();
      if (gs?.target > 0) {
        untracked(() => this.currentRoomTarget.set(gs.target));
      }
      const newDiff = gs?.difficulty || wsDiff;
      if (newDiff) {
        untracked(() => this.currentDifficulty.set(newDiff));
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

    // 自动接管单机终局安全清理：当任何单机游戏进入 Finished 状态时，100% 自动抹除本地存档
    effect(() => {
      if (this.enableSinglePlayerSave && this.currentRoomMode() === GameMode.Single) {
        if (this.isFinished()) {
          untracked(() => this.clearSinglePlayerSave());
        }
      }
    });

    // 自动防幽灵状态生命周期契约 (Anti-Ghost State Contract):
    // 无论是单机还是联机，当状态重置为 Waiting（等待室/重开）或 Starting（倒计时）时，自动触发重置
    effect(() => {
      const cur = this.status();
      if (cur === GameStatus.Waiting || cur === GameStatus.Starting) {
        untracked(() => this.resetLocalGameState());
      }
    });

    // 观战模式智能导播自动焦点跟随：优先跟随房主或领先玩家
    effect(() => {
      if (this.isSpectator()) {
        const players = this.roomPlayers();
        const currentFocus = this.focusedPlayerId();
        if (players && players.length > 0) {
          const exists = players.some(p => (p.id || p.userId) === currentFocus);
          if (!currentFocus || !exists) {
            const hostP = players.find(p => p.isHost);
            const targetId = hostP ? (hostP.id || hostP.userId) : (players[0].id || players[0].userId);
            if (targetId) {
              untracked(() => this.focusedPlayerId.set(targetId));
            }
          }
        }
      }
    });
  }

  readonly roomId = signal<string>('');
  protected readonly _isSpectator = signal<boolean>(false);
  readonly isSpectator: Signal<boolean> = computed(() => {
    if (this._isSpectator()) return true;
    const st = this.rawState() as any;
    if (st && this.currentRoomMode() !== GameMode.Single) {
      if (Array.isArray(st.spectators) && st.spectators.includes(this.playerId())) {
        return true;
      }
      if (Array.isArray(st.players) && st.players.length > 0 && !st.players.some((p: any) => (p.id || p.userId) === this.playerId())) {
        return true;
      }
    }
    return false;
  });
  readonly focusedPlayerId = signal<string>('');
  readonly currentRoomMode = signal<GameModeType | string>(GameMode.Single);
  readonly currentDifficulty = signal<GameDifficultyType | string>(GameDifficulty.Medium);
  readonly currentRoomTarget = signal<number>(1);
  readonly bountyCoins = computed<number>(() => (this.rawState() as any)?.bountyCoins ?? 0);

  readonly playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Derive all state from the WebSocketService's global gameState
  public readonly rawState = computed(() => this.ws.gameState());

  /**
   * 统一标准化多玩家数组 (Array<PlayerInfo>)
   * 无论后端引擎内部是 Map、Slice 还是以 boards/scores 为键，
   * 经由此信号计算后，全平台永远 100% 保证为标准 JS 数组。
   */
  readonly roomPlayers = computed<any[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerList();
    }
    const st = this.rawState() as any;
    if (!st) return [];

    // Extract engine players map if available
    const enginePlayersMap: Record<string, any> = {};
    const rawPlayers = st.players;
    if (Array.isArray(rawPlayers)) {
      rawPlayers.forEach((p: any) => {
        if (p?.id) enginePlayersMap[p.id] = p;
      });
    } else if (rawPlayers && typeof rawPlayers === 'object') {
      Object.keys(rawPlayers).forEach(k => {
        enginePlayersMap[k] = typeof rawPlayers[k] === 'object' ? rawPlayers[k] : { value: rawPlayers[k] };
      });
    }

    // 1. 优先使用统一 WebSocket 房间广播的 players 数组，并深度合并游戏引擎专有数据（进度、得分等）
    if (Array.isArray(st.roomPlayers) && st.roomPlayers.length > 0) {
      return st.roomPlayers.map((rp: any) => {
        const ep = enginePlayersMap[rp.id] || enginePlayersMap[String(rp.id)] || {};
        return {
          ...rp,
          ...ep,
          score: ep.score ?? rp.score ?? 0,
          progress: ep.progress ?? rp.progress ?? 0
        };
      });
    }

    // 2. 引擎内部 players 字段自适应安全转换
    if (Array.isArray(rawPlayers)) {
      return rawPlayers;
    }
    if (rawPlayers && typeof rawPlayers === 'object') {
      return Object.keys(rawPlayers).map(k => ({
        id: k,
        ...(typeof rawPlayers[k] === 'object' ? rawPlayers[k] : { value: rawPlayers[k] })
      }));
    }

    // 3. 针对纯棋盘引擎（如 sliding, tetris 等以 boards 区分玩家）
    if (st.boards && typeof st.boards === 'object') {
      return Object.keys(st.boards).map(k => ({
        id: k,
        board: st.boards[k]
      }));
    }

    // 4. 针对 readyPlayers 键
    if (st.readyPlayers && typeof st.readyPlayers === 'object') {
      return Object.keys(st.readyPlayers).map(k => ({
        id: k,
        isReady: st.readyPlayers[k]
      }));
    }

    return [];
  });

  /**
   * 兼容接口 playersList -> 统一指向 roomPlayers
   */
  readonly playersList = computed<any[]>(() => this.roomPlayers());

  /**
   * 统一玩家字典映射 (Record<string, PlayerInfo>)
   * 用于以 Player ID 进行 O(1) 瞬时查询，例如 roomPlayersMap()[playerId]
   */
  readonly roomPlayersMap = computed<Record<string, any>>(() => {
    const list = this.roomPlayers();
    const map: Record<string, any> = {};
    for (const p of list) {
      if (p && p.id) {
        map[p.id] = p;
      }
    }
    return map;
  });

  /**
   * 导播当前焦点的选手对象 (PlayerInfo)
   */
  readonly focusedPlayer = computed<any>(() => {
    const focusId = this.focusedPlayerId();
    const map = this.roomPlayersMap();
    if (focusId && map[focusId]) {
      return map[focusId];
    }
    const list = this.roomPlayers();
    return list.length > 0 ? list[0] : null;
  });

  /**
   * 导播当前焦点选手的棋盘/走法/连线状态数据 (State / Board / Bridges / Paths)
   * 供观战视图一键载入镜像，实现全平台统一的毫秒级观战同步
   */
  readonly focusedPlayerBoardState = computed<any>(() => {
    const p = this.focusedPlayer();
    if (!p) return null;
    return p.state ?? p.board ?? p.paths ?? p.bridges ?? null;
  });


  /**
   * 统一房间快照：将 room.players 强制规范化为标准数组，同时挂载 room.playersMap 提供 O(1) 检索
   */
  readonly room = computed<any>(() => {
    const st = this.ws.gameState();
    if (!st) return null;
    return {
      ...st,
      players: this.roomPlayers(),
      playersMap: this.roomPlayersMap()
    };
  });

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

  /**
   * 平台统一终局胜负状态契约 (Universal Game Victory Contract)
   * 无论单机还是联机，全平台统一推导：
   * - true: 当前玩家胜利/通关
   * - false: 失败/惜败/死局
   */
  readonly isVictory = computed<boolean>(() => {
    // 1. 若有明确的 winners 数组（联机对战或重写了 singlePlayerWinners 的单机游戏）
    const w = this.winners();
    if (w && w.length > 0) {
      return w.includes(this.playerId());
    }

    // 2. 检查子类自定义的 isLocalVictory 信号 (如果有)
    const self = this as any;
    if (typeof self.isLocalVictory === 'function') {
      return !!self.isLocalVictory();
    }

    // 3. 检查是否有死局/游戏结束标志 (如方块消除、六边形消除等得分类消除游戏)
    if (self.isDead?.() || self.gameOver?.() || self.isDefeated?.() || self.localEngine?.()?.isDead) {
      return false;
    }

    // 4. 单人模式下：若是纯解谜/通关类游戏，status === Finished 默认即代表解谜成功胜利
    return true;
  });

  /** 对应失败标志 */
  readonly isDefeat = computed<boolean>(() => !this.isVictory());

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

  setFocusedPlayer(playerId: string) {
    if (playerId) {
      this.focusedPlayerId.set(playerId);
    }
  }

  joinRoom(roomId: string, mode: GameModeType | string = GameMode.Single, difficulty: GameDifficultyType | string = GameDifficulty.Medium, hostId?: string, target: number = 1, password: string = '', bounty: number = 0, isSpectator: boolean = false, action: string = '') {
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomTarget.set(target);
    this._isSpectator.set(isSpectator);
    this.focusedPlayerId.set('');
    this._pkPrevStatus = '';
    this._pkStatSubmitted = false;
    this.lastStatResult.set(null);
    if (mode !== GameMode.Single) {
      const explicitAction = action || (isSpectator ? 'spectate' : '');
      this.ws.connect(this.gameId, roomId, this.playerId(), mode as string, difficulty as string, hostId, explicitAction, password, target, bounty, isSpectator);
    }
  }

  leaveRoom() {
    this.resetLocalGameState();
    if (this.enableSinglePlayerSave && this.currentRoomMode() === GameMode.Single && this.isFinished()) {
      this.clearSinglePlayerSave();
    }

    // 防御跨游戏切换：如果当前正在跨游戏跟随房间切换（crossGameJoin 已经置入该房间号的 pendingJoin），
    // 此时玩家并未真正离开房间，绝不可向后端发送 LeaveRoom，亦不可提前断开连接或清空房间号！
    const pending = this.crossGameJoin.pendingJoin();
    const currentRoom = this.roomId() || this.ws.currentRoomId();
    if (pending && currentRoom && pending.roomId === currentRoom) {
      return;
    }

    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({ action: C2SAction.LeaveRoom });
    }
    // Give it a tiny delay to ensure the message is sent before the connection closes
    setTimeout(() => {
      this.ws.disconnect(this.gameId);
    }, 100);
    this.roomId.set('');
    this._isSpectator.set(false);
    this.focusedPlayerId.set('');
    this.currentRoomMode.set(GameMode.Single);
  }

  startGame() {
    this.resetLocalGameState();
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerStart();
    } else {
      this.ws.send({ action: C2SAction.StartGame });
    }
  }

  restartGame() {
    this.resetLocalGameState();
    if (this.enableSinglePlayerSave && this.currentRoomMode() === GameMode.Single) {
      this.clearSinglePlayerSave();
    }
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerRestart();
      return;
    }
    this.ws.send({
      action: C2SAction.RestartGame
    });
  }

  changeRoomGame(targetGameId: string, difficulty?: string, mode?: string) {
    if (this.currentRoomMode() === GameMode.Single) return;
    
    const targetConfig = this.gameRegistry.getConfig(targetGameId);
    let targetMode = mode || (this.currentRoomMode() as string);
    let targetDiff = difficulty || (this.currentDifficulty() as string);
    
    if (targetConfig) {
      if (targetConfig.modes && targetConfig.modes.length > 0 && !targetConfig.modes.some(m => m.id === targetMode)) {
        const mpMode = targetConfig.modes.find(m => m.id !== GameMode.Single);
        targetMode = mpMode ? mpMode.id : targetConfig.modes[0].id;
      }
      if (targetConfig.difficulties && targetConfig.difficulties.length > 0 && !targetConfig.difficulties.some(d => d.id === targetDiff)) {
        targetDiff = targetConfig.difficulties[0].id;
      }
    }

    this.ws.send({
      action: C2SAction.ChangeGame,
      game: targetGameId,
      mode: targetMode,
      difficulty: targetDiff
    });
  }

  /**
   * 统一本地状态清理契约 (Anti-Ghost State Hook)
   * 供各游戏 Store 子类 override。在以下生命周期自动执行：
   * 1. 房间进入 Waiting / Starting 状态（新回合/倒计时）；
   * 2. 调用 startGame() / restartGame()；
   * 3. 离开房间 leaveRoom()。
   * 彻底杜绝跨局幽灵状态（如乐观插旗、选中项、临时动画触发器等）残留。
   */
  resetLocalGameState(): void {
    this.onResetLocalGameState();
  }

  protected onResetLocalGameState(): void {}

  // 子类实现单机游戏的开始和重置逻辑
  protected onSinglePlayerStart() {}
  protected onSinglePlayerRestart() {}

  dismissRoom() {
    this.ws.send({ action: C2SAction.DismissRoom });
    this.leaveRoom();
  }

  ready() {
    this.ws.send({ action: C2SAction.Ready });
  }

  cancelReady() {
    this.ws.send({ action: C2SAction.CancelReady });
  }

  kickPlayer(playerId: string) {
    this.ws.send({ action: C2SAction.KickPlayer, target: playerId });
  }

  // ── 统计辅助方法 ──────────────────────────────────────────────────────────

  /** 获取本游戏的个人最佳统计（使用子类 gameId）。 */
  protected getStats() {
    return this.stats.getStats(this.gameId);
  }

  /**
   * 提交单机模式统计并结算，自动填入 gameId / mode / difficulty。
   * 子类只需传入游戏特有的 score / time / won。
   */
  submitSingleStat(payload: { score?: number; time?: number; won?: boolean } = {}): Observable<SubmitStatResponse> {
    this.lastStatResult.set(null);
    const won = payload.won ?? true;

    // Report game completion to 全服动态
    this.liveActivity.reportGameResult(
      this.gameId,
      won,
      GameMode.Single,
      this.currentDifficulty() as string,
      payload.score,
      payload.time
    );

    return this.stats.submitStat(this.gameId, {
      mode: GameMode.Single,
      difficulty: this.currentDifficulty() as string,
      score: payload.score ?? 0,
      time:  payload.time  ?? 0,
      won,
    }).pipe(
      tap(res => {
        this.lastStatResult.set(res);
        if (res.brain_coins !== undefined) {
          this.coinService.setCoins(res.brain_coins);
        }
        if (res.new_achievements?.length) {
          this.achievementService.handleNewAchievements(res.new_achievements);
        }
      })
    );
  }

  /**
   * 标准化结束本地单机游戏：自动提交单机成绩、更新成就和代币。
   */
  finishLocalGame(payload: { score?: number; time?: number; won?: boolean } = {}): void {
    this.submitSingleStat(payload).subscribe();
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
    const bounty = this.bountyCoins();

    // Report PK game outcome to 全服动态
    this.liveActivity.reportGameResult(
      this.gameId,
      won,
      this.currentRoomMode() as string,
      this.currentDifficulty() as string,
      score,
      time
    );

    this.stats.submitStat(this.gameId, {
      mode:         this.currentRoomMode() as string,
      difficulty:   this.currentDifficulty() as string,
      score,
      time,
      won,
      bounty_coins: bounty > 0 ? bounty : undefined,
    }).subscribe({
      next: res => {
        this.lastStatResult.set(res);
        if (res.brain_coins !== undefined) {
          this.coinService.setCoins(res.brain_coins);
        }
        if (res.new_achievements?.length) {
          this.achievementService.handleNewAchievements(res.new_achievements);
        }
      },
      error: () => {}
    });
  }

  // ── 单机断点续玩与终局清理统一生命周期 ──────────────────────────────────────────
  /**
   * 是否开启单机断点续玩保存（子类声明为 true 即可接入统一引擎）。
   * 默认为 false，子类按需开启。
   */
  protected enableSinglePlayerSave = false;

  /**
   * 获取单机存档的 localStorage 键名。
   * 默认规则: `${this.gameId}_single_save`
   */
  protected getSinglePlayerSaveKey(): string {
    return `${this.gameId}_single_save`;
  }

  /**
   * 获取当前单机盘面待序列化的数据对象。
   * 子类若开启 enableSinglePlayerSave，需 override 此方法返回当前盘面状态。
   * 返回 null 时将不执行保存。
   */
  protected getSinglePlayerSaveData(): any {
    return null;
  }

  /**
   * 恢复单机盘面数据。
   * 子类若开启 enableSinglePlayerSave，需 override 此方法恢复盘面状态。
   * @param data 反序列化后的存档数据
   * @returns boolean 是否恢复成功（返回 false 表示存档损坏或无需恢复，将自动清理并开启新局）
   */
  protected restoreSinglePlayerSaveData(data: any): boolean {
    return false;
  }

  /**
   * 主动执行单机进度保存。
   * 包含自动防卫：若当前游戏已处于 Finished/GameOver 状态，严禁写入，改为清除存档。
   */
  public saveSinglePlayerProgress(): void {
    if (!this.enableSinglePlayerSave || this.currentRoomMode() !== GameMode.Single) {
      return;
    }
    if (this.isFinished()) {
      this.clearSinglePlayerSave();
      return;
    }
    const data = this.getSinglePlayerSaveData();
    if (!data) return;
    try {
      storageSet(this.getSinglePlayerSaveKey(), JSON.stringify(data));
    } catch (e) {
      console.warn(`[BaseGameStore] Failed to save single player progress for ${this.gameId}`, e);
    }
  }

  /**
   * 主动加载单机进度。
   * 若存档不存在、损坏或属于已死亡/已完成局，自动清理并返回 false。
   */
  public loadSinglePlayerProgress(): boolean {
    if (!this.enableSinglePlayerSave || this.currentRoomMode() !== GameMode.Single) {
      return false;
    }
    const key = this.getSinglePlayerSaveKey();
    const raw = storageGet(key);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      // 通用安全守卫：如果存档被标记为已结束/已死亡，自动抹除并拒绝加载
      if (data?.gameOver || data?.isDead || data?.finished || data?.status === GameStatus.Finished) {
        this.clearSinglePlayerSave();
        return false;
      }
      const success = this.restoreSinglePlayerSaveData(data);
      if (!success) {
        this.clearSinglePlayerSave();
        return false;
      }
      return true;
    } catch (e) {
      console.warn(`[BaseGameStore] Corrupted single player save for ${this.gameId}, clearing`, e);
      this.clearSinglePlayerSave();
      return false;
    }
  }

  /**
   * 物理清除本游戏的单机存档。
   */
  public clearSinglePlayerSave(): void {
    storageRemove(this.getSinglePlayerSaveKey());
  }
}
