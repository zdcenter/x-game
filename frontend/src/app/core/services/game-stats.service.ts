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

export interface SubmitStatResponse {
  message: string;
  stat: UserGameStat;
  isNewRecord: boolean;
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
}
