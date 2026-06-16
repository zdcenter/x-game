import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DailyChallenge {
  id: number;
  date: string;
  game_id: string;
  mode: string;
  difficulty: string;
  puzzle_id?: number;
  config: string;
  is_active: boolean;
}

export interface DailyChallengeCompletion {
  id: number;
  user_id: number;
  daily_challenge_id: number;
  completed_at: string;
  score: number;
  time_taken: number;
  xp_earned: number;
}

export interface TodayChallengeResponse {
  challenge: DailyChallenge | null;
  is_completed?: boolean;
  completion?: DailyChallengeCompletion;
}

// Raw shape from backend (UserDailyChallenge + nested Challenge)
interface RawHistoryItem {
  id: number;
  user_id: number;
  daily_challenge_id: number;
  completed_at: string;
  score: number;
  time_taken: number;
  xp_earned: number;
  challenge: {
    id: number;
    date: string;
    game_id: string;
    mode: string;
    difficulty: string;
  };
}

export interface DailyChallengeHistory {
  id: number;
  date: string;
  game_id: string;
  difficulty: string;
  score: number;
  time_taken: number;
  xp_earned: number;
  completed_at: string;
}

@Injectable({ providedIn: 'root' })
export class DailyChallengeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getToday(): Observable<TodayChallengeResponse> {
    return this.http.get<TodayChallengeResponse>(`${this.apiUrl}/daily-challenge`);
  }

  finish(score: number, timeTaken: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/daily-challenge/finish`, { score, time_taken: timeTaken });
  }

  getHistory(): Observable<DailyChallengeHistory[]> {
    return this.http.get<{ history: RawHistoryItem[] }>(`${this.apiUrl}/daily-challenge/history`)
      .pipe(map(r => (r.history ?? []).map(item => ({
        id:          item.id,
        date:        item.challenge?.date       ?? '',
        game_id:     item.challenge?.game_id    ?? '',
        difficulty:  item.challenge?.difficulty ?? '',
        score:       item.score,
        time_taken:  item.time_taken,
        xp_earned:   item.xp_earned,
        completed_at: item.completed_at,
      }))));
  }

  secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }

  formatCountdown(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
