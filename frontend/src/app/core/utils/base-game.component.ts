import { Directive, inject, signal, computed, effect, Injector, OnInit, OnDestroy, HostBinding, ViewChild, HostListener } from '@angular/core';
import confetti from 'canvas-confetti';
import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { C2SAction } from '../models/websocket.model';
import { ActivatedRoute, Router } from '@angular/router';
import { GameTimerService } from '../services/game-timer.service';
import { WebSocketService } from '../services/websocket.service';
import { GameService } from '../services/game.service';
import { SettingsService } from '../services/settings.service';
import { isBrowser, addRecentGame } from './browser.util';
import { GameStoreInterface } from '../interfaces/game-store.interface';
import { GameLobbyPanelComponent } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameLayoutComponent } from '../../shared/components/game-layout/game-layout.component';
import { CrossGameJoinService } from '../services/cross-game-join.service';
import { ToastService } from '../services/toast.service';
import { I18nService } from '../i18n/i18n.service';
import { LiveActivityService } from '../services/live-activity.service';
import { WindowSizeService } from '../services/window-size.service';
import { AuthStore } from '../auth/auth.store';
import { AudioService } from '../services/audio.service';
import { HapticService } from '../services/haptic.service';
import { GameRegistryService } from '../services/game-registry.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { DeviceService } from '../services/device.service';
import { ZenModeService } from '../services/zen-mode.service';
import { JuiceService } from '../services/juice.service';
import { AdService } from '../services/ad.service';
import { ResumeGameService, SavedGameSession } from '../services/resume-game.service';
import { WakeLockService } from '../services/wake-lock.service';

/**
 * A base component that provides boilerplate functionality for any PK-enabled game.
 * Components extending this should provide their own specific `store` and `playerId`.
 *
 * Auto-connects the lobby WebSocket on init so rooms/players are always visible.
 * Subclasses MUST call super.ngOnInit() and super.ngOnDestroy() if they override those hooks.
 */
@Directive()
export abstract class BaseGameComponent implements OnInit, OnDestroy {
  // Core Services
  public gameTimer = inject(GameTimerService);
  public timerService = this.gameTimer;
  public wsService = inject(WebSocketService);
  public gameService = inject(GameService);
  public settingsService = inject(SettingsService);
  protected _baseRoute = inject(ActivatedRoute);
  public router = inject(Router);
  protected _baseRouter = this.router;
  public crossGameJoin = inject(CrossGameJoinService);
  public toast = inject(ToastService);
  public toastService = this.toast;
  protected baseToastService = this.toast;
  public i18n = inject(I18nService);
  protected i18nBase = this.i18n;
  public liveActivityService = inject(LiveActivityService);
  public windowSizeService = inject(WindowSizeService);
  public authStore = inject(AuthStore);
  public audio = inject(AudioService);
  public audioService = this.audio;
  public haptic = inject(HapticService);
  public gameRegistry = inject(GameRegistryService);
  public leaderboardService = inject(LeaderboardService);
  public deviceService = inject(DeviceService);
  public zenService = inject(ZenModeService);
  public adService = inject(AdService);
  public resumeService = inject(ResumeGameService);
  public wakeLock = inject(WakeLockService);
  public juice = inject(JuiceService);
  readonly isHandheld = this.deviceService.isHandheld;
  protected _injector = inject(Injector);

  // Resume In-Progress Game Session
  pendingResumeSession = signal<SavedGameSession | null>(null);
  protected _isMounted = false;

  // Common Enums & Math for Templates
  readonly GameDifficulty = GameDifficulty;
  readonly GameStatus = GameStatus;
  readonly GameMode = GameMode;
  readonly Math = Math;
  readonly math = Math;

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  // Common UI State Signals
  showRules = signal<boolean>(false);
  showOverlay = signal<boolean>(false);
  isMobileSidebarOpen = signal<boolean>(false);
  
  @ViewChild(GameLayoutComponent) gameLayout?: GameLayoutComponent;

  @HostBinding('class') get hostClass() {
    return 'flex-1 flex flex-col w-full overflow-hidden min-h-0';
  }

  // Subclasses provide their specific game store
  abstract get store(): GameStoreInterface;

  /** Universal spectator mode status derived from store */
  readonly isSpectator = computed<boolean>(() => this.store?.isSpectator?.() ?? false);

  // Default playerId derived from authStore; subclasses can still override if custom
  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId || 'Guest';
  }

  // Common Haptic Feedback Helpers
  vibrateLight() { this.haptic.vibrateLight(); }
  vibrateMedium() { this.haptic.vibrateMedium(); }
  vibrateHeavy() { this.haptic.vibrateHeavy(); }
  vibrateSuccess() { this.haptic.vibrateSuccess(); }
  vibrateError() { this.haptic.vibrateError(); }
  vibrateSnap() { this.haptic.vibrateSnap(); }
  vibrateSwipe() { this.haptic.vibrateSwipe(); }
  vibrateCombo() { this.haptic.vibrateCombo(); }
  vibrateImpact() { this.haptic.vibrateImpact(); }

  /**
   * Triggers physical tactile feedback and instant dual-cannon dopamine confetti burst.
   * Safe for SSR and respects prefers-reduced-motion.
   */
  celebrateVictory() {
    this.vibrateSuccess();
    this.juice.shakeScreen();
    if (!isBrowser()) return;
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7, x: 0.3 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'],
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7, x: 0.7 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'],
        disableForReducedMotion: true
      });
    } catch (_) {}
  }

  /**
   * Auto-connect lobby WebSocket so the game-lobby-panel receives
   * room/player updates. Subclasses that override ngOnInit MUST call super.ngOnInit().
   */
  ngOnInit(): void {
    this.wsService.connectLobby(this.playerId, this.playerId);
    this.windowSizeService.scheduleMultiRefresh();

    // Extract gameId from URL (e.g. /zh/games/sudoku -> sudoku)
    // URL has lang prefix: ['', 'zh', 'games', 'gameId']
    const urlPath = this._baseRouter.url.split('?')[0];
    const segments = urlPath.split('/');
    const gamesIdx = segments.indexOf('games');
    const gameId = gamesIdx >= 0 ? segments[gamesIdx + 1] : null;
    if (gameId) {
      this.gameService.visitGame(gameId).subscribe({
        error: err => console.error('Failed to update visit count', err)
      });

      if (isBrowser()) {
        addRecentGame(gameId);
        setTimeout(() => {
          if (this.store && this.store.currentRoomMode() === GameMode.Single) {
            const storeAny = this.store as any;
            const diff = typeof storeAny.currentDifficulty === 'function'
              ? storeAny.currentDifficulty()
              : (typeof storeAny.difficulty === 'function' ? storeAny.difficulty() : (storeAny.difficulty || 'medium'));
            this.liveActivityService.reportPlaying(gameId, diff);
          }
        }, 600);

        // Listen for cheers sent from lobby players
        effect(() => {
          const cheer = this.wsService.cheerReceivedEvent();
          if (cheer && cheer.gameId === gameId) {
            const cheerTpl = this.i18nBase.t('activity.cheer_toast')() || '🎉 玩家 {sender} 为你加油喝彩！';
            this.baseToastService.show(cheerTpl.replace('{sender}', cheer.senderName), 'success');
          }
        }, { injector: this._injector });

        // Automatic Screen Wake Lock: Keeps screen awake while game is actively being played
        effect(() => {
          const status = this.store?.status?.();
          if (status === GameStatus.Playing) {
            this.wakeLock.requestLock();
          } else {
            this.wakeLock.releaseLock();
          }
        }, { injector: this._injector });
      }
    }

    // Deep link check for PK invites (browser-only: uses setTimeout + router navigate)
    if (isBrowser()) {
      if (gameId) {
        effect(() => {
          const currentPending = this.crossGameJoin.pendingJoin();
          // Only process in-game dynamic invites/joins when component is already mounted.
          // Initial route entry is handled cleanly and synchronously by roomLifecycle.consumePendingOrReconnect() in ngOnInit!
          if (this._isMounted && currentPending && currentPending.game === gameId) {
            const pendingCross = this.crossGameJoin.consumePendingJoin(gameId);
            if (pendingCross) {
              setTimeout(() => {
                if (pendingCross.action === 'create') {
                  this.handleCreateRoom({
                    name: pendingCross.roomId || '',
                    mode: pendingCross.mode,
                    difficulty: pendingCross.difficulty,
                    password: pendingCross.password,
                    target: pendingCross.target,
                    bountyCoins: pendingCross.bountyCoins
                  });

                  if (pendingCross.inviteUsernames && pendingCross.inviteUsernames.length > 0) {
                    const usernames = pendingCross.inviteUsernames;
                    const eff = effect(() => {
                      const newRoomId = this.store.roomId();
                      const rawState = this.wsService.gameState();
                      if (newRoomId && this.wsService.isConnected() && rawState) {
                        usernames.forEach(username => {
                          this.wsService.sendLobbyAction('friend_invite', { targetId: username, roomId: newRoomId });
                        });
                        eff.destroy();
                      }
                    }, { injector: this._injector, manualCleanup: true });
                  }
                } else {
                  this.handleJoinRoom({
                    roomId: pendingCross.roomId,
                    mode: pendingCross.mode,
                    difficulty: pendingCross.difficulty,
                    host: pendingCross.host,
                    password: pendingCross.password,
                    bountyCoins: pendingCross.bountyCoins,
                    isSpectator: pendingCross.spectate || pendingCross.action === 'spectate'
                  });
                }
              }, 50);
            }
          }
        }, { injector: this._injector });
      }

      const q = this._baseRoute.snapshot.queryParams;
      const requestedDiff = q['difficulty'] || q['diff'];
      if (q['joinRoom'] && q['mode'] && q['diff'] && q['mode'] !== GameMode.Single) {
        setTimeout(() => {
          this.handleJoinRoom({
            roomId: q['joinRoom'],
            mode: q['mode'],
            difficulty: q['diff'],
            host: q['host'] || '',
            isSpectator: q['spectate'] === 'true' || q['action'] === 'spectate'
          });

          this._baseRouter.navigate([], {
            relativeTo: this._baseRoute,
            queryParams: { joinRoom: null, mode: null, diff: null, host: null, spectate: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }, 200);
      } else if (requestedDiff && (!q['mode'] || q['mode'] === GameMode.Single) && gameId) {
        setTimeout(() => {
          if (this.store && this.store.currentRoomMode() === GameMode.Single && !this.store.roomId()) {
            this.pendingResumeSession.set(null);
            (this.store as any).currentDifficulty?.set(requestedDiff);
            this.store.joinRoom('', GameMode.Single, requestedDiff);
            const config = this.gameRegistry.getConfig(gameId);
            const match = config?.difficulties?.find(d => d.id === requestedDiff);
            const diffName = match?.labelKey ? (this.i18n.t(match.labelKey)() || requestedDiff) : requestedDiff;
            this.toastService.show(`⚔️ 已为您切换至【${diffName}】挑战模式！`, 'info');
          }
        }, 80);
      } else if (gameId) {
        // Automatically check for unfinished single-player session ONLY IF strictly in single player mode
        setTimeout(() => {
          if (!this.crossGameJoin.pendingJoin() &&
              this.store?.currentRoomMode?.() === GameMode.Single &&
              !this.isSpectator() &&
              !this.store?.isSpectator?.() &&
              !this.store?.roomId?.()) {
            this.checkAndPromptResumeSession(gameId);
          }
        }, 100);
      }

      // Mark mounted so future pending joins while remaining on the same page can be consumed by the effect
      setTimeout(() => {
        this._isMounted = true;
      }, 0);
    }
  }

  /**
   * Cleanup on destroy. Subclasses that override ngOnDestroy MUST call super.ngOnDestroy().
   */
  ngOnDestroy(): void {
    // Release screen wake lock when navigating away
    this.wakeLock.releaseLock();
    // Lobby WS stays connected across game switches — no disconnect here.
    // Game-specific cleanup should be handled in the subclass.
  }

  openPkDrawer() {
    if (this.gameLayout) {
      this.gameLayout.quickCreatePkRoom();
    } else {
      this.navigateToPkArena();
    }
  }

  navigateToPkArena() {
    // 棋盘局内直接一键开房进入等候大厅，无缝开房/迎战，不脱离当前棋盘舞台
    if (this.gameLayout && this.store.currentRoomMode() === GameMode.Single) {
      this.gameLayout.quickCreatePkRoom();
      return;
    }
    this.store.leaveRoom();
    let gameId = '';
    const urlPath = this._baseRouter.url.split('?')[0];
    const segments = urlPath.split('/');
    const gamesIdx = segments.indexOf('games');
    if (gamesIdx >= 0) gameId = segments[gamesIdx + 1];
    const lang = this.i18n.currentLang();
    this._baseRouter.navigate(['/', lang, 'pk-arena'], { queryParams: gameId ? { game: gameId } : {} });
  }

  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string, bountyCoins?: number, isSpectator?: boolean}) {
    this.pendingResumeSession.set(null);
    this.isMobileSidebarOpen.set(false);
    if (this.gameLayout) {
      this.gameLayout.togglePkDrawer(false);
    }
    if (this.store.roomId() === event.roomId && this.isSpectator() === !!event.isSpectator) return;
    const action = event.isSpectator ? 'spectate' : 'join';
    this.wsService.setPendingAction(action);
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host, 1, event.password || '', event.bountyCoins ?? 0, event.isSpectator || false, action);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string, target?: number, bountyCoins?: number}) {
    this.pendingResumeSession.set(null);
    this.isMobileSidebarOpen.set(false);
    if (this.gameLayout) {
      this.gameLayout.togglePkDrawer(false);
    }
    this.wsService.setPendingAction('create');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId, event.target ?? 1, event.password || '', event.bountyCoins ?? 0, false, 'create');
  }

  handleDismissRoom() {
    if (this.store.currentRoomMode() === GameMode.Single) return;
    this.wsService.send({ action: C2SAction.DismissRoom });
    this.store.leaveRoom();
  }

  goBack() {
    // 准则5：单机游戏纯客户端运行，绝不执行联机房间解散逻辑或提示
    if (this.store.currentRoomMode() !== GameMode.Single && this.store.roomId()) {
      if (this.store.status() === GameStatus.Playing && !this.store.isSpectator?.()) {
        const title = this.i18nBase.t('game.pk_leaving_title')() || '正在激烈对决中';
        const msg = this.i18nBase.t('game.pk_leaving_msg')() || '对决仍在进行中！您可选择【暂回大厅】，系统将保留 30 秒席位，30秒内可随时一键返回对决；若选择【认输退出】将直接判定对方获胜。';
        this.baseToastService.confirm({
          title,
          message: msg,
          confirmText: this.i18nBase.t('game.pk_temporary_leave')() || '暂回大厅 (保留席位)',
          cancelText: this.i18nBase.t('game.pk_forfeit_leave')() || '认输退出',
          confirmStyle: 'primary',
          onConfirm: () => {
            this.store.leaveRoom(false);
            this.navigateToLobby();
          },
          onCancel: () => {
            if (this.store.forfeitMatch) {
              this.store.forfeitMatch();
            } else {
              this.store.leaveRoom(true);
            }
            this.navigateToLobby();
          }
        });
        return;
      }

      if (this.store.hostId() === this.playerId) {
        if (this.store.status() === GameStatus.Finished) {
          this.store.dismissRoom();
        } else {
          this.dismissRoom();
          return;
        }
      } else {
        this.store.leaveRoom();
      }
    } else {
      // 单机模式离开：仅触发单机本地状态/存档清理，绝不调用 WebSocket 解散房间或弹出房间解散 Toast
      this.store.leaveRoom();
    }
    this.navigateToLobby();
  }

  handleTitleClick() {
    if (this.store.currentRoomMode() !== GameMode.Single) {
      return; // Do not allow arbitrary restart during PK
    }

    // For games with a level lobby (e.g. Hashi, Sudoku, Nonogram)
    if ('view' in this && typeof (this as any).view === 'function') {
      const v = (this as any).view();
      if (v === 'play') {
        this.goBack();
      }
      return;
    }

    // For single-session games without a lobby (e.g. Sliding, Minesweeper, 2048)
    // Instant frictionless restart — no annoying confirmation dialog to break flow!
    this.doRestart();
  }

  private doRestart() {
    if (typeof (this.store as any).restartGame === 'function') {
      (this.store as any).restartGame();
    } else if (typeof (this.store as any).playAgain === 'function') {
      (this.store as any).playAgain();
    } else if (typeof (this.store as any).startGame === 'function') {
      (this.store as any).startGame();
    }
  }

  handleRestart() {
    this.doRestart();
  }

  handleRematch() {
    this.doRestart();
  }

  dismissRoom() {
    // 严格防御：单机模式或无联机房间绝不执行解散，绝不弹出“房间已成功解散”提示！
    if (this.store.currentRoomMode() === GameMode.Single || !this.store.roomId()) {
      this.navigateToLobby();
      return;
    }

    // If game is finished or only host is in the room (or empty), dismiss immediately without confirmation!
    const storeAny = this.store as any;
    const players = typeof storeAny.roomPlayers === 'function' ? storeAny.roomPlayers() :
                    (typeof storeAny.players === 'function' ? storeAny.players() :
                    (typeof storeAny.playersList === 'function' ? storeAny.playersList() : []));
    if (this.store.status() === GameStatus.Finished || !players || players.length <= 1) {
      this.store.dismissRoom();
      this.baseToastService.show(this.i18nBase.t('game.dismiss_success')(), 'success');
      this.navigateToLobby();
      return;
    }

    this.baseToastService.confirm({
      title: this.i18nBase.t('game.dismiss_title')(),
      message: this.i18nBase.t('game.dismiss_msg')(),
      confirmText: this.i18nBase.t('game.dismiss_confirm')(),
      cancelText: this.i18nBase.t('game.cancel')(),
      onConfirm: () => {
        this.store.dismissRoom();
        this.baseToastService.show(this.i18nBase.t('game.dismiss_success')(), 'success');
        this.navigateToLobby();
      }
    });
  }

  protected navigateToLobby(): void {
    // Preserve lang prefix: robustly fallback to i18n service or URL inspection
    const lang = this.i18nBase?.currentLang?.() || (this._baseRouter.url.startsWith('/en') ? 'en' : 'zh');
    this._baseRouter.navigate(['/', lang, 'lobby']);
  }

  openChangeSettings() {
    if (this.gameLayout && this.store.roomId()) {
      const s = this.store as any;
      this.gameLayout.openUpdateRoomModal({
        id: this.store.roomId(),
        game: this.store.gameId,
        mode: this.store.currentRoomMode(),
        difficulty: s.currentDifficulty?.() ?? '',
        target: this.store.currentRoomTarget(),
      });
    } else {
      // Fallback for older layout if any
      const panel = (this as any).lobbyPanel as GameLobbyPanelComponent | undefined;
      if (panel && this.store.roomId()) {
        const s = this.store as any;
        panel.openUpdateRoomModal({
          id: this.store.roomId(),
          game: this.store.gameId,
          mode: this.store.currentRoomMode(),
          difficulty: s.currentDifficulty?.() ?? '',
          target: this.store.currentRoomTarget(),
        });
      }
    }
  }

  /**
   * Centralized desktop keyboard fluency handler:
   * - Esc: Close rules modal or mobile sidebar
   * - R: Quick restart in single-player or rematch in PK
   * - Z / U: Undo previous move (if game supports undo)
   * - H: Trigger hint (if game supports hint)
   */
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
      return;
    }

    // Allow child component hook to intercept or handle first
    if (this.onKeyDown(event)) {
      return;
    }

    // Esc: close rules modal or close mobile sidebar
    if (event.key === 'Escape') {
      if (this.showRules()) {
        this.showRules.set(false);
        this.vibrateLight();
        event.preventDefault();
        return;
      }
      if (this.isMobileSidebarOpen()) {
        this.isMobileSidebarOpen.set(false);
        event.preventDefault();
        return;
      }
    }

    // M: Toggle audio mute
    if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.audio.toggleMute();
      const isMuted = this.audio.isMuted();
      const toastMsg = isMuted
        ? (this.i18n.t('game.muted_toast')() || '🔇 音效已静音 (按 M 取消)')
        : (this.i18n.t('game.unmuted_toast')() || '🔊 音效已开启 (按 M 静音)');
      this.toast.info(toastMsg);
      event.preventDefault();
      return;
    }

    // R: Restart game
    if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (this.store && this.store.currentRoomMode() === GameMode.Single) {
        this.vibrateLight();
        this.handleTitleClick();
        event.preventDefault();
        return;
      }
    }

    // Ctrl+Z or U: Undo
    const isUndo = ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) ||
                   ((event.key === 'u' || event.key === 'U') && !event.ctrlKey && !event.metaKey);
    if (isUndo) {
      if (this.triggerUndo()) {
        event.preventDefault();
        return;
      }
    }

    // H: Hint
    if ((event.key === 'h' || event.key === 'H') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const compAny = this as any;
      const storeAny = this.store as any;
      if (typeof compAny.applyHint === 'function') {
        this.vibrateLight();
        if (typeof storeAny?.recordHintUsed === 'function') {
          storeAny.recordHintUsed();
        }
        compAny.applyHint();
        event.preventDefault();
        return;
      } else if (typeof compAny.useHint === 'function') {
        this.vibrateLight();
        if (typeof storeAny?.recordHintUsed === 'function') {
          storeAny.recordHintUsed();
        }
        compAny.useHint();
        event.preventDefault();
        return;
      }
    }
  }

  /**
   * 触发通用撤销动作（支持快捷键、按钮与双指轻点手势）
   */
  public triggerUndo(): boolean {
    const storeAny = this.store as any;
    const compAny = this as any;
    if (typeof compAny.undo === 'function') {
      this.vibrateLight();
      compAny.undo();
      return true;
    } else if (typeof storeAny?.undo === 'function') {
      const canUndo = typeof storeAny.canUndo === 'function' ? storeAny.canUndo() : true;
      if (canUndo) {
        this.vibrateLight();
        storeAny.undo();
        return true;
      }
    } else if (typeof compAny.handleUseUndo === 'function') {
      this.vibrateLight();
      compAny.handleUseUndo();
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🎨 双指轻点撤销手势 (Two-Finger Tap Undo)
  // 参考 Procreate / iPad 顶级创作工具：双指在屏幕轻点（30~280ms），自动触发撤销
  // ═══════════════════════════════════════════════════════════════════
  private twoFingerTouchStartTime = 0;
  private twoFingerStartPositions: { x: number; y: number }[] = [];
  private isTwoFingerGestureActive = false;

  @HostListener('touchstart', ['$event'])
  onBaseTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.isTwoFingerGestureActive = true;
      this.twoFingerTouchStartTime = Date.now();
      this.twoFingerStartPositions = [
        { x: event.touches[0].clientX, y: event.touches[0].clientY },
        { x: event.touches[1].clientX, y: event.touches[1].clientY }
      ];
    } else if (event.touches.length > 2) {
      this.isTwoFingerGestureActive = false;
    }
  }

  @HostListener('touchend', ['$event'])
  onBaseTouchEnd(event: TouchEvent) {
    if (!this.isTwoFingerGestureActive) return;

    const duration = Date.now() - this.twoFingerTouchStartTime;
    // 轻点判定：双指接触时长在 30ms ~ 280ms 之间（排除长按或双指缩放/滚动）
    if (duration >= 30 && duration <= 280 && this.twoFingerStartPositions.length === 2) {
      const changedTouches = Array.from(event.changedTouches);
      let maxDisplacement = 0;
      for (const touch of changedTouches) {
        for (const startPos of this.twoFingerStartPositions) {
          const dist = Math.hypot(touch.clientX - startPos.x, touch.clientY - startPos.y);
          maxDisplacement = Math.max(maxDisplacement, dist);
        }
      }

      // 如果双指移动距离小于 24px（说明是原地轻敲，没有发生捏合缩放或拖拽平移）
      if (maxDisplacement < 24) {
        const handled = this.triggerUndo();
        if (handled) {
          if (event.cancelable) event.preventDefault();
          this.haptic.vibrateSnap();
          const toastText = this.i18n.t('game.undo_toast')() || '↶ 已撤销';
          this.toast.info(toastText);
        }
      }
    }

    this.isTwoFingerGestureActive = false;
    this.twoFingerStartPositions = [];
  }

  @HostListener('touchcancel')
  onBaseTouchCancel() {
    this.isTwoFingerGestureActive = false;
    this.twoFingerStartPositions = [];
  }

  /**
   * Subclasses can override this hook to handle custom keyboard shortcuts.
   * Return true to consume the event and prevent BaseGameComponent shortcuts.
   */
  protected onKeyDown(event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * Helper to extract the current game ID from store or active route URL
   */
  get currentGameId(): string {
    if (this.store?.gameId) return this.store.gameId;
    const urlPath = this._baseRouter.url.split('?')[0];
    const segments = urlPath.split('/');
    const gamesIdx = segments.indexOf('games');
    return gamesIdx >= 0 ? segments[gamesIdx + 1] : '';
  }

  /**
   * Checks whether there is an unfinished single player session for this game.
   * Strictly isolated: NEVER triggers or prompts if the user is spectating, in a multiplayer room,
   * or has a pending cross-game join action.
   */
  checkAndPromptResumeSession(gameId?: string): boolean {
    if (this.isSpectator() || (this.store as any)?.isSpectator?.()) {
      this.pendingResumeSession.set(null);
      return false;
    }
    if (this.store?.currentRoomMode?.() !== GameMode.Single) {
      this.pendingResumeSession.set(null);
      return false;
    }
    if (this.store?.roomId?.()) {
      this.pendingResumeSession.set(null);
      return false;
    }
    const pendingJoin = this.crossGameJoin.pendingJoin();
    if (pendingJoin && (pendingJoin.action === 'spectate' || pendingJoin.spectate || pendingJoin.mode !== GameMode.Single || pendingJoin.roomId)) {
      this.pendingResumeSession.set(null);
      return false;
    }
    const pendingAction = this.wsService.pendingAction;
    if (pendingAction === 'spectate' || pendingAction === 'join' || pendingAction === 'create' || this.wsService.isCurrentSpectator()) {
      this.pendingResumeSession.set(null);
      return false;
    }

    const targetGameId = gameId || this.currentGameId;
    if (!targetGameId) return false;
    const session = this.resumeService.loadSession(targetGameId);
    if (session) {
      this.pendingResumeSession.set(session);
      return true;
    }
    this.pendingResumeSession.set(null);
    return false;
  }

  clearResumeSession(gameId?: string): void {
    const targetGameId = gameId || this.currentGameId;
    if (targetGameId) {
      this.resumeService.clearSession(targetGameId);
    }
    this.pendingResumeSession.set(null);
  }

  /**
   * Subclass hook to handle game-specific restoration logic (e.g. board data, timers).
   * Default implementation checks common store restore methods.
   */
  protected restoreGameSession(data: any, session: SavedGameSession): void {
    if (this.isSpectator() || (this.store as any)?.isSpectator?.()) return;
    if (this.store?.currentRoomMode?.() !== GameMode.Single) return;
    if (typeof (this.store as any).restoreSavedSession === 'function') {
      (this.store as any).restoreSavedSession(data);
    } else if (typeof (this.store as any).loadSinglePlayerProgress === 'function') {
      (this.store as any).loadSinglePlayerProgress();
    } else if (typeof (this.store as any).loadSinglePlayer === 'function') {
      (this.store as any).loadSinglePlayer();
    } else if (typeof (this.store as any).restoreSavedGame === 'function') {
      (this.store as any).restoreSavedGame(data);
    }
  }

  /**
   * Subclass hook to handle game-specific reset logic on discard.
   * Default implementation checks common store restart/start methods.
   */
  protected resetGameSession(): void {
    if (typeof (this.store as any).startNewSingleGame === 'function') {
      const s = this.store as any;
      const curDiff = typeof s.currentDifficulty === 'function' ? s.currentDifficulty() : 'easy';
      s.startNewSingleGame(curDiff);
    } else if (typeof (this.store as any).startLocalGame === 'function') {
      (this.store as any).startLocalGame();
    } else if (typeof (this.store as any).restartGame === 'function') {
      (this.store as any).restartGame();
    } else if (typeof (this.store as any).startGame === 'function') {
      (this.store as any).startGame();
    }
  }

  /**
   * Unified session restoration handler.
   * Can be directly bound in templates: (resumeGame)="onResumeSession($event)"
   */
  onResumeSession(session: any): void {
    if (this.isSpectator() || (this.store as any)?.isSpectator?.() || this.store?.currentRoomMode?.() !== GameMode.Single) {
      this.pendingResumeSession.set(null);
      return;
    }
    if (!session?.data) {
      this.pendingResumeSession.set(null);
      return;
    }

    this.restoreGameSession(session.data, session);

    // If game has a lobby/play view switcher, ensure view is switched to play
    if ('view' in this && typeof (this as any).view === 'object' && typeof (this as any).view.set === 'function') {
      (this as any).view.set('play');
    } else if ('showLobby' in this && typeof (this as any).showLobby === 'object' && typeof (this as any).showLobby.set === 'function') {
      (this as any).showLobby.set(false);
    }

    this.pendingResumeSession.set(null);
  }

  /**
   * Unified session discard and reset handler.
   * Can be directly bound in templates: (discardResume)="onDiscardResume()"
   */
  onDiscardResume(): void {
    const gameId = this.currentGameId;
    if (gameId) {
      this.clearResumeSession(gameId);
      // Clean up legacy localStorage keys to prevent duplicate/desync state
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${gameId}_saved_game`);
        localStorage.removeItem(`${gameId}_single_save`);
      }
    }

    // Clear single player save in store if available
    if (typeof (this.store as any).clearSinglePlayerSave === 'function') {
      (this.store as any).clearSinglePlayerSave();
    }

    this.resetGameSession();
  }

  // Backwards-compatible aliases for templates
  handleResumeGame(session: any): void {
    this.onResumeSession(session);
  }

  handleDiscardResume(): void {
    this.onDiscardResume();
  }
}
