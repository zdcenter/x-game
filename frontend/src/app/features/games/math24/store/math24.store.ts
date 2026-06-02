import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { GameTimerService } from '../../../../core/services/game-timer.service';
import { AudioService } from '../../../../core/services/audio.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface Math24Card {
  id: string;
  value: number;
  expression: string; // E.g., "4", "(4+6)", etc.
  used: boolean;
}

export type Operator = '+' | '-' | '*' | '/';

@Injectable({
  providedIn: 'root'
})
export class Math24Store {
  private ws = inject(WebSocketService);
  private auth = inject(AuthStore);
  private timerService = inject(GameTimerService);
  private audio = inject(AudioService);
  private http = inject(HttpClient);

  // Raw state from WebSocket
  rawState = computed(() => this.ws.gameState() || {
    status: 'waiting',
    difficulty: '',
    players: {},
    puzzles: [],
    puzzle: null,
    winners: []
  });

  gameStatus = computed(() => this.rawState().status);
  players = computed(() => this.rawState().players);
  playersList = computed(() => {
    const p = this.players() || {};
    return Object.keys(p).map(id => ({ id, ...p[id] }));
  });
  readyPlayers = computed(() => (this.rawState() as any).readyPlayers || {});
  winners = computed(() => this.rawState().winners || []);
  host = computed(() => this.rawState().host || '');

  playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);
  
  // Single Player Local State
  roomId = signal<string>('');
  private localMode = signal<'single' | 'pk_speed' | 'pk_steal'>('single');
  private localDifficulty = signal<string>('easy');
  private localCards = signal<Math24Card[]>([]);
  private localHistory = signal<Math24Card[][]>([]);
  private localTime = signal<number>(0);
  private localStatus = signal<'waiting' | 'playing' | 'finished'>('waiting');
  localLevelIndex = signal<number>(0);
  completedLevels = signal<Record<string, number[]>>({});
  private timerInterval: any;

  freezeUntil = computed(() => {
    if (this.currentMode() === 'single') return 0;
    const p = this.players()?.[this.playerId()];
    return p?.freezeUntil || 0;
  });

  constructor() {
    effect(() => {
      const puzzle = this.currentPuzzle();
      const mode = this.currentMode();
      
      if (mode !== 'single' && puzzle && puzzle.cards) {
        untracked(() => {
          const id = puzzle.id || puzzle.cards;
          if (this.currentPuzzleId() !== id) {
            this.currentPuzzleId.set(id);
            this.loadPuzzle(puzzle.cards);
          }
        });
      }
    });
  }

  currentMode = computed(() => {
    return this.localMode();
  });

  currentDifficulty = computed(() => {
    return this.localDifficulty();
  });

  isFinished = computed(() => {
    if (this.currentMode() === 'single') return this.localStatus() === 'finished';
    return this.gameStatus() === 'finished';
  });

  timeSpent = computed(() => {
    if (this.currentMode() === 'single') return this.localTime();
    return 0; // Handled by PK timer usually
  });

  // Current Puzzle logic
  currentPuzzle = computed(() => {
    if (this.currentMode() === 'single') {
      return { cards: this.localCards().map(c => c.value).join(',') };
    }
    const state = this.rawState();
    if (this.currentMode() === 'pk_steal') {
      return state.puzzle;
    } else if (this.currentMode() === 'pk_speed') {
      const p = state.players[this.playerId()];
      if (p && state.puzzles && p.progress < state.puzzles.length) {
        return state.puzzles[p.progress];
      }
      return null;
    }
    return null;
  });

  // Gameplay Board State
  boardCards = signal<Math24Card[]>([]);
  boardHistory = signal<Math24Card[][]>([]);

  // When a new puzzle arrives, we must reset the board.
  // In a real app we might use an effect, but we can also do it via an explicit method.
  loadPuzzle(cardsStr: string) {
    if (!cardsStr) return;
    const vals = cardsStr.split(',').map(Number);
    const initial = vals.map((v, i) => ({
      id: `c_${i}`,
      value: v,
      expression: v.toString(),
      used: false
    }));
    this.boardCards.set(initial);
    this.boardHistory.set([initial]);
  }

  combineCards(c1: Math24Card, c2: Math24Card, op: Operator): Math24Card | null {
    let result = 0;
    let exp = '';
    
    // Auto-order for subtraction/division to avoid negatives/fractions if possible, 
    // BUT the user selected c1 then c2, so order matters.
    if (op === '+') {
      result = c1.value + c2.value;
      exp = `(${c1.expression}+${c2.expression})`;
    } else if (op === '-') {
      result = c1.value - c2.value;
      exp = `(${c1.expression}-${c2.expression})`;
    } else if (op === '*') {
      result = c1.value * c2.value;
      exp = `(${c1.expression}*${c2.expression})`;
    } else if (op === '/') {
      if (c2.value === 0) return null; // invalid
      result = c1.value / c2.value;
      exp = `(${c1.expression}/${c2.expression})`;
    }

    const newCard: Math24Card = {
      id: `c_${Date.now()}`,
      value: result,
      expression: exp,
      used: false
    };

    const current = this.boardCards();
    const next = current.filter(c => c.id !== c1.id && c.id !== c2.id);
    next.push(newCard);

    this.boardHistory.update(h => [...h, next]);
    this.boardCards.set(next);

    this.audio.playClick();

    if (next.length === 1) {
      this.checkWin(next[0]);
    }
    return newCard;
  }

  undo() {
    const history = this.boardHistory();
    if (history.length > 1) {
      history.pop();
      this.boardHistory.set([...history]);
      this.boardCards.set(history[history.length - 1]);
      this.audio.playClick();
    }
  }

  currentPuzzleId = signal<string>('');

  checkWin(finalCard: Math24Card) {
    // For 24 Game, we usually want exactly 24.
    // Floating point precision issue workaround:
    if (Math.abs(finalCard.value - 24) < 0.0001) {
      this.audio.playWin();
      if (this.currentMode() === 'single') {
        this.stopTimer();
        this.localStatus.set('finished');
        
        let stars = 3;
        if (this.localTime() > 30) stars = 2;
        if (this.localTime() > 60) stars = 1;

        if (this.auth.isAuthenticated() && this.currentPuzzleId()) {
          this.http.post(`/api/v1/math24/puzzle/${this.currentPuzzleId()}/finish`, {
            time_spent: this.localTime(),
            stars: stars
          }).subscribe();
        }
      } else {
        // Send solve to server
        this.ws.send({
          type: 'action',
          action: 'solve',
          payload: { expression: finalCard.expression, isCorrect: true }
        });
      }
    } else {
      this.audio.playExplosion(); // Error sound
      if (this.currentMode() !== 'single') {
        this.ws.send({
          type: 'action',
          action: 'solve',
          payload: { expression: finalCard.expression, isCorrect: false }
        });
        // Server will freeze us
      }
      
      // Auto-reset board on fail
      setTimeout(() => {
        const history = this.boardHistory();
        if (history.length > 0) {
          const initial = history[0];
          this.boardHistory.set([initial]);
          this.boardCards.set(initial);
        }
      }, 500);
    }
  }

  // --- Single Player Logic ---
  startSinglePlayer(id: string, puzzle: string, difficulty: string = 'easy', levelIndex: number = 0) {
    this.localMode.set('single');
    this.localDifficulty.set(difficulty);
    this.localStatus.set('playing');
    this.localLevelIndex.set(levelIndex);
    this.currentPuzzleId.set(id);
    
    this.loadPuzzle(puzzle);
    this.startTimer();
  }

  loadNextLevel() {
    if (this.currentMode() !== 'single') return;
    const diff = this.localDifficulty();
    const nextIndex = this.localLevelIndex() + 1;
    this.http.get<any>(`/api/v1/math24/levels/${diff}`).subscribe(levels => {
      if (levels && levels.length > nextIndex) {
        const level = levels[nextIndex];
        this.startSinglePlayer(level.id, level.cards, diff, nextIndex);
      }
    });
  }

  loadPrevLevel() {
    if (this.currentMode() !== 'single') return;
    const diff = this.localDifficulty();
    const prevIndex = this.localLevelIndex() - 1;
    if (prevIndex < 0) return;
    this.http.get<any>(`/api/v1/math24/levels/${diff}`).subscribe(levels => {
      if (levels && levels.length > prevIndex) {
        const level = levels[prevIndex];
        this.startSinglePlayer(level.id, level.cards, diff, prevIndex);
      }
    });
  }

  startTimer() {
    this.stopTimer();
    this.localTime.set(0);
    this.timerInterval = setInterval(() => {
      this.localTime.update(t => t + 1);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // --- Multi Player Logic ---
  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.roomId.set(roomId);
    this.localMode.set(mode as any);
    this.ws.connect('math24', roomId, this.playerId(), mode, difficulty, hostId);
  }

  leaveRoom() {
    this.ws.send({ type: 'leave_game' });
    this.roomId.set('');
    this.localMode.set('single');
  }

  disconnectWS() {
    this.ws.disconnect('math24');
  }

  kickPlayer(playerId: string) {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'cancel_ready' });
    }
  }

  startGame() {
    this.ws.send({ type: 'action', action: 'start' });
  }

  dismissRoom() {
    this.ws.send({ type: 'dismiss_room' });
  }

  restartGame() {
    this.ws.send({ type: 'restart_game' });
  }
}
