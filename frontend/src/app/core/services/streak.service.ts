import { Injectable } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({ providedIn: 'root' })
export class StreakService {
  private key(gameId: string) { return `ppk_streak_${gameId}`; }

  recordResult(gameId: string, isWin: boolean): number {
    if (!isBrowser()) return 0;
    const prev = parseInt(localStorage.getItem(this.key(gameId)) || '0', 10);
    const next = isWin ? prev + 1 : 0;
    localStorage.setItem(this.key(gameId), String(next));
    return next;
  }

  getStreak(gameId: string): number {
    if (!isBrowser()) return 0;
    return parseInt(localStorage.getItem(this.key(gameId)) || '0', 10);
  }
}
