import { GameDifficulty, GameId, GameMode, GameStatus } from "../../../../core/models/game.model";
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AudioService } from '../../../../core/services/audio.service';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalCodebreakerEngine, CodebreakerActionType } from './codebreaker-engine';
import { ResumeGameService } from '../../../../core/services/resume-game.service';

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
	status: number | string;
	difficulty: string;
	digitLength: number;
	players: Record<string, PlayerState> | PlayerState[];
	winners: string[];
}

@Injectable()
export class CodebreakerStore extends BaseGameStore {
  readonly gameId = GameId.Codebreaker;

  private audio = inject(AudioService);
  private resumeService = inject(ResumeGameService);

  private localEngine = signal<LocalCodebreakerEngine | null>(null);
  private tick = signal(0);

  digitLength = computed<number>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.digitLength || 4;
    }
    return (this.rawState() as CodebreakerState)?.digitLength || 4;
  });

  override readonly singlePlayerWinners = computed(() => {
    this.tick();
    return this.localEngine()?.finished ? [this.playerId()] : [];
  });

  override readonly singlePlayerStatus = computed<string>(() => {
    this.tick();
    return String(this.localEngine()?.status || 'waiting');
  });

  players = computed<PlayerState[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      const eng = this.localEngine();
      return [{
        id: this.playerId(),
        guesses: eng?.guesses || [],
        finished: eng?.finished || false
      }];
    }

    const st = this.rawState() as CodebreakerState;
    if (!st || !st.players) return [];

    if (Array.isArray(st.players)) {
      return st.players;
    } else {
      return Object.values(st.players);
    }
  });

  myState = computed<PlayerState | null>(() => {
    return this.players().find(p => p.id === this.playerId()) || null;
  });

  opponentState = computed<PlayerState | null>(() => {
    if (this.currentRoomMode() === GameMode.Single) return null;
    return this.players().find(p => p.id !== this.playerId()) || null;
  });

  constructor() {
    super();
    let lastGuessCount = 0;
    effect(() => {
      // In multiplayer, watch for guesses to play sounds
      if (this.currentRoomMode() !== GameMode.Single) {
        const myGuesses = this.myState()?.guesses || [];
        if (myGuesses.length > lastGuessCount) {
          const last = myGuesses[myGuesses.length - 1];
          if (last.a === this.digitLength()) {
            this.audio.playPuzzle('success');
          } else {
            this.audio.playPuzzle('error');
          }
          lastGuessCount = myGuesses.length;
        }
      }
    });
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      let len = 4;
      const diff = this.currentDifficulty();
      if (diff === GameDifficulty.Easy) len = 3;
      else if (diff === GameDifficulty.Hard) len = 5;

      const engine = new LocalCodebreakerEngine();
      engine.initGame({
        playerId: this.playerId(),
        difficulty: diff as string,
        digitLength: len,
        onWin: () => {
          this.resumeService.clearSession('codebreaker');
          this.audio.playPuzzle('success');
          this.submitSinglePlayerStats();
          this.tick.set(this.tick() + 1);
        },
        onWrong: () => {
          this.audio.playPuzzle('error');
          this.tick.set(this.tick() + 1);
        }
      });
      this.localEngine.set(engine);
      this.tick.set(this.tick() + 1);
    } else {
      super.startGame();
    }
  }

  override joinRoom(
    roomId: string,
    mode: string = GameMode.Single,
    difficulty: string = GameDifficulty.Medium,
    hostId?: string,
    target: number = 1,
    password: string = '',
    bounty: number = 0,
    isSpectator: boolean = false
  ) {
    super.joinRoom(roomId, mode, difficulty, hostId, target, password, bounty, isSpectator);
    if (mode === GameMode.Single) {
      this.startGame(); // Auto start in single player for codebreaker
    }
  }

  getSecretCode(): string {
    return this.localEngine()?.secretCode || '';
  }

  restoreSave(secretCode: string, guesses: GuessRecord[]) {
    if (this.currentRoomMode() === GameMode.Single && this.localEngine()) {
      this.localEngine()!.handleAction({ type: CodebreakerActionType.Restore, secretCode, guesses });
      this.tick.set(this.tick() + 1);
    }
  }

  restoreSavedSession(data: any): void {
    if (!data || !data.secretCode) return;
    this.currentDifficulty.set(data.difficulty || this.currentDifficulty());
    this.startGame();
    this.restoreSave(data.secretCode, data.guesses || []);
  }

  submitGuess(guess: string) {
    if (this.status() !== GameStatus.Playing) return;

    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (eng) {
        eng.handleAction({ type: CodebreakerActionType.Guess, guess });
        this.tick.set(this.tick() + 1);

        if (eng.finished) {
          this.resumeService.clearSession('codebreaker');
        } else if (eng.guesses.length > 0) {
          const maxA = Math.max(0, ...eng.guesses.map(g => g.a));
          const prog = Math.min(99, Math.round((maxA / eng.digitLength) * 100));
          this.resumeService.saveSession('codebreaker', {
            difficulty: this.currentDifficulty(),
            difficultyLabel: this.resumeService.getDifficultyLabel(this.currentDifficulty(), 'codebreaker'),
            progressPercent: prog,
            moves: eng.guesses.length,
            timeElapsed: 0,
            data: {
              difficulty: this.currentDifficulty(),
              secretCode: eng.secretCode,
              guesses: [...eng.guesses]
            }
          });
        }
      }
    } else {
      this.ws.send({ action: C2SAction.Guess, guess });
    }
  }

  applyHint(): { success: boolean; pos?: number; val?: string; message?: string } {
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (eng) {
        const res = eng.applyHint();
        if (res.success) {
          this.recordHintUsed();
        }
        return res;
      }
    }
    return { success: false, message: 'game.hint_unavailable' };
  }

  private submitSinglePlayerStats() {
    this.submitSingleStat({ score: this.localEngine()?.guesses.length || 0 }).subscribe();
  }
}
