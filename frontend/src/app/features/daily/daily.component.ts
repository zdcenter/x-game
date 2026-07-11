import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DailyChallengeService, TodayChallengeResponse, DailyChallengeHistory } from '../../core/services/daily-challenge.service';
import { AuthStore } from '../../core/auth/auth.store';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';

@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-5xl mx-auto flex flex-col gap-6">

        <!-- Header -->
        <div class="flex items-center gap-3 border-b border-[var(--color-border-card)] pb-5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-2xl shadow-lg animate-pulse">
            📅
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]">
              {{ i18n.t('daily.title')() }}
            </h1>
            <p class="text-sm text-[var(--color-text-muted)]">{{ i18n.t('daily.subtitle')() }}</p>
          </div>
        </div>

        <!-- Today's Challenge Card -->
        @if (todayData()) {
          @if (todayData()!.challenge; as ch) {
            <div class="relative bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden shadow-xl">
              <!-- Background emoji decoration -->
              <div class="absolute -right-6 -bottom-6 text-[10rem] opacity-[0.04] pointer-events-none select-none">
                {{ getGameEmoji(ch.game_id) }}
              </div>

              <div class="relative z-10 p-6 flex flex-col gap-5">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-accent-from)] mb-1 block">
                      {{ i18n.t('daily.today')() }}
                    </span>
                    <h2 class="text-xl font-black text-[var(--color-text-main)]">
                      {{ getGameName(ch.game_id) }}
                    </h2>
                    <p class="text-sm text-[var(--color-text-muted)] mt-1">
                      {{ ch.difficulty }} · {{ ch.mode }}
                    </p>
                  </div>
                  <span class="text-5xl">{{ getGameEmoji(ch.game_id) }}</span>
                </div>

                <!-- XP reward badge -->
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1.5 rounded-xl bg-[var(--color-accent-to)]/20 text-[var(--color-accent-to)] font-bold text-sm border border-[var(--color-accent-to)]/30">
                    +30 XP {{ i18n.t('daily.xp_reward')() }}
                  </span>
                  @if (todayData()!.is_completed) {
                    <span class="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 font-bold text-sm border border-green-500/30">
                      ✓ {{ i18n.t('daily.already_done')() }}
                    </span>
                  }
                </div>

                <!-- Countdown -->
                @if (!todayData()!.is_completed) {
                  <div class="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
                    <span>⏱️</span>
                    <span>{{ i18n.t('daily.next_in')() }}: <span class="font-mono font-black text-[var(--color-text-main)]">{{ countdown() }}</span></span>
                  </div>
                  <a [routerLink]="['/', i18n.currentLang(), 'games', ch.game_id]"
                     [queryParams]="{ dailyChallengeId: ch.id, difficulty: ch.difficulty }"
                     class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-white text-base
                            bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                            shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                    🎮 {{ i18n.t('daily.go_play')() }}
                  </a>
                } @else {
                  <div class="w-full py-3 text-center text-green-400 font-bold text-base bg-green-500/10 rounded-xl border border-green-500/20">
                    🎉 {{ i18n.t('daily.complete')() }}
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <div class="flex flex-col items-center justify-center h-40 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        }

        <!-- History Section -->
        @if (authStore.isAuthenticated()) {
          <div>
            <h2 class="text-lg font-black text-[var(--color-text-main)] mb-4">{{ i18n.t('daily.history')() }}</h2>

            @if (historyLoading()) {
              <div class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
              </div>
            } @else if (!history().length) {
              <div class="flex flex-col items-center justify-center h-32 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]">
                <span class="text-3xl mb-2">📭</span>
                <p class="text-sm font-bold">{{ i18n.t('daily.no_history')() }}</p>
              </div>
            } @else {
              <!-- Calendar grid -->
              <div class="grid grid-cols-7 gap-1.5">
                @for (day of calendarDays(); track day.date) {
                  <div class="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all"
                       [class]="day.completed
                         ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                         : day.isPast
                           ? 'bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-muted)] opacity-50'
                           : 'bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-muted)]'"
                       [title]="day.date">
                    @if (day.completed) {
                      <span>✓</span>
                    }
                    <span>{{ day.dayNum }}</span>
                  </div>
                }
              </div>

              <!-- History list -->
              <div class="flex flex-col gap-3 mt-5">
                @for (h of history(); track h.id) {
                  <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                    <span class="text-2xl">{{ getGameEmoji(h.game_id) }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-bold text-sm text-[var(--color-text-main)]">{{ getGameName(h.game_id) }}</p>
                      <p class="text-xs text-[var(--color-text-muted)]">{{ h.date }} · {{ h.difficulty }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-0.5">
                      <span class="text-xs font-bold text-[var(--color-accent-to)]">+{{ h.xp_earned }} XP</span>
                      @if (h.score) {
                        <span class="text-xs text-[var(--color-text-muted)] font-mono">{{ h.score }} pts</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
            <p class="text-[var(--color-text-muted)] font-bold">{{ i18n.t('daily.login_for_history')() }}</p>
            <a routerLink="/login" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm">
              {{ i18n.t('auth.login')() }}
            </a>
          </div>
        }
      </div>
    </div>
  `
})
export class DailyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private dailyService = inject(DailyChallengeService);

  todayData = signal<TodayChallengeResponse | null>(null);
  history = signal<DailyChallengeHistory[]>([]);
  historyLoading = signal(false);
  countdown = signal('00:00:00');

  private timer?: ReturnType<typeof setInterval>;

  calendarDays = computed(() => {
    const completed = new Set(this.history().map(h => h.date));
    const now = new Date();
    const days: { date: string; dayNum: number; completed: boolean; isPast: boolean }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        dayNum: d.getDate(),
        completed: completed.has(dateStr),
        isPast: i > 0,
      });
    }
    return days;
  });

  ngOnInit(): void {
    this.dailyService.getToday().subscribe(r => this.todayData.set(r));

    if (this.authStore.isAuthenticated()) {
      this.historyLoading.set(true);
      this.dailyService.getHistory().subscribe({
        next: h => { this.history.set(h); this.historyLoading.set(false); },
        error: () => this.historyLoading.set(false),
      });
    }

    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private updateCountdown(): void {
    this.countdown.set(this.dailyService.formatCountdown(this.dailyService.secondsUntilMidnight()));
  }

  getGameEmoji(id: string): string {
    return GAME_DEFINITIONS.find(g => g.id === id)?.iconEmoji ?? '🎮';
  }

  getGameName(id: string): string {
    const g = GAME_DEFINITIONS.find(g => g.id === id);
    return g ? (this.i18n.t(g.titleKey)() || id) : id;
  }
}
