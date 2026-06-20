import { Component, inject, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementService } from '../../../core/services/achievement.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-achievement-unlock-overlay',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes achieveIn {
      0%   { opacity: 0; transform: translateY(60px) scale(0.8); }
      60%  { opacity: 1; transform: translateY(-8px) scale(1.05); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 1; }
    }
    @keyframes countdown {
      from { width: 100%; }
      to   { width: 0%; }
    }
    .achieve-in  { animation: achieveIn 0.5s cubic-bezier(.22,1,.36,1) forwards; }
    .shimmer     { animation: shimmer 2s ease-in-out infinite; }
    .countdown-bar { animation: countdown linear forwards; }
  `],
  templateUrl: './achievement-unlock-overlay.component.html',
})
export class AchievementUnlockOverlayComponent implements OnDestroy {
  achievementService = inject(AchievementService);
  i18n = inject(I18nService);

  duration = signal(4000);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const achievement = this.achievementService.pendingUnlocks()[0];
      this.clearTimer();
      if (!achievement) return;

      const ms = achievement.rarity === 'legendary' ? 6000
               : achievement.rarity === 'epic'      ? 5000
               : 4000;
      this.duration.set(ms);
      this.timer = setTimeout(() => this.achievementService.dismissNext(), ms);
    });
  }

  dismiss() {
    this.clearTimer();
    this.achievementService.dismissNext();
  }

  ngOnDestroy() { this.clearTimer(); }

  private clearTimer() {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
  }

  shimmerColor(rarity: string): string {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-400';
      case 'epic':      return 'bg-purple-400';
      case 'rare':      return 'bg-blue-400';
      default:          return 'bg-green-400';
    }
  }

  iconBg(rarity: string): string {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-400/20 border-yellow-400/40';
      case 'epic':      return 'bg-purple-400/20 border-purple-400/40';
      case 'rare':      return 'bg-blue-400/20 border-blue-400/40';
      default:          return 'bg-green-400/20 border-green-400/40';
    }
  }

  rarityBadge(rarity: string): string {
    switch (rarity) {
      case 'legendary': return 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10';
      case 'epic':      return 'text-purple-300 border-purple-400/40 bg-purple-400/10';
      case 'rare':      return 'text-blue-300 border-blue-400/40 bg-blue-400/10';
      default:          return 'text-green-300 border-green-400/40 bg-green-400/10';
    }
  }
}
