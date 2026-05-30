import { Injectable, computed, inject, effect, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalSlidingEngine } from './sliding-engine';

export enum GameStatus {
  Waiting = 'waiting',
  Starting = 'starting',
  Playing = 'playing',
  Finished = 'finished',
}

@Injectable()
export class SlidingStore {
  private ws = inject(WebSocketService);
  private audio = inject(AudioService);
  private auth = inject(AuthStore);
  
  private playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  private currentMode = signal<string>('single');
  private localEngine = signal<LocalSlidingEngine | null>(null);

  private rawState = computed(() => this.ws.gameState() || {
    boards: {},
    winners: [],
    host: '',
    status: GameStatus.Waiting
  });

  readonly currentRoomMode = computed(() => this.currentMode());
  readonly currentRoomId = signal<string>('');
  readonly currentDifficulty = signal<string>('medium');

  readonly host = computed<string>(() => {
    if (this.currentMode() === 'single') return this.playerId();
    return (this.rawState() as any).host || '';
  });

  private mapStatus(backendStatus: number | string | undefined): GameStatus {
    if (typeof backendStatus === 'string') return backendStatus as GameStatus;
    switch (backendStatus) {
      case 1: return GameStatus.Starting;
      case 2: return GameStatus.Playing;
      case 3: return GameStatus.Finished;
      case 0:
      default:
        return GameStatus.Waiting;
    }
  }

  readonly status = computed<GameStatus>(() => {
    if (this.currentMode() === 'single') {
      return this.localEngine()?.status || GameStatus.Waiting;
    }
    return this.mapStatus(this.rawState().status);
  });

  readonly globalStartAt = computed(() => {
    return (this.rawState() as any).globalStartAt || 0;
  });

  readonly myBoard = computed(() => {
    if (this.currentMode() === 'single') {
      const le = this.localEngine();
      if (!le) return null;
      return { size: le.size, cells: le.cells, emptyIdx: le.emptyIdx, status: le.status, startAt: le.startAt, moves: le.moves };
    }
    const boards = this.rawState().boards;
    if (boards && boards[this.playerId()]) {
      return boards[this.playerId()];
    }
    return null;
  });

  readonly allBoards = computed(() => {
    if (this.currentMode() === 'single') return {};
    return this.rawState().boards || {};
  });

  readonly otherPlayers = computed(() => {
    if (this.currentMode() === 'single') return [];
    const boards = this.rawState().boards || {};
    const others = [];
    for (const [id, board] of Object.entries(boards)) {
      if (id !== this.playerId()) {
        others.push({ id, board: board as any });
      }
    }
    return others;
  });

  readonly winners = computed(() => {
    if (this.currentMode() === 'single') {
      return this.localEngine()?.status === GameStatus.Finished ? [this.playerId()] : [];
    }
    return this.rawState().winners || [];
  });

  constructor() {
    effect(() => {
      const s = this.status();
      if (s === GameStatus.Finished) {
        this.audio.playWin();
      } else if (s === GameStatus.Starting) {
        this.audio.playClick();
      }
    });
  }

  joinGame(roomId: string, playerId: string, mode: string = 'single', difficulty: string = 'medium', hostId?: string) {
    this.currentMode.set(mode);
    this.currentRoomId.set(roomId);

    if (mode === 'single') {
      const saved = LocalSlidingEngine.loadFromStorage();
      if (saved) {
        this.currentDifficulty.set(saved.difficulty);
        this.localEngine.set(saved.engine);
      } else {
        this.currentDifficulty.set(difficulty);
        const engine = new LocalSlidingEngine(difficulty);
        this.localEngine.set(engine);
        engine.saveToStorage(difficulty);
      }
    } else {
      this.currentDifficulty.set(difficulty);
      const cleanHostId = hostId === 'undefined' || hostId === undefined ? '' : hostId;
      this.ws.connect('sliding', roomId, playerId, mode, difficulty, cleanHostId);
    }
  }

  leaveGame() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
      this.ws.disconnect('sliding');
    }
    this.currentRoomId.set('');
    this.currentMode.set('single');
  }

  startGame() {
    if (this.currentMode() === 'single') {
      const le = this.localEngine();
      if (le) {
        le.status = GameStatus.Playing;
        le.startAt = Date.now();
        le.saveToStorage(this.currentDifficulty());
        this.localEngine.set(Object.assign(new LocalSlidingEngine(this.currentDifficulty()), le));
      }
    } else {
      this.ws.send({ type: 'game_action', action: 'start' });
    }
  }

  move(idx: number) {
    if (this.status() !== GameStatus.Playing) return;
    
    if (this.currentMode() === 'single') {
      const le = this.localEngine();
      if (le && le.move(idx)) {
        this.audio.playClick(); // optional, but good for feedback
        le.saveToStorage(this.currentDifficulty());
        // Force reactivity
        this.localEngine.set(Object.assign(new LocalSlidingEngine(this.currentDifficulty()), le));
      }
    } else {
      this.ws.send({ type: 'game_action', action: 'move', idx });
      this.audio.playClick(); // Optimistic audio
    }
  }

  playAgain() {
    if (this.currentMode() === 'single') {
      const engine = new LocalSlidingEngine(this.currentDifficulty());
      this.localEngine.set(engine);
      engine.saveToStorage(this.currentDifficulty());
      this.startGame();
    } else {
      this.ws.send({ type: 'restart_game' });
    }
  }

  dismissRoom() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'dismiss_room' });
    }
  }
}
