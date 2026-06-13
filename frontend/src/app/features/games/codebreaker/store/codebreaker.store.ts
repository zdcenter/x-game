import { signal, computed, inject, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { GameStoreInterface } from '../../../../core/interfaces/game-store.interface';

export interface GuessRecord {
	guess: string;
	a: number;
	b: number;
	timestamp: string;
}

export interface PlayerState {
	id: string;
	guesses: GuessRecord[];
	finished: boolean;
}

export interface CodebreakerState {
	status: 'waiting' | 'starting' | 'playing' | 'finished';
	difficulty: string;
	digitLength: number;
	players: Record<string, PlayerState> | PlayerState[];
	winners: string[];
}

export class CodebreakerStore implements GameStoreInterface {
  private ws = inject(WebSocketService);
  gameState = computed(() => this.ws.gameState());
  private statsService = inject(GameStatsService);
  private audio = inject(AudioService);
  private auth = inject(AuthStore);

  // Raw State from WebSocket
  private rawState = computed(() => this.ws.gameState() as CodebreakerState | null);

  // Single Player Mode local signals
  private localStatus = signal<'waiting' | 'starting' | 'playing' | 'finished'>('waiting');
  private localGuesses = signal<GuessRecord[]>([]);
  private localDigitLength = signal<number>(4);
  private localFinished = signal<boolean>(false);
  private localSecretCode = '';

  // Public state selection (Single vs Multiplayer)
  public singlePlayerMode = false;
  myPlayerId = signal<string>('');
  difficulty = signal<string>('medium');

  // GameStoreInterface aliases
  readonly roomId = signal<string>('');
  readonly currentRoomMode = computed(() => this.singlePlayerMode ? 'single' : (this.rawState() as any)?.mode || 'single');
  readonly hostId = computed(() => this.host());
  readonly playersList = computed<any[]>(() => this.players());
  readonly readyPlayers = computed<Record<string, boolean>>(() => (this.rawState() as any)?.readyPlayers || {});

  status = computed<'waiting' | 'starting' | 'playing' | 'finished'>(() => {
    if (this.singlePlayerMode) return this.localStatus();
    return this.rawState()?.status || 'waiting';
  });

  digitLength = computed<number>(() => {
    if (this.singlePlayerMode) return this.localDigitLength();
    return this.rawState()?.digitLength || 4;
  });

  winners = computed<string[]>(() => {
    if (this.singlePlayerMode) return this.localFinished() ? [this.myPlayerId()] : [];
    return this.rawState()?.winners || [];
  });

  // Returns all player states as an array
  players = computed<PlayerState[]>(() => {
    if (this.singlePlayerMode) {
      return [{
        id: this.myPlayerId(),
        guesses: this.localGuesses(),
        finished: this.localFinished()
      }];
    }

    const st = this.rawState();
    if (!st || !st.players) return [];

    if (Array.isArray(st.players)) {
      return st.players;
    } else {
      return Object.values(st.players);
    }
  });

  // Returns my player state specifically
  myState = computed<PlayerState | null>(() => {
    const all = this.players();
    return all.find(p => p.id === this.myPlayerId()) || null;
  });

  // Returns opponent player states specifically (assuming 1v1 PK Speed)
  opponentState = computed<PlayerState | null>(() => {
    if (this.singlePlayerMode) return null;
    const all = this.players();
    return all.find(p => p.id !== this.myPlayerId()) || null;
  });

  host = computed<string>(() => {
    if (this.singlePlayerMode) return this.myPlayerId();
    return this.ws.gameState()?.host || '';
  });

  constructor() {
    // Play sounds on guess update or win
    let lastGuessCount = 0;
    effect(() => {
      const myGuesses = this.myState()?.guesses || [];
      if (myGuesses.length > lastGuessCount) {
        const last = myGuesses[myGuesses.length - 1];
        if (last.a === this.digitLength()) {
          this.audio.playPuzzle('success');
          // Log stats on win
          if (this.singlePlayerMode) {
            this.statsService.submitStat('codebreaker', {
              mode: 'single',
              difficulty: this.difficulty(),
              score: myGuesses.length,
              time: 0,
              won: true
            }).subscribe();
          }
        } else {
          this.audio.playPuzzle('error'); // play a neutral feedback sound
        }
        lastGuessCount = myGuesses.length;
      }
    });
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.roomId.set(roomId);
    const playerId = this.auth.currentUser()?.username || this.auth.guestId;
    this.myPlayerId.set(playerId);
    this.difficulty.set(difficulty);
    this.singlePlayerMode = mode === 'single';

    if (this.singlePlayerMode) {
      let len = 4;
      if (difficulty === 'easy') len = 3;
      else if (difficulty === 'hard') len = 5;

      this.localDigitLength.set(len);
      this.localGuesses.set([]);
      this.localFinished.set(false);
      this.localStatus.set('playing');
      this.localSecretCode = this.generateSecret(len);
      console.log('[Dev Secret Code]:', this.localSecretCode);
    } else {
      const cleanHostId = hostId === 'undefined' || hostId === undefined ? '' : hostId;
      this.ws.connect('codebreaker', roomId, playerId, mode, difficulty, cleanHostId);
    }
  }

  /** @deprecated Use joinRoom() instead */
  init(mode: string, difficulty: string, roomId: string, playerId: string, hostId: string) {
    this.joinRoom(roomId, mode, difficulty, hostId);
  }

  leaveRoom() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'leave_game' });
      this.ws.disconnect('codebreaker');
    }
    this.roomId.set('');
  }

  /** @deprecated Use leaveRoom() instead */
  destroy() {
    this.leaveRoom();
  }

  startGame() {
    if (this.singlePlayerMode) {
      const len = this.localDigitLength();
      this.localGuesses.set([]);
      this.localFinished.set(false);
      this.localStatus.set('playing');
      this.localSecretCode = this.generateSecret(len);
      console.log('[Dev Secret Code]:', this.localSecretCode);
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  restartGame() {
    this.startGame();
  }

  getSecretCode(): string {
    return this.localSecretCode;
  }

  restoreSave(secretCode: string, guesses: GuessRecord[]) {
    this.localSecretCode = secretCode;
    this.localGuesses.set(guesses);
    this.localStatus.set('playing');
    this.localFinished.set(false);
  }

  submitGuess(guess: string) {
    if (this.status() !== 'playing') return;

    if (this.singlePlayerMode) {
      if (guess.length !== this.digitLength() || !this.isUnique(guess)) {
        return;
      }
      const a = this.calculateA(guess);
      const b = this.calculateB(guess, a);
      const record: GuessRecord = {
        guess,
        a,
        b,
        timestamp: new Date().toISOString()
      };
      this.localGuesses.update(arr => [...arr, record]);

      if (a === this.digitLength()) {
        this.localFinished.set(true);
        this.localStatus.set('finished');
      }
    } else {
      this.ws.send({ action: 'guess', guess });
    }
  }

  dismissRoom() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'dismiss_room' });
    }
  }

  kickPlayer(playerId: string) {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'cancel_ready' });
    }
  }

  private isUnique(str: string): boolean {
    const seen = new Set();
    for (const char of str) {
      if (seen.has(char)) return false;
      seen.add(char);
    }
    return true;
  }

  private generateSecret(len: number): string {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, len).join('');
  }

  private calculateA(guess: string): number {
    let a = 0;
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === this.localSecretCode[i]) {
        a++;
      }
    }
    return a;
  }

  private calculateB(guess: string, aCount: number): number {
    let matches = 0;
    for (let i = 0; i < guess.length; i++) {
      if (this.localSecretCode.includes(guess[i])) {
        matches++;
      }
    }
    return matches - aCount;
  }

  applyHint(): { success: boolean; pos?: number; val?: string; message?: string } {
    if (!this.singlePlayerMode || this.status() !== 'playing') {
      return { success: false, message: 'game.hint_unavailable' };
    }
    
    // Pick a random index
    const idx = Math.floor(Math.random() * this.digitLength());
    const val = this.localSecretCode[idx];
    return { success: true, pos: idx, val, message: 'game.hint_result' };
  }
}
