import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GameConfig {
  id: string;
  name: string;
  overview: string;
  rules: string;
  config: string;
  isActive: boolean;
  sortOrder?: number;
  visitCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GamesPage {
  games: GameConfig[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getGames(page = 1, limit = 8): Observable<GamesPage> {
    return this.http.get<GamesPage>(`${this.baseUrl}/games?page=${page}&limit=${limit}`);
  }

  /** Returns all active games as a flat array (no pagination). For internal/profile/docs use. */
  getAllGames(): Observable<GameConfig[]> {
    return this.http.get<GamesPage>(`${this.baseUrl}/games?page=1&limit=100`).pipe(
      map(res => res.games)
    );
  }

  visitGame(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/games/${id}/visit`, {});
  }
}

// Helper to extract localized string if stored as JSON (e.g. {"en":"...", "zh":"..."})
export function getLocalizedField(fieldValue: string, lang: string): string {
  if (!fieldValue) return '';
  try {
    const parsed = JSON.parse(fieldValue);
    if (parsed && typeof parsed === 'object') {
      return parsed[lang] || parsed['en'] || fieldValue;
    }
  } catch (e) {
    // Not valid JSON, return as is (fallback for existing plain text)
  }
  return fieldValue;
}
