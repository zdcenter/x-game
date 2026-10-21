import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DailyQuestService, DailyQuestsResponse } from '../../../core/services/daily-quest.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-daily-challenge-banner',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'h-full block' },
  template: `
    @if (data() === null) {
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-3 sm:p-4 min-h-[110px] h-full animate-pulse opacity-40"></div>
    } @else {
      <div (click)="goToDaily()"
           class="group cursor-pointer rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-3 sm:p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden h-full">
        <!-- Watermark icon in bottom-right corner -->
        <div class="absolute -right-3 -bottom-3 text-5xl sm:text-7xl opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all pointer-events-none select-none">
          🎯
        </div>

        <div>
          <!-- Header row -->
          <div class="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
              <span>🎯</span> {{ i18n.t('quests.title')() || '每日任务' }}
            </span>
            <div class="flex items-center gap-1">
              @if (data()!.streak > 0) {
                <span class="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  🔥 {{ data()!.streak }}天
                </span>
              }
              <span class="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
                    [class]="data()!.all_completed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'">
                {{ data()!.all_completed ? '✓' : (data()!.completed_count + '/' + data()!.total_count) }}
              </span>
            </div>
          </div>

          <!-- Description line-clamp-2 (no horizontal truncation!) -->
          <p class="text-[11px] sm:text-xs text-[var(--color-text-secondary)] line-clamp-2">
            @if (data()!.all_completed) {
              <span class="text-emerald-500 font-semibold">🎉 今日挑战已全部达成！积分徽章已入账</span>
            } @else {
              <span>{{ i18n.t('quests.subtitle')() || '完成每日挑战赢得丰厚积分与专属成就徽章！' }}</span>
            }
          </p>

          <!-- Sleek Progress Bar -->
          <div class="w-full h-1.5 rounded-full bg-[var(--color-bg-sub)] overflow-hidden mt-2">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                 [style.width.%]="progressPercent()"></div>
          </div>
        </div>

        <!-- Footer CTA -->
        <div class="mt-2.5 sm:mt-3 flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-bold text-emerald-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            {{ data()!.all_completed ? (i18n.t('quests.claim')() || '查看成就') : (i18n.t('quests.banner_action')() || '去完成挑战') }}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
          <span class="text-[10px] font-mono text-[var(--color-text-muted)] opacity-75">
            {{ countdown() }}
          </span>
        </div>
      </div>
    }
  `
})
export class DailyChallengeBannerComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private questService = inject(DailyQuestService);
  private router = inject(Router);
  authStore = inject(AuthStore);

  goToDaily() {
    this.router.navigate(['/', this.i18n.currentLang(), 'daily']);
  }

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
