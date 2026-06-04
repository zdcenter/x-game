import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GameConfig {
  id: string;
  name: string;
  overview: string;
  rules: string;
  config: string;
  isActive: boolean;
  visitCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getGames(): Observable<GameConfig[]> {
    return this.http.get<GameConfig[]>(`${this.baseUrl}/games`);
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
