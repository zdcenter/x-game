import { Directive, inject, signal, computed, effect, Injector, OnInit, OnDestroy, HostBinding, ViewChild, HostListener } from '@angular/core';
import confetti from 'canvas-confetti';
import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { C2SAction } from '../models/websocket.model';
import { ActivatedRoute, Router } from '@angular/router';
import { GameTimerService } from '../services/game-timer.service';
import { WebSocketService } from '../services/websocket.service';
import { GameService } from '../services/game.service';
import { SettingsService } from '../services/settings.service';
import { isBrowser } from './browser.util';
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
import { AdService } from '../services/ad.service';

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
  public adService = inject(AdService);
  readonly isHandheld = this.deviceService.isHandheld;
  protected _injector = inject(Injector);

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
      }
    }

    // Deep link check for PK invites (browser-only: uses setTimeout + router navigate)
    if (isBrowser()) {
      if (gameId) {
        effect(() => {
          const currentPending = this.crossGameJoin.pendingJoin();
          if (currentPending && currentPending.game === gameId) {
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
      }
    }
  }

  /**
   * Cleanup on destroy. Subclasses that override ngOnDestroy MUST call super.ngOnDestroy().
   */
  ngOnDestroy(): void {
    // Lobby WS stays connected across game switches — no disconnect here.
    // Game-specific cleanup should be handled in the subclass.
  }

  openPkDrawer() {
    if (this.gameLayout) {
      this.gameLayout.togglePkDrawer(true);
    } else {
      this.navigateToPkArena();
    }
  }

  navigateToPkArena() {
    // 棋盘局内直接唤醒 PK Drawer，无缝开房/迎战，不脱离当前棋盘舞台
    if (this.gameLayout && this.store.currentRoomMode() === GameMode.Single) {
      this.gameLayout.togglePkDrawer(true);
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
      const storeAny = this.store as any;
      const compAny = this as any;
      if (typeof compAny.undo === 'function') {
        this.vibrateLight();
        compAny.undo();
        event.preventDefault();
        return;
      } else if (typeof storeAny?.undo === 'function') {
        const canUndo = typeof storeAny.canUndo === 'function' ? storeAny.canUndo() : true;
        if (canUndo) {
          this.vibrateLight();
          storeAny.undo();
          event.preventDefault();
          return;
        }
      }
    }

    // H: Hint
    if ((event.key === 'h' || event.key === 'H') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const compAny = this as any;
      if (typeof compAny.applyHint === 'function') {
        this.vibrateLight();
        compAny.applyHint();
        event.preventDefault();
        return;
      } else if (typeof compAny.useHint === 'function') {
        this.vibrateLight();
        compAny.useHint();
        event.preventDefault();
        return;
      }
    }
  }

  /**
   * Subclasses can override this hook to handle custom keyboard shortcuts.
   * Return true to consume the event and prevent BaseGameComponent shortcuts.
   */
  protected onKeyDown(event: KeyboardEvent): boolean {
    return false;
  }
}
