import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { GuessRecord } from './codebreaker.store';

export enum CodebreakerActionType {
  Guess = 'guess',
  Restore = 'restore'
}

export type CodebreakerAction =
  | { type: CodebreakerActionType.Guess, guess: string }
  | { type: CodebreakerActionType.Restore, secretCode: string, guesses: GuessRecord[] };

export class LocalCodebreakerEngine implements ILocalEngine<any, CodebreakerAction> {
  status: GameStatusType = GameStatus.Waiting;
  guesses: GuessRecord[] = [];
  digitLength: number = 4;
  secretCode: string = '';
  finished: boolean = false;
  playerId: string = '';
  difficulty: string = GameDifficulty.Medium;

  private onWin?: () => void;
  private onWrong?: () => void;

  initGame(config: { playerId: string, difficulty: string, digitLength: number, onWin?: () => void, onWrong?: () => void }) {
    this.playerId = config.playerId;
    this.difficulty = config.difficulty;
    this.digitLength = config.digitLength;
    this.onWin = config.onWin;
    this.onWrong = config.onWrong;

    this.guesses = [];
    this.finished = false;
    this.status = GameStatus.Playing;
    this.secretCode = this.generateSecret(this.digitLength);
  }

  getState() {
    return this;
  }

  handleAction(action: CodebreakerAction) {
    if (action.type === CodebreakerActionType.Restore) {
      this.secretCode = action.secretCode;
      this.guesses = action.guesses;
      this.status = GameStatus.Playing;
      this.finished = false;
      return;
    }

    if (this.status !== GameStatus.Playing) return;

    if (action.type === CodebreakerActionType.Guess) {
      const guess = action.guess;
      if (guess.length !== this.digitLength || !this.isUnique(guess)) return;

      const a = this.calculateA(guess);
      const b = this.calculateB(guess, a);
      const record: GuessRecord = {
        guess,
        a,
        b,
        timestamp: new Date().toISOString()
      };
      
      this.guesses = [...this.guesses, record];

      if (a === this.digitLength) {
        this.finished = true;
        this.status = GameStatus.Finished;
        if (this.onWin) this.onWin();
      } else {
        if (this.onWrong) this.onWrong();
      }
    }
  }

  applyHint(): { success: boolean; pos?: number; val?: string; message?: string } {
    if (this.status !== GameStatus.Playing) {
      return { success: false, message: 'game.hint_unavailable' };
    }
    const idx = Math.floor(Math.random() * this.digitLength);
    const val = this.secretCode[idx];
    return { success: true, pos: idx, val, message: 'game.hint_result' };
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
      if (guess[i] === this.secretCode[i]) {
        a++;
      }
    }
    return a;
  }

  private calculateB(guess: string, aCount: number): number {
    let matches = 0;
    for (let i = 0; i < guess.length; i++) {
      if (this.secretCode.includes(guess[i])) {
        matches++;
      }
    }
    return matches - aCount;
  }
}
