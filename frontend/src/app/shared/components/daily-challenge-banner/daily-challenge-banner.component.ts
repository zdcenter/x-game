import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DailyChallengeService, TodayChallengeResponse } from '../../../core/services/daily-challenge.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GAME_DEFINITIONS } from '../../../core/config/game-definitions';

@Component({
  selector: 'app-daily-challenge-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (data() === null) {
      <!-- Skeleton placeholder: same height as real banner to prevent CLS -->
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] h-[80px] animate-pulse opacity-40"></div>
    } @else if (data()!.challenge; as ch) {
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]
                  overflow-hidden shadow-lg group hover:shadow-xl transition-all duration-300">
        <div class="flex items-center gap-3 p-4">
          <!-- Icon & Badge -->
          <div class="relative flex-shrink-0">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                        flex items-center justify-center text-2xl shadow-inner">
              {{ getGameEmoji(ch.game_id) }}
            </div>
            @if (data()!.is_completed) {
              <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow">✓</div>
            } @else {
              <div class="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-accent-from)] rounded-full flex items-center justify-center text-[10px] text-white font-black shadow animate-pulse">!</div>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-accent-from)]">
                {{ i18n.t('daily.title')() }}
              </span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent-to)]/20 text-[var(--color-accent-to)] font-bold">
                {{ i18n.t('daily.xp_reward')() }}
              </span>
            </div>
            <p class="font-bold text-[var(--color-text-main)] truncate text-sm">
              {{ getGameName(ch.game_id) }} · {{ ch.difficulty }}
            </p>
            @if (data()!.is_completed) {
              <p class="text-xs text-green-400 font-bold">{{ i18n.t('daily.already_done')() }}</p>
            } @else {
              <p class="text-xs text-[var(--color-text-muted)]">
                {{ i18n.t('daily.next_in')() }}: <span class="font-mono font-bold text-[var(--color-text-main)]">{{ countdown() }}</span>
              </p>
            }
          </div>

          <!-- CTA -->
          @if (!data()!.is_completed) {
            <a [routerLink]="['/games', ch.game_id]"
               [queryParams]="{ dailyChallengeId: ch.id, difficulty: ch.difficulty, puzzleId: ch.puzzle_id }"
               class="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                      text-white text-xs font-bold shadow hover:shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              {{ i18n.t('daily.go_play')() }}
            </a>
          }
        </div>
      </div>
    }
  `
})
export class DailyChallengeBannerComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private dailyService = inject(DailyChallengeService);
  private authStore = inject(AuthStore);

  data = signal<TodayChallengeResponse | null>(null);
  countdown = signal('00:00:00');

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.dailyService.getToday().subscribe(r => this.data.set(r));
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private updateCountdown(): void {
    this.countdown.set(this.dailyService.formatCountdown(this.dailyService.secondsUntilMidnight()));
  }

  getGameEmoji(gameId: string): string {
    return GAME_DEFINITIONS.find(g => g.id === gameId)?.iconEmoji ?? '🎮';
  }

  getGameName(gameId: string): string {
    const def = GAME_DEFINITIONS.find(g => g.id === gameId);
    return def ? this.i18n.t(def.titleKey)() : gameId;
  }
}
