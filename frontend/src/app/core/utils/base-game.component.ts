import { Directive, inject, signal } from '@angular/core';
import { GameTimerService } from '../services/game-timer.service';
import { WebSocketService } from '../services/websocket.service';

/**
 * A base component that provides boilerplate functionality for any PK-enabled game.
 * Components extending this should provide their own specific `store` and `playerId`.
 */
@Directive()
export abstract class BaseGameComponent {
  protected gameTimer = inject(GameTimerService);
  protected wsService = inject(WebSocketService);
  
  isMobileSidebarOpen = signal<boolean>(false);

  // Each subclass must implement these to hook into the base room logic
  abstract get store(): any; 
  abstract get playerId(): string;

  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string}) {
    if (this.store.roomId() === event.roomId) return;
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  handleDismissRoom() {
    this.wsService.send({ type: 'dismiss_room' });
    this.store.leaveRoom();
  }
}
