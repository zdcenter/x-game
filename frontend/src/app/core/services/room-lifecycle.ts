import { Signal, WritableSignal, effect, inject, untracked, DestroyRef } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { CrossGameJoinService } from './cross-game-join.service';

/**
 * Shared room lifecycle configuration for any game component.
 * Encapsulates: cross-game join, reconnect from sessionStorage, room dismissed handling.
 *
 * Usage in a game component's constructor + ngOnInit:
 *
 * ```ts
 * // In constructor:
 * this.roomLifecycle = setupRoomLifecycle({
 *   gameId: 'minesweeper',
 *   getCurrentMode: () => this.currentRoomMode(),
 *   onLeaveRoom: () => this.leaveRoom(),
 * });
 *
 * // In ngOnInit:
 * const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
 * if (joinInfo) {
 *   this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host);
 * } else {
 *   this.startSinglePlayer();
 * }
 * ```
 */
export interface RoomLifecycleConfig {
  /** Unique game identifier, e.g. 'minesweeper', 'sudoku' */
  gameId: string;
  /** Returns the current room mode ('single', 'pk_steal', 'pk_speed', etc.) */
  getCurrentMode: () => string;
  /** Called when the room is dismissed by the host */
  onLeaveRoom: () => void;
}

export interface PendingJoinInfo {
  roomId: string;
  mode: string;
  difficulty: string;
  host?: string;
  password?: string;
}

export interface RoomLifecycleHandle {
  /**
   * Check for pending cross-game join or sessionStorage reconnect.
   * Call this in ngOnInit. Returns join info if found, null otherwise.
   */
  consumePendingOrReconnect(): PendingJoinInfo | null;

  /**
   * Save reconnect info to sessionStorage for page refresh recovery.
   * Call this when joining a PK room.
   */
  saveReconnectInfo(roomId: string, mode: string, difficulty: string, host?: string): void;

  /**
   * Clear reconnect info from sessionStorage.
   * Call this when leaving a room.
   */
  clearReconnectInfo(): void;
}

/**
 * Sets up room lifecycle management for a game component.
 * MUST be called inside a constructor (for effect() registration).
 * Returns a handle with methods to call in ngOnInit and joinRoom/leaveRoom.
 */
export function setupRoomLifecycle(config: RoomLifecycleConfig): RoomLifecycleHandle {
  const wsService = inject(WebSocketService);
  const toastService = inject(ToastService);
  const i18n = inject(I18nService);
  const crossGameJoin = inject(CrossGameJoinService);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  const prefix = `${config.gameId}_reconnect`;

  const clearReconnectInfo = () => {
    sessionStorage.removeItem(`${prefix}_room`);
    sessionStorage.removeItem(`${prefix}_mode`);
    sessionStorage.removeItem(`${prefix}_diff`);
    sessionStorage.removeItem(`${prefix}_host`);
  };

  // Clear session storage if user navigates away via Angular SPA router
  router.events.pipe(
    filter((event): event is NavigationStart => event instanceof NavigationStart),
    takeUntilDestroyed(destroyRef)
  ).subscribe(event => {
    if (!event.url.includes(`/games/${config.gameId}`)) {
      clearReconnectInfo();
    }
  });


  // Auto-register room dismissed handler via Angular effect()
  effect(() => {
    const dismissed = wsService.roomDismissedEvent();
    if (dismissed > 0 && untracked(() => config.getCurrentMode()) !== 'single') {
      toastService.show(i18n.t('game.room_dismissed_msg')() || 'The host has dismissed the room.', 'info');
      clearReconnectInfo();
      config.onLeaveRoom();
    }
  });

  effect(() => {
    const kicked = wsService.kickedEvent();
    if (kicked > 0) {
      toastService.show(i18n.t('game.kicked_msg')() || 'You have been kicked from the room by the host.', 'error');
      clearReconnectInfo();
      config.onLeaveRoom();
    }
  });

  return {
    consumePendingOrReconnect(): PendingJoinInfo | null {
      const joinInfo = crossGameJoin.consumePendingJoin(config.gameId);
      if (joinInfo) {
        wsService.setPendingAction('join');
        return {
          roomId: joinInfo.roomId,
          mode: joinInfo.mode,
          difficulty: joinInfo.difficulty,
          host: joinInfo.host,
        };
      }

      // 2. Check for reconnect from sessionStorage (e.g. page refresh)
      const room = sessionStorage.getItem(`${prefix}_room`);
      const mode = sessionStorage.getItem(`${prefix}_mode`);
      const diff = sessionStorage.getItem(`${prefix}_diff`);
      const host = sessionStorage.getItem(`${prefix}_host`) || undefined;

      if (room && mode) {
        // Validate the room still exists on the server (prevents stale reconnect after backend restart)
        const roomStillExists = wsService.activeRooms().some((r: any) => r.id === room || r.roomId === room);
        if (!roomStillExists) {
          // Room no longer exists (backend restarted or room was dismissed) — clean up stale data
          clearReconnectInfo();
          return null;
        }

        if (mode !== 'single') {
          wsService.setPendingAction('join');
        }
        return {
          roomId: room,
          mode,
          difficulty: diff || 'medium',
          host,
        };
      }

      return null;
    },

    saveReconnectInfo(roomId: string, mode: string, difficulty: string, host?: string) {
      sessionStorage.setItem(`${prefix}_room`, roomId);
      sessionStorage.setItem(`${prefix}_mode`, mode);
      sessionStorage.setItem(`${prefix}_diff`, difficulty);
      if (host) {
        sessionStorage.setItem(`${prefix}_host`, host);
      }
    },

    clearReconnectInfo,
  };
}
