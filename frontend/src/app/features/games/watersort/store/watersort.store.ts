import { Injectable, signal, computed, inject } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';

export interface Tube {
  colors: string[];
}

export interface PlayerState {
  id: string;
  tubes: Tube[];
  moves: number;
  finished: boolean;
}

export interface WatersortState {
  players: Record<string, PlayerState>;
  status: string;
  winners: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WatersortStore {
  ws = inject(WebSocketService);
  readonly roomId = signal<string>('');
  readonly hostId = computed(() => this.ws.gameState()?.host || '');
  readonly playersList = computed(() => Object.values(this.ws.gameState()?.players || {}));
  readonly currentRoomMode = signal<string>('single');
  readonly currentDifficulty = signal<string>('');
  readonly localDifficulty = signal<string>('easy');
  readonly readyPlayers = computed(() => this.ws.gameState()?.ready_players || []);

  // Raw state mapped from websocket
  private readonly rawState = computed(() => {
    const raw = this.ws.gameState() as WatersortState | undefined;
    if (raw) return raw;
    return {
      players: {},
      status: 'waiting',
      winners: []
    } as WatersortState;
  });

  readonly status = computed(() => this.rawState().status);
  readonly winners = computed(() => this.rawState().winners || []);
  readonly players = computed(() => this.rawState().players || {});

  joinRoom(roomId: string, mode: string, difficulty: string, host: string, playerId: string) {
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    if (mode === 'single') {
      this.localDifficulty.set(difficulty);
    }
    
    this.ws.connect('watersort', roomId, playerId, mode, difficulty, host);
  }

  leaveRoom() {
    this.ws.send({ type: 'leave_game' });
    this.ws.disconnect('watersort');
    this.roomId.set('');
  }

  ready() {
    this.ws.send({ type: 'ready' });
  }

  cancelReady() {
    this.ws.send({ type: 'cancel_ready' });
  }

  startGame() {
    this.ws.send({ action: 'start' });
  }

  restartGame() {
    this.ws.send({ type: 'restart_game' });
  }

  kickPlayer(playerId: string) {
    this.ws.send({ type: 'kick_player', target: playerId });
  }

  dismissRoom() {
    this.ws.send({ type: 'dismiss_room' });
  }

  pour(fromIndex: number, toIndex: number) {
    this.ws.send({
      action: 'pour',
      from: fromIndex,
      to: toIndex
    });
  }

  restart() {
    this.ws.send({
      action: 'restart'
    });
  }
}
