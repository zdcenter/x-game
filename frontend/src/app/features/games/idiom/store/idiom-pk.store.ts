import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameId, GameMode } from '../../../../core/models/game.model';
import { C2SAction } from '../../../../core/models/websocket.model';
import { AudioService } from '../../../../core/services/audio.service';

export interface IdiomPKPlayerState {
  id: string;
  last_wrong: boolean;
  attempts: number;
  correct: boolean;
  wrong_count: number;
  locked: boolean;
}

export interface IdiomPKState {
  status: string | number;
  current_word: string;
  display: string[];
  keyboard: string[];
  players: Record<string, IdiomPKPlayerState>;
  round_winner: string;
  winners: string[];
  wins: Record<string, number>;
  target: number;
  round_num: number;
  difficulty: string;
}

@Injectable()
export class IdiomPKStore extends BaseGameStore {
  readonly gameId = GameId.Idiom;

  // PK store has no single-player mode; stub required abstract member
  override readonly singlePlayerStatus = computed<string>(() => 'waiting');

  private audio = inject(AudioService);

  private get pkState(): IdiomPKState | null {
    return this.rawState() as IdiomPKState | null;
  }

  display = computed<string[]>(() => this.pkState?.display ?? []);
  keyboard = computed<string[]>(() => this.pkState?.keyboard ?? []);
  currentWord = computed<string>(() => this.pkState?.current_word ?? '');
  roundWinner = computed<string>(() => this.pkState?.round_winner ?? '');
  wins = computed<Record<string, number>>(() => this.pkState?.wins ?? {});
  target = computed<number>(() => this.pkState?.target ?? 3);
  roundNum = computed<number>(() => this.pkState?.round_num ?? 0);

  players = computed<IdiomPKPlayerState[]>(() => {
    const st = this.pkState;
    if (!st?.players) return [];
    return Object.values(st.players);
  });

  myState = computed<IdiomPKPlayerState | null>(() =>
    this.players().find(p => p.id === this.playerId()) ?? null
  );

  opponentState = computed<IdiomPKPlayerState | null>(() =>
    this.players().find(p => p.id !== this.playerId()) ?? null
  );

  myWins = computed<number>(() => this.wins()[this.playerId()] ?? 0);
  opponentWins = computed<number>(() => {
    const w = this.wins();
    return Object.entries(w).find(([id]) => id !== this.playerId())?.[1] ?? 0;
  });

  isRoundOver = computed<boolean>(() => this.roundWinner() !== '');
  iWonRound = computed<boolean>(() => this.roundWinner() === this.playerId());

  constructor() {
    super();
    let lastRoundNum = 0;
    let lastRoundWinner = '';
    effect(() => {
      const rw = this.roundWinner();
      const rn = this.roundNum();
      if (rw && rw !== lastRoundWinner) {
        lastRoundWinner = rw;
        if (rw === this.playerId()) {
          this.audio.playPuzzle('success');
        } else {
          this.audio.playPuzzle('error');
        }
      }
      if (rn > lastRoundNum && rn > 0 && !rw) {
        lastRoundNum = rn;
      }
    });
  }

  submitFillAnswer(answer: string[]) {
    this.ws.send({ action: C2SAction.Input, answer });
  }
}
