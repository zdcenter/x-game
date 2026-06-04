import { Directive, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameTimerService } from '../services/game-timer.service';
import { WebSocketService } from '../services/websocket.service';

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
  private _baseRoute = inject(ActivatedRoute);
  private _baseRouter = inject(Router);
  
  isMobileSidebarOpen = signal<boolean>(false);

  // Each subclass must implement these to hook into the base room logic
  abstract get store(): any; 
  abstract get playerId(): string;

  /**
   * Auto-connect lobby WebSocket so the game-lobby-panel receives
   * room/player updates. Subclasses that override ngOnInit MUST call super.ngOnInit().
   */
  ngOnInit(): void {
    this.wsService.connectLobby(this.playerId, this.playerId);

    // Deep link check for PK invites
    const q = this._baseRoute.snapshot.queryParams;
    if (q['joinRoom'] && q['mode'] && q['diff'] && q['mode'] !== 'single') {
      // Use setTimeout to allow subclass to finish initialization (like fetching single player records)
      setTimeout(() => {
        this.handleJoinRoom({
          roomId: q['joinRoom'],
          mode: q['mode'],
          difficulty: q['diff'],
          host: q['host'] || ''
        });
        
        // Clean up URL
        this._baseRouter.navigate([], {
          relativeTo: this._baseRoute,
          queryParams: { joinRoom: null, mode: null, diff: null, host: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }, 200);
    }
  }

  /**
   * Cleanup on destroy. Subclasses that override ngOnDestroy MUST call super.ngOnDestroy().
   */
  ngOnDestroy(): void {
    // Lobby WS stays connected across game switches — no disconnect here.
    // Game-specific cleanup should be handled in the subclass.
  }

  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}) {
    if (this.store.roomId() === event.roomId) return;
    this.wsService.setPendingAction('join');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    this.isMobileSidebarOpen.set(false);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    this.wsService.setPendingAction('create');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
    this.isMobileSidebarOpen.set(false);
  }

  handleDismissRoom() {
    this.wsService.send({ type: 'dismiss_room' });
    this.store.leaveRoom();
  }
}
