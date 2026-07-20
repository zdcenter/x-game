import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  best_time: number;
  best_score: number;
  play_count: number;
  win_count: number;
  is_current_user: boolean;
  xp?: number;
  level?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  my_rank: number;
  game_id: string;
  mode: string;
  difficulty: string;
  period: string;
  type: string;
}

export interface RankEntry {
  game_id: string;
  mode: string;
  difficulty: string;
  rank: number;
  best_time: number;
  best_score: number;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getLeaderboard(
    gameId: string,
    options: { mode?: string; difficulty?: string; type?: string; period?: string; limit?: number } = {}
  ): Observable<LeaderboardResponse> {
    const params: Record<string, string> = {};
    if (options.mode)       params['mode'] = options.mode;
    if (options.difficulty) params['difficulty'] = options.difficulty;
    if (options.type)       params['type'] = options.type ?? 'time';
    if (options.period)     params['period'] = options.period ?? 'all';
    if (options.limit)      params['limit'] = String(options.limit);
    return this.http.get<LeaderboardResponse>(`${this.apiUrl}/leaderboard/${gameId}`, { params });
  }

  getMyRanks(): Observable<RankEntry[]> {
    return this.http.get<{ ranks: RankEntry[] }>(`${this.apiUrl}/leaderboard/my-ranks`)
      .pipe(map(r => r.ranks ?? []));
  }
}
