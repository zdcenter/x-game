import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GhostChallenge {
  id: string;
  challenger_id: number;
  challenger_name: string;
  game_id: string;
  mode: string;
  difficulty: string;
  seed: string;
  target_score: number;
  target_time: number;
  accept_count: number;
  beaten_count: number;
  created_at: string;
}

export interface CreateChallengeResult {
  success: boolean;
  challenge_id: string;
  challenger_name: string;
  game_id: string;
  target_score: number;
  target_time: number;
}

export interface CompleteChallengeResult {
  success: boolean;
  beaten: boolean;
  diff: number;
  challenger_name: string;
  target_time: number;
  target_score: number;
  user_time: number;
  user_score: number;
}

@Injectable({ providedIn: 'root' })
export class GhostChallengeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  activeChallenge = signal<GhostChallenge | null>(null);

  createChallenge(payload: {
    game_id: string;
    mode?: string;
    difficulty?: string;
    seed?: string;
    target_score?: number;
    target_time?: number;
  }): Observable<CreateChallengeResult> {
    return this.http.post<CreateChallengeResult>(`${this.apiUrl}/challenges`, payload);
  }

  getChallenge(id: string): Observable<GhostChallenge> {
    return this.http.get<GhostChallenge>(`${this.apiUrl}/challenges/${id}`);
  }

  completeChallenge(id: string, payload: { score?: number; time?: number; won?: boolean }): Observable<CompleteChallengeResult> {
    return this.http.post<CompleteChallengeResult>(`${this.apiUrl}/challenges/${id}/complete`, payload);
  }
}
