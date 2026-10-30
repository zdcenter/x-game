import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CrossGameJoinService } from './cross-game-join.service';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { GameRegistryService } from './game-registry.service';
import { C2SAction, S2CEvent, WSErrorCode, WsQueryParam, WSActionMessage } from '../models/websocket.model';
import { createWebSocket, isBrowser } from '../utils/browser.util';
import { LobbyActivity } from '../models/activity.model';

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
  private gameRegistry = inject(GameRegistryService);
  
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
  
  // Current active room tracking signals
  readonly activeGameId = signal<string>('');
  readonly currentRoomId = signal<string>('');
  readonly currentMode = signal<string>('');
  readonly currentDifficulty = signal<string>('');
  readonly isCurrentSpectator = signal<boolean>(false);
  
  // Expose the latest game state from the server
  readonly gameState = signal<any>(null);

  // Expose lobby state
  readonly onlinePlayers = signal<any[]>([]);
  readonly activeRooms = signal<any[]>([]);
  readonly broadcastMessages = signal<any[]>([]);
  readonly lobbyActivities = signal<LobbyActivity[]>([]);
  readonly cheerReceivedEvent = signal<{senderName: string, gameId: string} | null>(null);

  // Triggered when the websocket disconnects unexpectedly
  readonly unexpectedDisconnectEvent = signal<number>(0);
  
  // Triggered when matchmaking succeeds
  readonly matchSuccessEvent = signal<number>(0);

  // Friend events
  readonly friendStatusEvent = signal<any>(null);
  readonly friendInviteEvent = signal<any>(null);

  // Triggered when an emoji is received
  readonly emojiReceivedEvent = signal<{senderId: string, emoji: string} | null>(null);
  
  // Triggered when room chat is received
  readonly roomChatReceivedEvent = signal<{senderId: string, text: string} | null>(null);

  // Triggered when the room is dismissed
  readonly roomDismissedEvent = signal<number>(0);
  readonly kickedEvent = signal<number>(0);
  readonly connectionRejectedEvent = signal<number>(0);
  
  // Triggered when host changes
  readonly hostChangedEvent = signal<{newHost: string, oldHost: string} | null>(null);

  connect(gameId: string, roomId: string, playerId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Medium, hostId: string = '', action: string = '', password: string = '', target: number = 1, bounty: number = 0, isSpectator: boolean = false) {
    // Auto-consume pendingPassword if no explicit password provided
    if (!password && this._pendingPassword) {
      password = this._pendingPassword;
      this._pendingPassword = '';
    }

    // Recover password from sessionStorage for reconnects
    if (!password && typeof sessionStorage !== 'undefined') {
      const savedPass = sessionStorage.getItem(`room_password_${roomId}`);
      if (savedPass) {
        password = savedPass;
      }
    }

    // Save password for future reconnects
    if (password && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`room_password_${roomId}`, password);
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

    this.activeGameId.set(gameId);
    this.currentRoomId.set(roomId);
    this.currentMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.isCurrentSpectator.set(isSpectator || action === 'spectate');

    const cleanHostId = hostId === 'undefined' || hostId === undefined ? '' : hostId;
    let url = `${environment.wsUrl}/ws/join/${encodeURIComponent(roomId)}?${WsQueryParam.Game}=${encodeURIComponent(gameId)}&${WsQueryParam.PlayerId}=${encodeURIComponent(playerId)}&${WsQueryParam.Mode}=${encodeURIComponent(mode)}&${WsQueryParam.Difficulty}=${encodeURIComponent(difficulty)}&${WsQueryParam.HostId}=${encodeURIComponent(cleanHostId)}&${WsQueryParam.Target}=${target}`;
    if (action) {
      url += `&${WsQueryParam.Action}=${encodeURIComponent(action)}`;
    }
    if (isSpectator || action === 'spectate') {
      url += `&${WsQueryParam.Spectate}=true`;
    }
    if (password) {
      url += `&${WsQueryParam.Password}=${encodeURIComponent(password)}`;
    }
    if (bounty > 0) {
      url += `&${WsQueryParam.Bounty}=${encodeURIComponent(bounty)}`;
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
        if (msg.players) {
          msg.state.roomPlayers = msg.players;
        }
        if (msg.spectators) {
          msg.state.spectators = msg.spectators;
        }
        if (msg.bountyCoins !== undefined) {
          msg.state.bountyCoins = msg.bountyCoins;
        }
        if (msg.difficulty) {
          msg.state.difficulty = msg.difficulty;
          this.currentDifficulty.set(msg.difficulty);
        }
        if (msg.mode) {
          msg.state.mode = msg.mode;
          this.currentMode.set(msg.mode);
        }
        if (msg.game) {
          msg.state.game = msg.game;
          this.activeGameId.set(msg.game);
        }
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
        const spectating = isSpectator || action === 'spectate' || this.isCurrentSpectator();
        this.crossGameJoin.setPendingJoin({
          game: msg.game,
          roomId: msg.roomId,
          mode: msg.mode,
          difficulty: msg.difficulty,
          host: msg.host || '',
          action: spectating ? 'spectate' : 'join',
          spectate: spectating
        });
        
        console.log('Room changed game/settings:', msg.game, msg.difficulty);
        if (msg.difficulty) {
          this.currentDifficulty.set(msg.difficulty);
          this.gameState.update(s => s ? { ...s, difficulty: msg.difficulty } : { difficulty: msg.difficulty });
        }
        if (msg.mode) {
          this.currentMode.set(msg.mode);
          this.gameState.update(s => s ? { ...s, mode: msg.mode } : { mode: msg.mode });
        }
        if (msg.game) {
          this.activeGameId.set(msg.game);
          this.gameState.update(s => s ? { ...s, game: msg.game } : { game: msg.game });
        }

        const lang = this.router.url.split('/')[1] || 'zh';
        const targetUrl = `/${lang}/games/${msg.game}`;
        const currentUrlBase = this.router.url.split('?')[0].replace(/\/$/, '');

        // 仅在跨不同游戏切换时才触发路由跳转；同一游戏内切换难度无需重载路由！
        if (currentUrlBase !== targetUrl) {
          const gameConfig = this.gameRegistry.getConfig(msg.game);
          const gameTitleKey = gameConfig?.titleKey || `lobby.${msg.game}`;
          const gameName = this.i18n.t(gameTitleKey)() || this.i18n.t(`game.${msg.game}`)() || msg.game;
          this.toastService.show(this.i18n.t('game.game_switched_toast', { game: gameName })() || `房间已切换至游戏: ${gameName}`, 'info');
          this.router.navigate([targetUrl]);
        } else {
          const diffLabel = this.gameRegistry.getDifficultyLabel(msg.game, msg.difficulty);
          const diffName = diffLabel ? (this.i18n.t(diffLabel)() || msg.difficulty) : msg.difficulty;
          const diffText = this.i18n.t('game.difficulty')() || '游戏难度';
          this.toastService.show(`${diffText}: ${diffName} ✓`, 'info');
        }
      } else if (msg.type === S2CEvent.EmojiBroadcast) {
        this.emojiReceivedEvent.set(msg.payload);
      } else if (msg.type === S2CEvent.ChatBroadcast) {
        this.roomChatReceivedEvent.set(msg.payload);
      } else if (msg.type === S2CEvent.StartRejected) {
        // Host tried to start but was rejected (player not ready / not enough players)
        const reason = msg.reason;
        if (reason === 'player_not_ready') {
          const playerName = msg.player || '?';
          this.toastService.warning(
            this.i18n.t('game.start_rejected_not_ready', { player: playerName })() || `无法开始: 玩家 ${playerName} 尚未准备`
          );
        } else {
          this.toastService.warning(
            this.i18n.t('game.start_rejected_not_enough')() || '无法开始: 需要至少2名玩家'
          );
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
      
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isConnected() && !this.gameDisconnectIntentional) {
          const reconnectAction = isSpectator ? 'spectate' : (action || 'join');
          this.connect(gameId, roomId, playerId, mode, difficulty, hostId, reconnectAction, password, target, bounty, isSpectator);
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
        if (msg.activities && Array.isArray(msg.activities)) {
          this.lobbyActivities.set(msg.activities);
        }
      } else if (msg.type === 'activity_broadcast') {
        if (msg.activity) {
          this.lobbyActivities.update(acts => {
            const filtered = acts.filter(a => a.id !== msg.activity.id);
            return [msg.activity, ...filtered].slice(0, 30);
          });
        }
      } else if (msg.type === 'cheer') {
        if (msg.targetId === playerId || msg.targetId === username) {
          this.cheerReceivedEvent.set({ senderName: msg.senderName, gameId: msg.gameId });
        }
      } else if (msg.type === 'broadcast') {
        this.broadcastMessages.update(msgs => {
          const newMsgs = [msg, ...msgs];
          return newMsgs.slice(0, 3);
        });
        setTimeout(() => {
          this.broadcastMessages.update(msgs => msgs.filter(m => m !== msg));
        }, 15000);
      } else if (msg.type === 'match_success') {
        this.matchSuccessEvent.update(v => v + 1);
        this.toastService.show(this.i18n.t('game.match_found')() || 'Match found!', 'success');
        
        this.crossGameJoin.setPendingJoin({
          game: msg.game,
          roomId: msg.roomId,
          mode: msg.mode,
          difficulty: msg.difficulty,
          host: msg.host || ''
        });
        
        const lang = this.router.url.split('/')[1] || 'zh';
        const targetUrl = `/${lang}/games/${msg.game}`;
        
        if (this.router.url === targetUrl) {
          this.router.navigateByUrl(`/${lang}`, { skipLocationChange: true }).then(() => {
            this.router.navigate([targetUrl]);
          });
        } else {
          this.router.navigate([targetUrl]);
        }
      } else if (msg.type === 'system' && msg.event === 'friend_status') {
        this.friendStatusEvent.set(msg.payload);
      } else if (msg.type === 'system' && msg.event === 'friend_invite') {
        this.friendInviteEvent.set(msg.payload);
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

  send(action: WSActionMessage) {
    if (!action || !action.action) {
      console.warn('WS send rejected: missing required action field', action);
      return;
    }
    if (this.socket && this.isConnected()) {
      this.socket.send(JSON.stringify(action));
    } else {
      console.warn('WS not connected, cannot send action', action);
    }
  }

  sendEmoji(emoji: string) {
    this.send({ action: C2SAction.Emoji, payload: { emoji: emoji } });
  }

  sendRoomChat(text: string) {
    this.send({ action: C2SAction.Chat, payload: { text: text } });
  }

  sendLobby(action: any) {
    if (this.lobbySocket && this.isLobbyConnected()) {
      this.lobbySocket.send(JSON.stringify(action));
    } else {
      console.warn('Lobby WS not connected, cannot send action', action);
    }
  }

  sendLobbyAction(actionType: string, payload?: any) {
    if (this.lobbySocket && this.isLobbyConnected()) {
      this.lobbySocket.send(JSON.stringify({ type: actionType, ...payload }));
    } else {
      console.warn('Cannot send lobby action, disconnected:', actionType);
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
      this.activeGameId.set('');
      this.currentRoomId.set('');
      this.currentMode.set('');
      this.currentDifficulty.set('');
      this.isCurrentSpectator.set(false);
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
          this.socket.send(JSON.stringify({ action: C2SAction.Ping }));
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
