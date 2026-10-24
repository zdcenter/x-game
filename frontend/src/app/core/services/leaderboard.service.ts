import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  best_time: number;
  best_score: number;
  play_count: number;
  win_count: number;
  rating: number;
  is_current_user: boolean;
  xp?: number;
  level?: number;
  brain_coins?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
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
    options: { mode?: string; difficulty?: string; type?: string; period?: string; page?: number; limit?: number } = {}
  ): Observable<LeaderboardResponse> {
    const params: Record<string, string> = {};
    if (options.mode)       params['mode'] = options.mode;
    if (options.difficulty) params['difficulty'] = options.difficulty;
    if (options.type)       params['type'] = options.type;
    if (options.period)     params['period'] = options.period ?? 'all';
    if (options.page)       params['page'] = String(options.page);
    params['limit'] = String(options.limit ?? 20);
    return this.http.get<LeaderboardResponse>(`${this.apiUrl}/leaderboard/${gameId}`, { params });
  }

  getMyRanks(): Observable<RankEntry[]> {
    return this.http.get<{ ranks: RankEntry[] }>(`${this.apiUrl}/leaderboard/my-ranks`)
      .pipe(map(r => r.ranks ?? []));
  }

  private worldRecordCache = new Map<string, { data: { bestScore: number; username: string } | null; ts: number }>();

  getWorldRecord(gameId: string, mode?: string): Observable<{ bestScore: number; username: string } | null> {
    const cacheKey = `${gameId}:${mode || 'all'}`;
    const cached = this.worldRecordCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < 60000) {
      return of(cached.data);
    }

    const opts: { mode?: string; limit: number } = { limit: 1 };
    if (mode) opts.mode = mode;

    return this.getLeaderboard(gameId, opts).pipe(
      map(res => {
        if (res && res.entries && res.entries.length > 0 && res.entries[0].best_score > 0) {
          const top = res.entries[0];
          const rec = {
            bestScore: top.best_score,
            username: top.username || 'Top Player'
          };
          this.worldRecordCache.set(cacheKey, { data: rec, ts: now });
          return rec;
        }
        this.worldRecordCache.set(cacheKey, { data: null, ts: now });
        return null;
      }),
      catchError(() => of(cached ? cached.data : null))
    );
  }
}
