import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';

export interface CharResult {
  char: string;
  status: 'correct' | 'present' | 'absent';
}

export interface GuessRecord {
  guess_seq: number;
  guess: string;
  result: CharResult[];
}

export interface DailyStateResponse {
  keyboard: string[];
  guesses: GuessRecord[];
  is_complete: boolean;
  guess_count: number;
  hint_source: string;
  hint_meaning?: string;
  explanation?: string;
  story?: string;
  word?: string;
}

export interface DailyGuessResponse {
  result: CharResult[];
  is_win: boolean;
  guess_seq: number;
  remaining: number;
  hint_meaning?: string;
  explanation?: string;
  story?: string;
  word?: string;
}

export interface FillResponse {
  idiom_id: number;
  display: string[];   // e.g. ['破','_','沉','_']
  keyboard: string[];  // 20 chars shuffled
}

export interface IdiomXPResult {
  xp_earned: number;
  xp: number;
  level: number;
  leveled_up: boolean;
}

export interface FillSubmitResponse {
  is_correct: boolean;
  word: string;
  pinyin: string;
  explanation: string;
  story: string;
  derivation: string;
  consecutive_correct: number;
  is_mastered: boolean;
  xp_result?: IdiomXPResult;
}

export interface DiffStat {
  difficulty: 'easy' | 'medium' | 'hard';
  total: number;
  mastered: number;
  played: number;
}

export interface IdiomStats {
  total: number;
  mastered: number;
  played: number;
  by_difficulty: DiffStat[];
  today_played: number;
  today_correct: number;
}

export interface HistoryRecord {
  idiom_id: number;
  word: string;
  pinyin: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  consecutive_correct: number;
  is_mastered: boolean;
  last_result: 'correct' | 'wrong';
  last_played_at: string;
}

export interface SocialStats {
  total_players: number;
  winners: number;
}

@Injectable({ providedIn: 'root' })
export class IdiomService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/idiom`;

  getDailyState(): Observable<DailyStateResponse> {
    return this.http.get<DailyStateResponse>(`${this.base}/daily/state`);
  }

  submitDailyGuess(guess: string): Observable<DailyGuessResponse> {
    return this.http.post<DailyGuessResponse>(`${this.base}/daily/guess`, { guess });
  }

  getFill(difficulty?: string): Observable<FillResponse> {
    const url = difficulty ? `${this.base}/fill?difficulty=${difficulty}` : `${this.base}/fill`;
    return this.http.get<FillResponse>(url);
  }

  submitFill(idiomId: number, answer: string[]): Observable<FillSubmitResponse> {
    return this.http.post<FillSubmitResponse>(`${this.base}/fill/submit`, {
      idiom_id: idiomId,
      answer,
    });
  }

  getStats(): Observable<IdiomStats> {
    return this.http.get<IdiomStats>(`${this.base}/stats`);
  }

  getHistory(): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(`${this.base}/history`);
  }

  getSocialStats(): Observable<SocialStats> {
    return this.http.get<SocialStats>(`${this.base}/daily/social`);
  }
}
