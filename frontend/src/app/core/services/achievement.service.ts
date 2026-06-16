import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Achievement } from './game-stats.service';

export interface AchievementWithStatus extends Achievement {
  condition_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  unlocked_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly pendingUnlocks = signal<Achievement[]>([]);

  handleNewAchievements(achievements: Achievement[]): void {
    if (!achievements?.length) return;
    this.pendingUnlocks.update(list => [...list, ...achievements]);
  }

  dismissNext(): void {
    this.pendingUnlocks.update(list => list.slice(1));
  }

  getAchievements(): Observable<AchievementWithStatus[]> {
    return this.http.get<{ achievements: AchievementWithStatus[] }>(`${this.apiUrl}/achievements`)
      .pipe(map(r => r.achievements ?? []));
  }

  getMyAchievements(): Observable<AchievementWithStatus[]> {
    return this.http.get<{ achievements: AchievementWithStatus[] }>(`${this.apiUrl}/achievements/my`)
      .pipe(map(r => r.achievements ?? []));
  }

  rarityColor(rarity: string): string {
    switch (rarity) {
      case 'legendary': return 'text-yellow-300 border-yellow-400/60 bg-yellow-400/10 shadow-yellow-400/20';
      case 'epic':      return 'text-purple-300 border-purple-400/60 bg-purple-400/10 shadow-purple-400/20';
      case 'rare':      return 'text-blue-300 border-blue-400/60 bg-blue-400/10 shadow-blue-400/20';
      default:          return 'text-green-300 border-green-400/60 bg-green-400/10 shadow-green-400/20';
    }
  }

  rarityGlow(rarity: string): string {
    switch (rarity) {
      case 'legendary': return 'shadow-yellow-400/40';
      case 'epic':      return 'shadow-purple-400/40';
      case 'rare':      return 'shadow-blue-400/40';
      default:          return 'shadow-green-400/20';
    }
  }
}
