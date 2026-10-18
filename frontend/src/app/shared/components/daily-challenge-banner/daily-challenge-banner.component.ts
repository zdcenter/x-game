import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DailyQuestService, DailyQuestsResponse } from '../../../core/services/daily-quest.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-daily-challenge-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (data() === null) {
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] h-[80px] animate-pulse opacity-40"></div>
    } @else {
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]
                  overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-accent-from)]/40 transition-all duration-300 relative group">
        <div class="flex items-center gap-3 p-4">
          <!-- Icon & Progress Badge -->
          <div class="relative flex-shrink-0">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                        flex items-center justify-center text-2xl shadow-inner text-white">
              🎯
            </div>
            @if (data()!.all_completed) {
              <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow">✓</div>
            } @else {
              <div class="absolute -top-1 -right-1 px-1.5 h-4.5 min-w-[18px] bg-[var(--color-accent-from)] rounded-full flex items-center justify-center text-[10px] text-white font-black shadow">
                {{ data()!.completed_count }}/{{ data()!.total_count }}
              </div>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-from)] flex items-center gap-1">
                <span>🎯</span> {{ i18n.t('quests.title')() || '每日任务' }}
              </span>
              @if (data()!.streak > 0) {
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                  🔥 {{ data()!.streak }}天
                </span>
              }
            </div>

            <!-- Progress bar -->
            <div class="w-full h-1.5 rounded-full bg-[var(--color-bg-main)] overflow-hidden my-1">
              <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] transition-all duration-500"
                   [style.width.%]="progressPercent()"></div>
            </div>

            <p class="text-xs text-[var(--color-text-secondary)] truncate">
              @if (data()!.all_completed) {
                <span class="text-green-500 font-bold">✓ {{ i18n.t('quests.all_done')() }}</span>
              } @else {
                <span>{{ i18n.t('quests.subtitle')() }}</span>
              }
            </p>
          </div>

          <!-- CTA -->
          <a [routerLink]="['/', i18n.currentLang(), 'daily']"
             class="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                    text-white text-xs font-bold shadow hover:shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
            {{ data()!.all_completed ? (i18n.t('quests.claim')() || '查看') : (i18n.t('quests.banner_action')() || '去完成') }}
          </a>
        </div>
      </div>
    }
  `
})
export class DailyChallengeBannerComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private questService = inject(DailyQuestService);
  authStore = inject(AuthStore);

  data = signal<DailyQuestsResponse | null>(null);
  countdown = signal('00:00:00');

  private timer?: ReturnType<typeof setInterval>;

  progressPercent = computed(() => {
    const d = this.data();
    if (!d || d.total_count === 0) return 0;
    return Math.round((d.completed_count / d.total_count) * 100);
  });

  ngOnInit(): void {
    this.questService.getTodayQuests().subscribe(r => this.data.set(r));
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private updateCountdown(): void {
    this.countdown.set(this.questService.formatCountdown(this.questService.secondsUntilMidnight()));
  }
}
