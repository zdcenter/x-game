import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CrossGameJoinService } from './cross-game-join.service';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { S2CEvent, WSErrorCode } from '../models/websocket.model';
import { createWebSocket, isBrowser } from '../utils/browser.util';

export interface WSMessage {
  type: string;
  state?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private router = inject(Router);
  private crossGameJoin = inject(CrossGameJoinService);
  private toastService = inject(ToastService);
  private i18n = inject(I18nService);
  
  private socket: WebSocket | null = null;
  private lobbySocket: WebSocket | null = null;
  private currentGameId: string | null = null;
  
  private reconnectTimeout: any = null;
  private lobbyReconnectTimeout: any = null;
  private gameHeartbeatInterval: any = null;
  private lobbyHeartbeatInterval: any = null;
  
  // Track reconnect attempts for exponential backoff
  private gameReconnectAttempts = 0;
  private lobbyReconnectAttempts = 0;
  
  // Track if disconnect was intentional
  private gameDisconnectIntentional = false;
  private lobbyDisconnectIntentional = false;

  // Pending password for the next connect() call (set by lobby panel, consumed by connect)
  private _pendingPassword = '';
  private _pendingAction = '';

  setPendingAction(action: string) {
    this._pendingAction = action;
  }

  readonly isConnected = signal(false);
  readonly isLobbyConnected = signal(false);
  
  // Expose the latest game state from the server
  readonly gameState = signal<any>(null);

  // Expose lobby state
  readonly onlinePlayers = signal<any[]>([]);
  readonly activeRooms = signal<any[]>([]);
  readonly broadcastMessages = signal<any[]>([]);

  // Triggered when the websocket disconnects unexpectedly
  readonly unexpectedDisconnectEvent = signal<number>(0);

  // Triggered when the room is dismissed
  readonly roomDismissedEvent = signal<number>(0);
  readonly kickedEvent = signal<number>(0);
  readonly connectionRejectedEvent = signal<number>(0);
  
  // Triggered when host changes
  readonly hostChangedEvent = signal<{newHost: string, oldHost: string} | null>(null);

  connect(gameId: string, roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'medium', hostId: string = '', action: string = '', password: string = '') {
    // Auto-consume pendingPassword if no explicit password provided
    if (!password && this._pendingPassword) {
      password = this._pendingPassword;
      this._pendingPassword = '';
    }
    
    // Auto-consume pendingAction if no explicit action provided
    if (!action && this._pendingAction) {
      action = this._pendingAction;
      this._pendingAction = '';
    }
    // Mark any previous disconnect as intentional to prevent old onclose from reconnecting
    this.gameDisconnectIntentional = true;
    
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    
    this.clearGameHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset all per-room state to prevent stale cross-game data from leaking
    this.gameState.set(null);
    this.roomDismissedEvent.set(0);
    this.kickedEvent.set(0);
    this.unexpectedDisconnectEvent.set(0);
    this.connectionRejectedEvent.set(0);
    this.gameReconnectAttempts = 0;
    this.gameDisconnectIntentional = false;

    const cleanHostId = hostId === 'undefined' || hostId === undefined ? '' : hostId;
    let url = `${environment.wsUrl}/ws/join/${encodeURIComponent(roomId)}?game=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}&mode=${encodeURIComponent(mode)}&difficulty=${encodeURIComponent(difficulty)}&hostId=${encodeURIComponent(cleanHostId)}`;
    if (action) {
      url += `&action=${encodeURIComponent(action)}`;
    }
    if (password) {
      url += `&password=${encodeURIComponent(password)}`;
    }
    if (!isBrowser()) return;
    this.socket = createWebSocket(url);
    if (!this.socket) return;
    this.currentGameId = gameId;

    this.socket.onopen = () => {
      this.isConnected.set(true);
      this.gameReconnectAttempts = 0;
      console.log('Game WS Connected');
      this.startGameHeartbeat();
    };

    this.socket.onmessage = (event) => {
      const msg: any = JSON.parse(event.data);
      if (msg.type === S2CEvent.Pong) {
        // Heartbeat response, connection is alive
        return;
      }
      if (msg.type === S2CEvent.RoomStateUpdate && msg.state) {
        msg.state.host = msg.host;
        msg.state.readyPlayers = msg.readyPlayers || {};
        this.gameState.set(msg.state);
      } else if (msg.type === S2CEvent.RoomDismissed || (msg.type === S2CEvent.Error && (msg.message === WSErrorCode.RoomDismissed || (msg.error && msg.error.includes(WSErrorCode.RoomDismissed))))) {
        this.gameDisconnectIntentional = true;
        this.roomDismissedEvent.update(v => v + 1);
        this.disconnect(gameId);
      } else if (msg.type === S2CEvent.PlayerKicked) {
        this.gameDisconnectIntentional = true;
        this.kickedEvent.update(v => v + 1);
        this.disconnect(gameId);
      } else if (msg.type === S2CEvent.Error) {
        // Server rejected us (e.g. room not found, kicked cooldown)
        const errorMsg = msg.message || msg.error || 'Connection rejected';
        console.warn('Game WS error:', errorMsg);
        this.toastService.show(this.parseServerError(errorMsg), 'error');
        this.gameDisconnectIntentional = true;
        this.connectionRejectedEvent.update(v => v + 1);
        this.disconnect(gameId);
      } else if (msg.type === S2CEvent.HostChanged) {
        this.hostChangedEvent.set({ newHost: msg.newHost, oldHost: msg.oldHost });
      } else if (msg.type === S2CEvent.GameChanged) {
        this.crossGameJoin.setPendingJoin({
          game: msg.game,
          roomId: msg.roomId,
          mode: msg.mode,
          difficulty: msg.difficulty,
          host: msg.host || ''
        });
        
        console.log('Room changed game:', msg.game);
        const targetUrl = '/games/' + msg.game;
        if (this.router.url === targetUrl) {
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([targetUrl]);
          });
        } else {
          this.router.navigate([targetUrl]);
        }
      }
    };

    this.socket.onclose = () => {
      this.isConnected.set(false);
      this.socket = null;
      this.clearGameHeartbeat();
      console.log('Game WS Disconnected');
      
      if (this.gameDisconnectIntentional) {
        // Intentional disconnect (leave room, kicked, dismissed): do NOT reconnect
        return;
      }
      
      // Unexpected disconnect: reconnect with exponential backoff
      this.unexpectedDisconnectEvent.update(v => v + 1);
      const delay = Math.min(2000 * Math.pow(2, this.gameReconnectAttempts), 30000);
      this.gameReconnectAttempts++;
      
      console.log(`Game WS reconnecting in ${delay}ms (attempt ${this.gameReconnectAttempts})`);
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isConnected() && !this.gameDisconnectIntentional) {
          this.connect(gameId, roomId, playerId, mode, difficulty, hostId, 'join');
        }
      }, delay);
    };
  }

  connectLobby(playerId: string, username: string) {
    if (this.lobbySocket) {
      if ((this.lobbySocket.readyState === WebSocket.CONNECTING || this.lobbySocket.readyState === WebSocket.OPEN) && 
          this.lobbySocket.url.includes(`playerId=${playerId}`)) {
        return;
      }
      this.lobbyDisconnectIntentional = true;
      this.lobbySocket.onclose = null;
      this.lobbySocket.close();
    }

    this.clearLobbyHeartbeat();

    if (this.lobbyReconnectTimeout) {
      clearTimeout(this.lobbyReconnectTimeout);
      this.lobbyReconnectTimeout = null;
    }

    this.lobbyReconnectAttempts = 0;
    this.lobbyDisconnectIntentional = false;

    if (!isBrowser()) return;
    
    const url = `${environment.wsUrl}/ws/lobby?playerId=${playerId}&username=${encodeURIComponent(username)}`;
    this.lobbySocket = createWebSocket(url);
    if (!this.lobbySocket) return;

    this.lobbySocket.onopen = () => {
      this.isLobbyConnected.set(true);
      this.lobbyReconnectAttempts = 0;
      console.log('Lobby WS Connected');
      this.startLobbyHeartbeat();
    };

    this.lobbySocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === S2CEvent.Pong) {
        return;
      }
      if (msg.type === 'lobby_update') {
        this.onlinePlayers.set(msg.players || []);
        this.activeRooms.set(msg.rooms || []);
      } else if (msg.type === 'broadcast') {
        this.broadcastMessages.update(msgs => {
          const newMsgs = [msg, ...msgs];
          return newMsgs.slice(0, 3);
        });
        setTimeout(() => {
          this.broadcastMessages.update(msgs => msgs.filter(m => m !== msg));
        }, 15000);
      } else if (msg.type === S2CEvent.Error) {
        console.warn('Lobby WS error:', msg.message);
        this.lobbyDisconnectIntentional = true;
        if (this.lobbySocket) {
          this.lobbySocket.close();
        }
      }
    };

    this.lobbySocket.onclose = () => {
      this.isLobbyConnected.set(false);
      this.lobbySocket = null;
      this.clearLobbyHeartbeat();
      console.log('Lobby WS Disconnected');
      
      if (this.lobbyDisconnectIntentional) {
        return;
      }
      
      // Reconnect with exponential backoff
      const delay = Math.min(2000 * Math.pow(2, this.lobbyReconnectAttempts), 30000);
      this.lobbyReconnectAttempts++;
      
      console.log(`Lobby WS reconnecting in ${delay}ms (attempt ${this.lobbyReconnectAttempts})`);
      this.lobbyReconnectTimeout = setTimeout(() => {
        if (!this.isLobbyConnected() && !this.lobbyDisconnectIntentional) {
          this.connectLobby(playerId, username);
        }
      }, delay);
    };
  }

  send(action: any) {
    if (this.socket && this.isConnected()) {
      this.socket.send(JSON.stringify(action));
    } else {
      console.warn('WS not connected, cannot send action', action);
    }
  }

  sendLobby(action: any) {
    if (this.lobbySocket && this.isLobbyConnected()) {
      this.lobbySocket.send(JSON.stringify(action));
    } else {
      console.warn('Lobby WS not connected, cannot send action', action);
    }
  }

  disconnect(gameId?: string) {
    if (gameId && this.currentGameId !== gameId) {
      return;
    }
    
    this.gameDisconnectIntentional = true;
    this.clearGameHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
      this.isConnected.set(false);
      this.currentGameId = null;
    }
    this.gameState.set(null);
  }

  disconnectLobby() {
    this.lobbyDisconnectIntentional = true;
    this.clearLobbyHeartbeat();

    if (this.lobbyReconnectTimeout) {
      clearTimeout(this.lobbyReconnectTimeout);
      this.lobbyReconnectTimeout = null;
    }

    if (this.lobbySocket) {
      this.lobbySocket.onclose = null;
      this.lobbySocket.close();
      this.lobbySocket = null;
      this.isLobbyConnected.set(false);
    }
  }
  
  // --- Heartbeat ---
  
  private startGameHeartbeat() {
    this.clearGameHeartbeat();
    this.gameHeartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected()) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // Will be caught by onclose
        }
      }
    }, 25000); // Every 25 seconds
  }
  
  private clearGameHeartbeat() {
    if (this.gameHeartbeatInterval) {
      clearInterval(this.gameHeartbeatInterval);
      this.gameHeartbeatInterval = null;
    }
  }
  
  private startLobbyHeartbeat() {
    this.clearLobbyHeartbeat();
    this.lobbyHeartbeatInterval = setInterval(() => {
      if (this.lobbySocket && this.isLobbyConnected()) {
        try {
          this.lobbySocket.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // Will be caught by onclose
        }
      }
    }, 25000); // Every 25 seconds
  }
  
  private clearLobbyHeartbeat() {
    if (this.lobbyHeartbeatInterval) {
      clearInterval(this.lobbyHeartbeatInterval);
      this.lobbyHeartbeatInterval = null;
    }
  }
  
  /**
   * Parse structured error codes from the backend into localized messages.
   * Backend sends codes like "kick_cooldown:25", "room not found", "game already started"
   */
  private parseServerError(errorMsg: string): string {
    // err_kick_cooldown:25 → "你已被踢出，请等待 25 秒后再加入"
    if (errorMsg.startsWith(`${WSErrorCode.KickCooldown}:`)) {
      const seconds = errorMsg.split(':')[1];
      const template = this.i18n.t('game.kick_cooldown_msg')();
      return template ? template.replace('{seconds}', seconds) : `Kicked. Please wait ${seconds}s before rejoining.`;
    }
    switch (errorMsg) {
      case WSErrorCode.RoomNotFound:
        return this.i18n.t('game.room_not_found_msg')() || 'Room not found.';
      case WSErrorCode.GameAlreadyStarted:
        return this.i18n.t('game.game_already_started_msg')() || 'Game already started.';
      case WSErrorCode.RoomDismissed:
        return this.i18n.t('game.room_dismissed_msg')() || 'Room has been dismissed.';
      case WSErrorCode.RoomAlreadyExists:
        return this.i18n.t('game.room_already_exists_msg')() || 'Room already exists.';
      case WSErrorCode.WrongPassword:
        return this.i18n.t('game.wrong_password_msg')() || 'Wrong password, please try again.';
      case WSErrorCode.MultiplayerDisabled:
        return this.i18n.t('game.multiplayer_disabled_msg')() || 'Multiplayer features are currently disabled for maintenance.';
      default:
        return errorMsg;
    }
  }

  /**
   * Set password for the next connect() call. Used by lobby panel to pass
   * password to game stores without modifying every store's joinGame signature.
   */
  setPendingPassword(password: string) {
    this._pendingPassword = password;
  }
}
