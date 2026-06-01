import { Injectable, computed, inject, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { GameTimerService } from '../../../../core/services/game-timer.service';
import { AudioService } from '../../../../core/services/audio.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

const PUZZLE_BANK: Record<string, string[]> = {
  easy: [
    '1,2,3,4', '2,3,4,5', '1,1,1,8', '2,2,4,8', '3,3,4,6',
    '2,4,6,8', '2,3,6,6', '1,2,6,6', '2,4,4,4', '1,3,4,6'
  ],
  medium: [
    '2,5,8,8', '3,5,7,13', '4,5,6,9', '2,4,10,10', '1,2,7,7',
    '2,3,5,8', '2,3,5,12', '1,4,5,6', '2,2,13,13', '3,4,5,6'
  ],
  hard: [
    '3,3,8,8', '1,5,5,5', '4,4,7,7', '2,7,7,10', '3,8,8,3',
    '5,5,5,1', '4,6,6,9', '2,2,11,11', '1,4,5,6', '3,3,7,7'
  ]
};

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
  private timerInterval: any;

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

  combineCards(c1: Math24Card, c2: Math24Card, op: Operator) {
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
      if (c2.value === 0) return false; // invalid
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
    return true;
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

  checkWin(finalCard: Math24Card) {
    // For 24 Game, we usually want exactly 24.
    // Floating point precision issue workaround:
    if (Math.abs(finalCard.value - 24) < 0.0001) {
      this.audio.playWin();
      if (this.currentMode() === 'single') {
        this.stopTimer();
        this.localStatus.set('finished');
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
    }
  }

  // --- Single Player Logic ---
  startSinglePlayer(difficulty: string = 'easy', levelIndex: number = 0) {
    this.localMode.set('single');
    this.localDifficulty.set(difficulty);
    this.localStatus.set('playing');
    this.localLevelIndex.set(levelIndex);
    
    const bank = PUZZLE_BANK[difficulty] || PUZZLE_BANK['easy'];
    const puzzle = bank[levelIndex % bank.length];
    
    this.loadPuzzle(puzzle);
    this.startTimer();
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
    this.ws.disconnect('math24');
    this.roomId.set('');
    this.localMode.set('single');
  }

  startGame() {
    this.ws.send({ type: 'action', action: 'start' });
  }

  dismissRoom() {
    this.ws.send({ type: 'dismiss_room' });
  }
}
