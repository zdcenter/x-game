import { Injectable, inject, TransferState, makeStateKey } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GameConfig {
  id: string;
  config: string;
  isActive: boolean;
  visitCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameDoc {
  id: string;
  name: string;
  overview: string;
  rules?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface GamesPage {
  games: GameConfig[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const GAMES_DOCS_KEY = makeStateKey<GameDoc[]>('games-docs-index');

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);
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

  /**
   * SSR-safe variant: loads game docs metadata list from pre-exported static JSON.
   * Allowed by ssrNoopInterceptor (/assets/ path passes through during SSG).
   * Now loads /assets/docs/index.json (~19 KB) instead of 1.02 MB games-docs.json.
   */
  getAllGamesDocs(): Observable<GameDoc[]> {
    if (this.transferState.hasKey(GAMES_DOCS_KEY)) {
      const docs = this.transferState.get(GAMES_DOCS_KEY, []);
      return of(docs);
    }
    return this.http.get<GameDoc[]>('/assets/docs/index.json').pipe(
      catchError(() => this.http.get<GameDoc[]>('/assets/games-docs.json')),
      tap(docs => this.transferState.set(GAMES_DOCS_KEY, docs))
    );
  }

  /**
   * Loads full game documentation and multi-language rules for a single game on demand.
   * Only transfers ~20-50 KB instead of the monolithic 1.02 MB dataset.
   */
  getGameDoc(id: string): Observable<GameDoc | null> {
    const docKey = makeStateKey<GameDoc | null>(`game-doc-${id}`);
    if (this.transferState.hasKey(docKey)) {
      const doc = this.transferState.get(docKey, null);
      return of(doc);
    }
    return this.http.get<GameDoc>(`/assets/docs/${id}.json`).pipe(
      catchError(() => {
        // Fallback to legacy full games-docs.json if individual chunk fails
        return this.http.get<GameDoc[]>('/assets/games-docs.json').pipe(
          map(all => all.find(g => g.id === id) || null),
          catchError(() => of(null))
        );
      }),
      tap(doc => {
        if (doc) this.transferState.set(docKey, doc);
      })
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
