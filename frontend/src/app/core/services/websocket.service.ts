import { Injectable, signal, effect, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface WSMessage {
  type: string;
  state?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private lobbySocket: WebSocket | null = null;
  
  readonly isConnected = signal(false);
  readonly isLobbyConnected = signal(false);
  
  // Expose the latest game state from the server
  readonly gameState = signal<any>(null);

  // Expose lobby state
  readonly onlinePlayers = signal<any[]>([]);
  readonly activeRooms = signal<any[]>([]);

  // Triggered when the websocket disconnects unexpectedly
  readonly unexpectedDisconnectEvent = signal<number>(0);

  // Triggered when the room is dismissed
  readonly roomDismissedEvent = signal<number>(0);

  connect(gameId: string, roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'medium', hostId: string = '') {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }

    const url = `${environment.wsUrl}/ws/join/${roomId}?game=${gameId}&playerId=${playerId}&mode=${mode}&difficulty=${difficulty}&hostId=${hostId}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.isConnected.set(true);
      console.log('WS Connected');
    };

    this.socket.onmessage = (event) => {
      const msg: any = JSON.parse(event.data);
      if (msg.type === 'gameState' && msg.state) {
        msg.state.host = msg.host; // Inject host into the state object for the store
        this.gameState.set(msg.state);
      } else if (msg.type === 'room_dismissed') {
        this.roomDismissedEvent.update(v => v + 1);
      }
    };

    this.socket.onclose = () => {
      this.isConnected.set(false);
      this.socket = null;
      console.log('Game WS Disconnected');
      
      // Auto reconnect after 2 seconds
      this.unexpectedDisconnectEvent.update(v => v + 1);
      
      // Auto reconnect after 2 seconds for all modes
      setTimeout(() => {
        if (!this.isConnected()) {
          console.log('Attempting to reconnect Game WS...');
          this.connect(gameId, roomId, playerId, mode, difficulty, hostId);
        }
      }, 2000);
    };
  }

  connectLobby(playerId: string, username: string) {
    if (this.lobbySocket) {
      if ((this.lobbySocket.readyState === WebSocket.CONNECTING || this.lobbySocket.readyState === WebSocket.OPEN) && 
          this.lobbySocket.url.includes(`playerId=${playerId}`)) {
        return;
      }
      this.lobbySocket.onclose = null;
      this.lobbySocket.close();
    }

    const url = `${environment.wsUrl}/ws/lobby?playerId=${playerId}&username=${encodeURIComponent(username)}`;
    this.lobbySocket = new WebSocket(url);

    this.lobbySocket.onopen = () => {
      this.isLobbyConnected.set(true);
      console.log('Lobby WS Connected');
    };

    this.lobbySocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'lobby_update') {
        console.log('Lobby Update Received:', msg.rooms);
        this.onlinePlayers.set(msg.players || []);
        this.activeRooms.set(msg.rooms || []);
      }
    };

    this.lobbySocket.onclose = () => {
      this.isLobbyConnected.set(false);
      this.lobbySocket = null;
      console.log('Lobby WS Disconnected');
      
      // Auto reconnect after 2 seconds
      setTimeout(() => {
        if (!this.isLobbyConnected()) {
          console.log('Attempting to reconnect Lobby WS...');
          this.connectLobby(playerId, username);
        }
      }, 2000);
    };
  }

  send(action: any) {
    if (this.socket && this.isConnected()) {
      this.socket.send(JSON.stringify(action));
    } else {
      console.warn('WS not connected, cannot send action', action);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
      this.isConnected.set(false);
    }
  }

  disconnectLobby() {
    if (this.lobbySocket) {
      this.lobbySocket.onclose = null;
      this.lobbySocket.close();
      this.lobbySocket = null;
      this.isLobbyConnected.set(false);
    }
  }
}
