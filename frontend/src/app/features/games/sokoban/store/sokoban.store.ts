import { Injectable, computed, inject, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalSokobanEngine } from './local-sokoban-engine';

export interface SokobanPlayerState {
  id: string;
  board: string[][];
  moves: number;
  status: string;
}

export interface SokobanGameState {
  mode: string;
  difficulty: string;
  players: Record<string, SokobanPlayerState>;
}

@Injectable({
  providedIn: 'root'
})
export class SokobanStore {
  private ws = inject(WebSocketService);
  private auth = inject(AuthStore);

  roomId = signal('');
  currentRoomMode = signal('single');
  isDead = signal(false);
  
  localDifficulty = signal('easy');
  localEngine = signal<LocalSokobanEngine | null>(null, { equal: () => false });

  private rawState = computed(() => this.ws.gameState() as any);

  hostId = computed(() => {
    return this.rawState()?.host || '';
  });

  status = computed(() => {
    if (this.currentRoomMode() === 'single') return this.localEngine()?.status || 'playing';
    return this.rawState()?.status || 'waiting';
  });

  playersList = computed(() => {
    const players = this.rawState()?.players;
    return Object.values(players || {}) as any[];
  });

  readyPlayers = computed(() => {
    return this.rawState()?.ready_players || [];
  });

  currentDifficulty = computed(() => {
    if (this.currentRoomMode() === 'single') return this.localDifficulty();
    return (this.rawState()?.state as SokobanGameState)?.difficulty || 'easy';
  });

  myPlayerState = computed(() => {
    if (this.currentRoomMode() === 'single') {
      const engine = this.localEngine();
      if (!engine) return null;
      return { 
        id: this.auth.currentUser()?.username || this.auth.guestId, 
        board: engine.board, 
        moves: engine.moves, 
        status: engine.status 
      } as SokobanPlayerState;
    }

    const myId = this.auth.currentUser()?.username || this.auth.guestId;
    const state = this.rawState()?.state as SokobanGameState;
    if (!state || !state.players) return null;
    return state.players[myId];
  });

  myBoard = computed(() => {
    return this.myPlayerState()?.board || [];
  });

  myMoves = computed(() => {
    return this.myPlayerState()?.moves || 0;
  });

  opponents = computed(() => {
    const myId = this.auth.currentUser()?.username || this.auth.guestId;
    const state = this.rawState()?.state as SokobanGameState;
    if (!state || !state.players) return [];
    
    return Object.values(state.players)
      .filter(p => p.id !== myId)
      .map(p => ({
        id: p.id,
        board: p.board,
        moves: p.moves,
        status: p.status,
        isHost: p.id === this.hostId()
      }));
  });

  joinGame(roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'easy', hostId?: string) {
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.isDead.set(false);
    
    if (mode === 'single') {
      const saved = LocalSokobanEngine.loadFromStorage();
      if (saved) {
        this.localDifficulty.set(saved.difficulty);
        this.localEngine.set(saved.engine);
      } else {
        this.localDifficulty.set(difficulty);
        const engine = new LocalSokobanEngine(difficulty);
        this.localEngine.set(engine);
        engine.saveToStorage();
      }
    } else {
      this.ws.connect('sokoban', roomId, playerId, mode, difficulty, hostId);
    }
  }

  leaveGame() {
    if (this.currentRoomMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
      this.ws.disconnect('sokoban');
    }
    this.roomId.set('');
  }

  ready() { this.ws.send({ type: 'ready' }); }
  cancelReady() { this.ws.send({ type: 'cancel_ready' }); }
  kickPlayer(playerId: string) { this.ws.send({ type: 'kick_player', target: playerId }); }
  dismissRoom() { this.ws.send({ type: 'dismiss_room' }); }
  startGame() { this.ws.send({ action: 'start' }); }

  move(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.currentRoomMode() === 'single') {
      this.localEngine()?.move(dir);
      this.localEngine.set(this.localEngine()); // Trigger reactivity
      return;
    }
    this.ws.send({ action: 'move', dir });
  }

  undo() {
    if (this.currentRoomMode() === 'single') {
      this.localEngine()?.undo();
      this.localEngine.set(this.localEngine()); // Trigger reactivity
      return;
    }
    this.ws.send({ action: 'undo' });
  }

  restart() {
    if (this.currentRoomMode() === 'single') {
      this.localEngine()?.restart();
      this.localEngine.set(this.localEngine()); // Trigger reactivity
      return;
    }
    this.ws.send({ action: 'restart' });
  }

  changeSingleDifficulty(diff: string) {
    this.localDifficulty.set(diff);
    const engine = new LocalSokobanEngine(diff);
    this.localEngine.set(engine);
    engine.saveToStorage();
  }
}
