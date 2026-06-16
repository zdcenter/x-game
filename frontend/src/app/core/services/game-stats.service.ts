import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UserGameStat {
  ID: number;
  UserID: number;
  GameID: string;
  Mode: string;
  Difficulty: string;
  BestScore: number;
  BestTime: number; // in seconds
  PlayCount: number;
  WinCount: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface SubmitStatRequest {
  mode: string;
  difficulty: string;
  score: number;
  time: number;
  won: boolean;
}

export interface XPResult {
  xp_earned: number;
  xp: number;
  level: number;
  leveled_up: boolean;
}

export interface Achievement {
  id: string;
  category: string;
  title_key: string;
  desc_key: string;
  icon_emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  unlocked_at?: string;
}

export interface SubmitStatResponse {
  message: string;
  stat: UserGameStat;
  isNewRecord: boolean;
  xp_result?: XPResult;
  new_achievements?: Achievement[];
}

@Injectable({
  providedIn: 'root'
})
export class GameStatsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getStats(gameId: string): Observable<UserGameStat[]> {
    return this.http.get<{ stats: UserGameStat[] }>(`${this.apiUrl}/stats/${gameId}`)
      .pipe(map(res => res.stats));
  }

  getAllStats(): Observable<UserGameStat[]> {
    return this.getStats('all');
  }

  submitStat(gameId: string, payload: SubmitStatRequest): Observable<SubmitStatResponse> {
    return this.http.post<SubmitStatResponse>(`${this.apiUrl}/stats/${gameId}`, payload);
  }

  getMatchHistory(options: { limit?: number; gameId?: string; mode?: string } = {}): Observable<any[]> {
    const params: Record<string, string> = {};
    if (options.limit)  params['limit']  = String(options.limit);
    if (options.gameId) params['gameId'] = options.gameId;
    if (options.mode)   params['mode']   = options.mode;
    return this.http.get<{ history: any[] }>(`${this.apiUrl}/history`, { params })
      .pipe(map(r => r.history ?? []));
  }
}
