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
  template: `
    @if (achievementService.pendingUnlocks()[0]; as achievement) {
      <div class="fixed inset-0 z-[500] flex items-end justify-center pb-8 px-4 pointer-events-none">
        <div class="achieve-in w-full max-w-sm pointer-events-auto">
          <div class="relative rounded-2xl border shadow-2xl overflow-hidden"
               [class]="achievementService.rarityColor(achievement.rarity) + ' ' + achievementService.rarityGlow(achievement.rarity)">

            <!-- Shimmer bar top -->
            <div class="absolute top-0 left-0 right-0 h-0.5 shimmer"
                 [ngClass]="shimmerColor(achievement.rarity)"></div>

            <div class="flex items-center gap-4 p-4">
              <!-- Icon -->
              <div class="w-16 h-16 rounded-xl flex items-center justify-center text-4xl flex-shrink-0
                          border shadow-inner"
                   [ngClass]="iconBg(achievement.rarity)">
                {{ achievement.icon_emoji }}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">
                  {{ i18n.t('achievement.unlocked')() }}
                </p>
                <h3 class="font-black text-lg leading-tight truncate">
                  {{ i18n.t(achievement.title_key)() || achievement.title_key }}
                </h3>
                <p class="text-xs opacity-60 mt-0.5 truncate">
                  {{ i18n.t(achievement.desc_key)() || achievement.desc_key }}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full border opacity-80"
                        [ngClass]="rarityBadge(achievement.rarity)">
                    {{ i18n.t('achievement.rarity.' + achievement.rarity)() }}
                  </span>
                  <span class="text-xs font-bold text-[var(--color-accent-to)]">
                    +{{ achievement.xp_reward }} XP
                  </span>
                </div>
              </div>

              <!-- Dismiss button -->
              <button
                (click)="dismiss()"
                class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full
                       bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold">
                ✕
              </button>
            </div>

            <!-- Countdown progress bar -->
            <div class="h-0.5 mx-4 mb-3 rounded-full bg-white/10 overflow-hidden">
              <div class="h-full rounded-full countdown-bar"
                   [ngClass]="shimmerColor(achievement.rarity)"
                   [style.animation-duration]="duration() + 'ms'">
              </div>
            </div>

            <!-- Queue indicator -->
            @if (achievementService.pendingUnlocks().length > 1) {
              <div class="px-4 pb-3 -mt-2">
                <p class="text-[10px] opacity-50 text-center">
                  +{{ achievementService.pendingUnlocks().length - 1 }} more
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
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
