import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalSokobanEngine } from './local-sokoban-engine';
import { environment } from '../../../../../environments/environment';

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
  private http = inject(HttpClient);

  roomId = signal('');
  currentRoomMode = signal('single');
  isDead = signal(false);
  
  localDifficulty = signal('beginner');
  localEngine = signal<LocalSokobanEngine | null>(null, { equal: () => false });
  currentLevelId = signal<string>('');
  levelsList = signal<any[]>([]);
  hasNextLevel = computed(() => {
    const list = this.levelsList() || [];
    const curr = this.currentLevelId();
    if (!list.length || !curr) return false;
    const idx = list.findIndex(l => l.id === curr);
    return idx >= 0 && idx < list.length - 1;
  });
  currentLevelNum = computed(() => {
    const list = this.levelsList() || [];
    const curr = this.currentLevelId();
    const level = list.find(l => l.id === curr);
    return level ? level.level_num : 1;
  });

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
    return (this.rawState()?.state as SokobanGameState)?.difficulty || 'beginner';
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

  joinRoom(roomId: string, mode: string = 'single', difficulty: string = 'beginner', hostId?: string) {
    const playerId = this.auth.currentUser()?.username || this.auth.guestId;
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.isDead.set(false);
    
    if (mode === 'single') {
      const saved = LocalSokobanEngine.loadFromStorage();
      if (saved) {
        this.localDifficulty.set(saved.difficulty);
        this.localEngine.set(saved.engine);
        this.fetchLevelsAndLoad(saved.difficulty, saved.engine.levelStr, true);
      } else {
        this.fetchLevelsAndLoad(difficulty, '', false);
      }
    } else {
      this.ws.connect('sokoban', roomId, playerId, mode, difficulty, hostId);
    }
  }

  loadLevelFromLobby(difficulty: string, puzzle: string, levelId: string) {
    this.localDifficulty.set(difficulty);
    this.currentLevelId.set(levelId);
    
    const saved = LocalSokobanEngine.loadFromStorage(levelId);
    if (saved && saved.engine) {
      this.localEngine.set(saved.engine);
      this.fetchLevelsAndLoad(difficulty, saved.engine.levelStr, true);
    } else {
      const newEngine = new LocalSokobanEngine(levelId, difficulty, puzzle);
      this.localEngine.set(newEngine);
      newEngine.saveToStorage();
      this.fetchLevelsAndLoad(difficulty, puzzle, true);
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
      const eng = this.localEngine();
      if (!eng) return;
      eng.move(dir);
      this.localEngine.set(eng); // Trigger reactivity
      if (eng.status === 'finished') {
        this.submitFinish();
      }
      return;
    }
    this.ws.send({ action: 'move', dir });
  }

  private submitFinish() {
    const eng = this.localEngine();
    if (!eng || !this.currentLevelId()) return;
    this.http.post(`${environment.apiUrl}/sokoban/puzzle/${this.currentLevelId()}/finish`, {
      moves: eng.moves,
      time_spent: 0,
      stars: 3
    }).subscribe();
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

  applyHint(): { success: boolean; message: string } {
    if (this.currentRoomMode() === 'single') {
      const engine = this.localEngine();
      if (engine) return engine.applyHint();
    }
    return { success: false, message: 'game.no_hint_available' };
  }

  changeSingleDifficulty(diff: string) {
    this.localDifficulty.set(diff);
    this.fetchLevelsAndLoad(diff);
  }

  fetchLevelsAndLoad(difficulty: string, retainCurrentStr?: string, avoidNewLoad?: boolean) {
    this.http.get<any[]>(`${environment.apiUrl}/sokoban/levels/${difficulty}`).subscribe(res => {
      const levels = res || [];
      this.levelsList.set(levels);
      
      if (!levels.length) return;

      if (avoidNewLoad && this.localEngine()) {
        const found = levels.find(l => l.puzzle === retainCurrentStr || l.id === this.currentLevelId());
        if (found) this.currentLevelId.set(found.id);
        return;
      }

      // Find first unfinished level
      let targetLevel = levels.find(l => !l.progress || l.progress.status !== 'finished');
      if (!targetLevel) targetLevel = levels[levels.length - 1]; // All finished, pick last

      if (targetLevel) {
        this.loadLevel(targetLevel.id);
      }
    });
  }

  loadLevel(id: string) {
    const saved = LocalSokobanEngine.loadFromStorage(id);
    if (saved && saved.engine) {
      this.currentLevelId.set(id);
      this.localEngine.set(saved.engine);
      this.localDifficulty.set(saved.difficulty);
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/sokoban/puzzle/${id}`).subscribe(res => {
      this.currentLevelId.set(res.puzzle.id);
      const engine = new LocalSokobanEngine(res.puzzle.id, this.localDifficulty(), res.puzzle.puzzle);
      this.localEngine.set(engine);
      engine.saveToStorage();
    });
  }

  nextLevel() {
    const list = this.levelsList();
    const curr = this.currentLevelId();
    const idx = list.findIndex(l => l.id === curr);
    if (idx >= 0 && idx < list.length - 1) {
      this.loadLevel(list[idx + 1].id);
    }
  }

  prevLevel() {
    const list = this.levelsList();
    const curr = this.currentLevelId();
    const idx = list.findIndex(l => l.id === curr);
    if (idx > 0) {
      this.loadLevel(list[idx - 1].id);
    }
  }
}
