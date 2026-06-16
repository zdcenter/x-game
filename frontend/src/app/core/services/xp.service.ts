import { Injectable, signal } from '@angular/core';

export interface LevelProgress {
  level: number;
  xp: number;
  current: number;
  total: number;
  pct: number;
}

@Injectable({ providedIn: 'root' })
export class XpService {
  readonly pendingXpGain = signal<{ amount: number } | null>(null);

  showXpGain(amount: number): void {
    this.pendingXpGain.set({ amount });
    setTimeout(() => this.pendingXpGain.set(null), 2500);
  }

  calcLevel(xp: number): number {
    if (xp <= 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return (level - 1) * (level - 1) * 100;
  }

  levelProgress(xp: number): LevelProgress {
    const level = this.calcLevel(xp);
    const start = this.xpForLevel(level);
    const end = this.xpForLevel(level + 1);
    const current = xp - start;
    const total = end - start;
    return { level, xp, current, total, pct: total > 0 ? Math.round((current / total) * 100) : 0 };
  }

  levelColor(level: number): string {
    if (level >= 50) return 'text-yellow-300 border-yellow-400/50 bg-yellow-400/20';
    if (level >= 20) return 'text-purple-300 border-purple-400/50 bg-purple-400/20';
    if (level >= 10) return 'text-blue-300 border-blue-400/50 bg-blue-400/20';
    return 'text-green-300 border-green-400/50 bg-green-400/20';
  }
}
