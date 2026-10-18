import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DailyQuestService, DailyQuestsResponse, DailyQuestItem, StreakMilestone } from '../../core/services/daily-quest.service';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-4xl mx-auto flex flex-col gap-6">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-card)] pb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-2xl shadow-lg text-white">
              🎯
            </div>
            <div>
              <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]">
                {{ i18n.t('quests.title')() || '每日任务' }}
              </h1>
              <p class="text-sm text-[var(--color-text-muted)]">{{ i18n.t('quests.subtitle')() }}</p>
            </div>
          </div>

          <!-- Countdown Pill -->
          <div class="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-xs text-[var(--color-text-muted)] font-semibold shadow-sm">
            <span>⏱️ {{ i18n.t('quests.reset_in')() }}:</span>
            <span class="font-mono font-black text-sm text-[var(--color-text-main)]">{{ countdown() }}</span>
          </div>
        </div>

        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center h-64 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        } @else if (data(); as d) {
          <!-- Highlights Deck: Streak, Freeze, Grand Chest, and Coins -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Streak Card -->
            <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 sm:p-5 flex items-center gap-3.5 shadow-sm relative overflow-hidden group">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                🔥
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {{ i18n.t('quests.streak')() || '连续打卡' }}
                </span>
                <div class="text-2xl font-black text-[var(--color-text-main)] font-mono">
                  {{ d.streak }} <span class="text-xs font-sans font-bold text-[var(--color-text-muted)]">天</span>
                </div>
                <p class="text-[11px] text-[var(--color-text-muted)] truncate">
                  {{ i18n.t('quests.streak_hint')() }}
                </p>
              </div>
            </div>

            <!-- Streak Freeze Protection Card -->
            <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 sm:p-5 flex items-center gap-3.5 shadow-sm relative overflow-hidden group">
              <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                🧊
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    {{ i18n.t('streak.freeze_title')() }}
                  </span>
                  <span class="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 text-[10px] font-mono font-bold">
                    {{ d.streak_freezes }}/2 张
                  </span>
                </div>
                <div class="text-xs font-bold text-[var(--color-text-main)] mt-0.5">
                  {{ d.streak_freezes > 0 ? '已开启防护' : '已耗尽，连胜3天可获赠' }}
                </div>
                <p class="text-[11px] text-[var(--color-text-muted)] truncate">
                  {{ i18n.t('streak.freeze_desc')() }}
                </p>
              </div>
            </div>

            <!-- Grand Chest Card -->
            <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm relative overflow-hidden group sm:col-span-2 lg:col-span-1"
                 [class.border-amber-500/50]="d.chest.completed && !d.chest.claimed">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
                     [ngClass]="d.chest.completed ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-[var(--color-bg-main)] border border-[var(--color-border-card)]'">
                  🎁
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-from)] truncate">
                      {{ i18n.t('quests.daily_chest')() || '全清大宝箱' }}
                    </span>
                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 whitespace-nowrap">
                      +{{ d.chest.xp_amount }} XP / +100 🪙
                    </span>
                  </div>
                  <p class="text-[11px] text-[var(--color-text-muted)] truncate">
                    @if (d.chest.claimed) {
                      <span class="text-green-500 font-bold">✓ {{ i18n.t('quests.chest_claimed')() }}</span>
                    } @else if (d.chest.completed) {
                      <span class="text-amber-500 font-bold animate-pulse">{{ i18n.t('quests.chest_ready')() }}</span>
                    } @else {
                      <span>{{ d.completed_count }}/{{ d.total_count }} {{ i18n.t('quests.chest_desc')() }}</span>
                    }
                  </p>
                </div>
              </div>

              <!-- Chest Action -->
              <div>
                @if (d.chest.claimed) {
                  <button disabled class="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 cursor-default">
                    ✓ {{ i18n.t('quests.claimed')() }}
                  </button>
                } @else if (d.chest.completed) {
                  <button (click)="claim(d.chest.id)" [disabled]="claiming() === d.chest.id"
                          class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all animate-bounce">
                    {{ claiming() === d.chest.id ? '...' : (i18n.t('quests.claim')() || '开箱') }}
                  </button>
                } @else {
                  <button disabled class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-bg-main)] text-[var(--color-text-muted)] border border-[var(--color-border-card)] opacity-50 cursor-not-allowed whitespace-nowrap">
                    {{ d.completed_count }}/{{ d.total_count }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Streak Milestones Roadmap -->
          <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-black uppercase tracking-wider text-[var(--color-text-main)] flex items-center gap-2">
                <span>🏆</span> {{ i18n.t('milestones.track_title')() }}
              </h2>
              <span class="text-xs text-[var(--color-text-muted)] font-mono font-bold">
                当前: <b class="text-amber-500">{{ d.streak }}</b> 天连胜
              </span>
            </div>

            <!-- Milestones Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              @for (m of d.milestones; track m.days) {
                <div class="rounded-xl border p-3 flex flex-col justify-between gap-2 transition-all relative overflow-hidden"
                     [ngClass]="m.reached
                       ? 'bg-amber-500/10 border-amber-500/30 text-[var(--color-text-main)]'
                       : 'bg-[var(--color-bg-main)] border-[var(--color-border-card)] opacity-70'">
                  <div class="flex items-center justify-between">
                    <span class="text-xl">{{ m.reward_icon }}</span>
                    @if (m.reached) {
                      <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-green-500/20 text-green-400 font-bold border border-green-500/30">已达成</span>
                    } @else {
                      <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-card)] font-bold">未解锁</span>
                    }
                  </div>
                  <div>
                    <h3 class="font-bold text-xs">{{ i18n.t(m.title_key)() }}</h3>
                    <p class="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{{ i18n.t(m.reward_desc)() }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Quests List Section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {{ i18n.t('quests.title')() }} ({{ d.completed_count }}/{{ d.total_count }})
              </h2>
            </div>

            @for (q of d.quests; track q.id) {
              <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[var(--color-accent-from)]/30 hover:shadow-md"
                   [class.bg-[var(--color-accent-from)]/5]="q.completed && !q.claimed">
                
                <!-- Left Details -->
                <div class="flex items-center gap-4 min-w-0">
                  <div class="w-12 h-12 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                    {{ q.icon }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 class="font-black text-sm sm:text-base text-[var(--color-text-main)] truncate">
                        {{ i18n.t(q.title_key)() || q.id }}
                      </h3>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-accent-from)]/10 text-[var(--color-accent-from)]">
                        +{{ q.xp_amount }} XP
                      </span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-500">
                        +{{ q.coins || 20 }} 🪙
                      </span>
                    </div>
                    <p class="text-xs text-[var(--color-text-muted)] line-clamp-1">
                      {{ i18n.t(q.desc_key)() }}
                    </p>
                  </div>
                </div>

                <!-- Right Progress & Action -->
                <div class="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 border-t sm:border-t-0 border-[var(--color-border-card)] pt-3 sm:pt-0">
                  <!-- Progress Bar -->
                  <div class="flex flex-col items-end gap-1 min-w-[90px]">
                    <span class="text-xs font-mono font-bold text-[var(--color-text-main)]">
                      {{ q.current }} / {{ q.target }}
                    </span>
                    <div class="w-24 h-1.5 rounded-full bg-[var(--color-bg-main)] overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] transition-all duration-300"
                           [style.width.%]="calcPercent(q.current, q.target)"></div>
                    </div>
                  </div>

                  <!-- CTA -->
                  <div>
                    @if (q.claimed) {
                      <button disabled class="px-4 py-2 rounded-xl text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 cursor-default">
                        ✓ {{ i18n.t('quests.claimed')() }}
                      </button>
                    } @else if (q.completed) {
                      <button (click)="claim(q.id)" [disabled]="claiming() === q.id"
                              class="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all">
                        {{ claiming() === q.id ? '...' : (i18n.t('quests.claim')() || '领取') }}
                      </button>
                    } @else {
                      <a [routerLink]="['/', i18n.currentLang(), q.action_url.replace('/', '')]"
                         class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] hover:bg-[var(--color-accent-from)]/10 hover:border-[var(--color-accent-from)]/30 transition-all inline-block">
                        {{ i18n.t('quests.go_do')() || '去完成' }} →
                      </a>
                    }
                  </div>
                </div>

              </div>
            }
          </div>
        }

      </div>
    </div>
  `
})
export class DailyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private questService = inject(DailyQuestService);
  authStore = inject(AuthStore);

  isLoading = signal(true);
  data = computed(() => this.questService.questsData());
  claiming = signal<string | null>(null);
  countdown = signal('00:00:00');

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.questService.getTodayQuests().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  calcPercent(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  claim(questId: string): void {
    if (!this.authStore.isAuthenticated()) {
      alert(this.i18n.t('auth.login_required')() || 'Please login to claim quest rewards!');
      return;
    }
    this.claiming.set(questId);
    this.questService.claimQuest(questId).subscribe({
      next: res => {
        this.claiming.set(null);
        if (res.milestone_notice) {
          alert(res.milestone_notice);
        }
      },
      error: () => {
        this.claiming.set(null);
      }
    });
  }

  private updateCountdown(): void {
    this.countdown.set(this.questService.formatCountdown(this.questService.secondsUntilMidnight()));
  }
}
