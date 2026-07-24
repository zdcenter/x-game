import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { Directive, inject, signal, effect, Injector, OnInit, OnDestroy, HostBinding, ViewChild } from '@angular/core';
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

/**
 * A base component that provides boilerplate functionality for any PK-enabled game.
 * Components extending this should provide their own specific `store` and `playerId`.
 *
 * Auto-connects the lobby WebSocket on init so rooms/players are always visible.
 * Subclasses MUST call super.ngOnInit() and super.ngOnDestroy() if they override those hooks.
 */
@Directive()
export abstract class BaseGameComponent implements OnInit, OnDestroy {
  protected gameTimer = inject(GameTimerService);
  protected wsService = inject(WebSocketService);
  protected gameService = inject(GameService);
  public settingsService = inject(SettingsService);
  private _baseRoute = inject(ActivatedRoute);
  protected _baseRouter = inject(Router);
  protected crossGameJoin = inject(CrossGameJoinService);
  protected baseToastService = inject(ToastService);
  protected i18nBase = inject(I18nService);
  private _injector = inject(Injector);

  isMobileSidebarOpen = signal<boolean>(false);
  
  @ViewChild(GameLayoutComponent) gameLayout?: GameLayoutComponent;

  @HostBinding('class') get hostClass() {
    return 'flex-1 flex flex-col w-full overflow-hidden min-h-0';
  }

  // Each subclass must implement these to hook into the base room logic
  abstract get store(): GameStoreInterface;
  abstract get playerId(): string;

  /**
   * Auto-connect lobby WebSocket so the game-lobby-panel receives
   * room/player updates. Subclasses that override ngOnInit MUST call super.ngOnInit().
   */
  ngOnInit(): void {
    this.wsService.connectLobby(this.playerId, this.playerId);

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
    }

    // Deep link check for PK invites (browser-only: uses setTimeout + router navigate)
    if (isBrowser()) {
      if (gameId) {
        const pendingCross = this.crossGameJoin.consumePendingJoin(gameId);
        if (pendingCross) {
          setTimeout(() => {
            if (pendingCross.action === 'create') {
              this.handleCreateRoom({
                name: pendingCross.roomId || '',
                mode: pendingCross.mode,
                difficulty: pendingCross.difficulty,
                password: pendingCross.password,
                target: pendingCross.target
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
                password: pendingCross.password
              });
            }
          }, 100);
        }
      }

      const q = this._baseRoute.snapshot.queryParams;
      if (q['joinRoom'] && q['mode'] && q['diff'] && q['mode'] !== GameMode.Single) {
        setTimeout(() => {
          this.handleJoinRoom({
            roomId: q['joinRoom'],
            mode: q['mode'],
            difficulty: q['diff'],
            host: q['host'] || ''
          });

          this._baseRouter.navigate([], {
            relativeTo: this._baseRoute,
            queryParams: { joinRoom: null, mode: null, diff: null, host: null },
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

  navigateToPkArena() {
    this.store.leaveRoom();
    let gameId = '';
    const urlPath = this._baseRouter.url.split('?')[0];
    const segments = urlPath.split('/');
    const gamesIdx = segments.indexOf('games');
    if (gamesIdx >= 0) gameId = segments[gamesIdx + 1];
    
    this._baseRouter.navigate(['/pk-arena'], { queryParams: gameId ? { game: gameId } : {} });
  }

  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}) {
    if (this.store.roomId() === event.roomId) return;
    this.wsService.setPendingAction('join');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    this.isMobileSidebarOpen.set(false);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string, target?: number}) {
    this.wsService.setPendingAction('create');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId, event.target ?? 1);
    this.isMobileSidebarOpen.set(false);
  }

  handleDismissRoom() {
    this.wsService.send({ type: 'dismiss_room' });
    this.store.leaveRoom();
  }

  goBack() {
    if (this.store.roomId()) {
      if (this.store.hostId() === this.playerId) {
        this.dismissRoom();
        return;
      } else {
        this.store.leaveRoom();
      }
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
    if (this.store.status() === GameStatus.Waiting || this.store.status() === GameStatus.Finished) {
      this.doRestart();
    } else {
      this.baseToastService.confirm({
        title: this.i18nBase.t('game.restart')() || 'Restart',
        message: this.i18nBase.t('game.confirm_restart')() || 'Are you sure you want to restart?',
        confirmText: this.i18nBase.t('game.restart')() || 'Restart',
        cancelText: this.i18nBase.t('game.cancel')() || 'Cancel',
        onConfirm: () => {
          this.doRestart();
        }
      });
    }
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

  dismissRoom() {
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
    // Preserve lang prefix: URL is /zh/... or /en/...
    const lang = this._baseRouter.url.split('/')[1] || 'zh';
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
}
