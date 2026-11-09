import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { OfflineSyncService } from './offline-sync.service';
import { CoinService } from './coin.service';
import { XpService } from './xp.service';

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
  used_hint?: boolean;
  bounty_coins?: number;
  room_id?: string;
  opponent_username?: string;
  opponent_score?: number;
  opponent_time?: number;
}

export interface PKBattlePlayer {
  id: number;
  username: string;
  avatar: string;
  level: number;
  role: string;
}

export interface PKBattle {
  id: number;
  room_id: string;
  game_id: string;
  mode: string;
  difficulty: string;
  winner_id: number;
  winner?: PKBattlePlayer;
  winner_score: number;
  winner_time: number;
  loser_id: number;
  loser?: PKBattlePlayer;
  loser_score: number;
  loser_time: number;
  margin: number;
  bounty_coins: number;
  played_at: string;
}

export interface MyPKStatsSummary {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_bounty_won: number;
}

export interface GameDifficultyRecord {
  difficulty: string;
  user_id: number;
  username: string;
  avatar: string;
  level: number;
  best_time: number;
  best_score: number;
  rating: number;
  rank_type: 'time' | 'score';
  achieved_at: string;
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
  coins_earned?: number;
  bounty_prize?: number;
  brain_coins?: number;
  new_achievements?: Achievement[];
}

@Injectable({
  providedIn: 'root'
})
export class GameStatsService {
  private http = inject(HttpClient);
  private offlineSync = inject(OfflineSyncService);
  private coinService = inject(CoinService);
  private xpService = inject(XpService);
  private apiUrl = environment.apiUrl;

  getStats(gameId: string): Observable<UserGameStat[]> {
    return this.http.get<{ stats: UserGameStat[] }>(`${this.apiUrl}/stats/${gameId}`)
      .pipe(map(res => res.stats));
  }

  getAllStats(): Observable<UserGameStat[]> {
    return this.getStats('all');
  }

  submitStat(gameId: string, payload: SubmitStatRequest): Observable<SubmitStatResponse> {
    if (this.offlineSync.isOffline()) {
      return of(this.offlineSync.queueStat(gameId, payload));
    }

    return this.http.post<SubmitStatResponse>(`${this.apiUrl}/stats/${gameId}`, payload).pipe(
      tap(res => {
        if (res.brain_coins !== undefined) {
          this.coinService.setCoins(res.brain_coins);
        }
        if (res.coins_earned && res.coins_earned > 0) {
          this.coinService.showCoinGain(res.coins_earned);
        }
        if (res.xp_result?.xp_earned) {
          this.xpService.showXpGain(res.xp_result.xp_earned);
        }
      }),
      catchError(err => {
        // Fallback for offline/timeout/unreachable: queue locally
        return of(this.offlineSync.queueStat(gameId, payload));
      })
    );
  }

  getMatchHistory(options: { limit?: number; gameId?: string; mode?: string } = {}): Observable<any[]> {
    const params: Record<string, string> = {};
    if (options.limit)  params['limit']  = String(options.limit);
    if (options.gameId) params['gameId'] = options.gameId;
    if (options.mode)   params['mode']   = options.mode;
    return this.http.get<{ history: any[] }>(`${this.apiUrl}/history`, { params })
      .pipe(map(r => r.history ?? []));
  }

  getRecentPKBattles(limit: number = 15): Observable<PKBattle[]> {
    return this.http.get<{ battles: PKBattle[] }>(`${this.apiUrl}/pk/recent?limit=${limit}`)
      .pipe(map(res => res.battles || []));
  }

  getMyPKBattles(page: number = 1, limit: number = 15, gameId?: string, result?: string): Observable<{ battles: PKBattle[]; total: number; summary: MyPKStatsSummary }> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (gameId && gameId !== 'all') params['gameId'] = gameId;
    if (result && result !== 'all') params['result'] = result;
    return this.http.get<{ battles: PKBattle[]; total: number; summary: MyPKStatsSummary }>(`${this.apiUrl}/pk/my-battles`, { params });
  }

  getGameDifficultyRecords(gameId: string): Observable<{ game_id: string; rank_type: string; records: GameDifficultyRecord[] }> {
    return this.http.get<{ game_id: string; rank_type: string; records: GameDifficultyRecord[] }>(`${this.apiUrl}/leaderboard/game-records?gameId=${gameId}`);
  }
}
