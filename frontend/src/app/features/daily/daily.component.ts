import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { DailyQuestService, DailyQuestsResponse, DailyQuestItem, StreakMilestone, ClaimQuestResponse } from '../../core/services/daily-quest.service';
import { AuthStore } from '../../core/auth/auth.store';
import { AudioService } from '../../core/services/audio.service';
import { ToastService } from '../../core/services/toast.service';
import { RewardCelebrationModalComponent, RewardCelebrationData } from '../../shared/components/reward-celebration-modal/reward-celebration-modal.component';

@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [CommonModule, RouterLink, RewardCelebrationModalComponent],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-4xl mx-auto flex flex-col gap-6">

        <!-- 1. Header with Title & Reset Countdown -->
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

          <!-- 2. 玩家实时资产概览舱 (User Live Asset Deck) -->
          <div class="rounded-2xl border border-[var(--color-border-card)] bg-gradient-to-r from-[var(--color-bg-card)] via-[var(--color-bg-card)]/90 to-[var(--color-bg-sub)] p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            
            <!-- Left: Level & XP Bar -->
            <div class="flex items-center gap-3 min-w-[200px] flex-1">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                Lv.{{ userLevel() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between text-xs font-bold mb-1">
                  <span class="text-[var(--color-text-main)]">等级进度</span>
                  <span class="text-indigo-500 font-mono">{{ userXp() }} XP</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[var(--color-bg-main)] overflow-hidden border border-[var(--color-border-card)]">
                  <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                       [style.width.%]="levelProgressPercent()"></div>
                </div>
              </div>
            </div>

            <!-- Right: Brain Coins & Streak Badges -->
            <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <!-- Brain Coins -->
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm"
                   title="我的脑力金币">
                <span class="text-lg">🪙</span>
                <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-amber-500 uppercase leading-none">脑力金币</span>
                  <span class="font-black font-mono text-sm sm:text-base text-amber-600 dark:text-amber-300 leading-tight">
                    {{ userCoins() }}
                  </span>
                </div>
              </div>

              <!-- Streak Flames -->
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-sm"
                   title="连续打卡天数">
                <span class="text-lg">🔥</span>
                <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-orange-500 uppercase leading-none">打卡连胜</span>
                  <span class="font-black font-mono text-sm sm:text-base text-orange-600 dark:text-orange-300 leading-tight">
                    {{ d.streak }} 天
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Highlights Deck: Streak, Freeze, Grand Chest -->
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
                 [class.border-amber-500/60]="d.chest.completed && !d.chest.claimed"
                 [class.shadow-[0_0_20px_rgba(245,158,11,0.2)]]="d.chest.completed && !d.chest.claimed">
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
                      <span class="text-amber-500 font-bold animate-pulse">{{ i18n.t('quests.chest_ready_hint')() }}</span>
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
                  <button (click)="claim(d.chest.id, '🎁', '全清豪华大宝箱达成！')"
                          [disabled]="claiming() === d.chest.id"
                          class="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all animate-bounce cursor-pointer">
                    {{ claiming() === d.chest.id ? '...' : (i18n.t('quests.claim')() || '开箱') }} ✨
                  </button>
                } @else {
                  <button disabled class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-bg-main)] text-[var(--color-text-muted)] border border-[var(--color-border-card)] opacity-50 cursor-not-allowed whitespace-nowrap">
                    {{ d.completed_count }}/{{ d.total_count }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- 4. Streak Milestones Roadmap -->
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

          <!-- 5. Quests List Section + Claim All Action Bar -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-1 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {{ i18n.t('quests.title')() }} ({{ d.completed_count }}/{{ d.total_count }})
                </h2>
                <!-- Total Progress Bar -->
                <div class="w-20 sm:w-28 h-2 rounded-full bg-[var(--color-bg-main)] overflow-hidden border border-[var(--color-border-card)]">
                  <div class="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                       [style.width.%]="calcPercent(d.completed_count, d.total_count)"></div>
                </div>
              </div>

              <!-- ⚡ 一键全领 (Claim All) 按钮 -->
              @if (claimableTotal() > 0) {
                <button
                  type="button"
                  (click)="claimAll()"
                  [disabled]="isClaimingAll()"
                  class="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse">
                  <span>⚡</span>
                  <span>{{ i18n.t('quests.claim_all')() }}</span>
                  <span class="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                    +{{ claimableTotal() }}
                  </span>
                </button>
              }
            </div>

            <!-- Quest Item Cards -->
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
                      <button (click)="claim(q.id, q.icon, i18n.t(q.title_key)() || '任务达成！')"
                              [disabled]="claiming() === q.id"
                              class="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
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

    <!-- 6. 居中华丽多巴胺奖励弹窗 (Reward Celebration Modal) -->
    @if (celebrationData()) {
      <app-reward-celebration-modal
        [data]="celebrationData()"
        (confirmed)="celebrationData.set(null)"
      ></app-reward-celebration-modal>
    }
  `
})
export class DailyComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private questService = inject(DailyQuestService);
  authStore = inject(AuthStore);
  private audio = inject(AudioService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  data = computed(() => this.questService.questsData());
  claiming = signal<string | null>(null);
  isClaimingAll = signal(false);
  countdown = signal('00:00:00');

  celebrationData = signal<RewardCelebrationData | null>(null);

  // Computed User Stats for Live Asset Deck
  userLevel = computed(() => this.authStore.currentUser()?.level || 1);
  userXp = computed(() => this.authStore.currentUser()?.xp || 0);
  userCoins = computed(() => this.data()?.brain_coins ?? (this.authStore.currentUser()?.brain_coins || 0));

  levelProgressPercent = computed(() => {
    const xp = this.userXp();
    // 假设每级1000XP
    return Math.min(100, Math.round((xp % 1000) / 10));
  });

  claimableQuests = computed(() => this.data()?.quests.filter(q => q.completed && !q.claimed) || []);
  canClaimChest = computed(() => !!this.data()?.chest.completed && !this.data()?.chest.claimed);
  claimableTotal = computed(() => this.claimableQuests().length + (this.canClaimChest() ? 1 : 0));

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

  claim(questId: string, icon = '🎁', questTitle = '每日挑战奖励'): void {
    if (!this.authStore.isAuthenticated()) {
      this.toast.error(this.i18n.t('auth.login_required')() || 'Please login to claim quest rewards!');
      return;
    }
    this.claiming.set(questId);
    this.questService.claimQuest(questId).subscribe({
      next: res => {
        this.claiming.set(null);
        // 弹出居中多巴胺奖励弹窗！
        this.celebrationData.set({
          title: this.i18n.t('quests.reward_title')() || '恭喜获得奖励！',
          subtitle: questTitle,
          icon,
          xp: res.xp_amount,
          coins: res.coins_amount || 20,
          leveledUp: res.xp_result?.leveled_up,
          newLevel: res.xp_result?.level,
          milestoneTitle: res.milestone_notice ? '里程碑达成' : undefined,
          milestoneDesc: res.milestone_notice
        });
      },
      error: () => {
        this.claiming.set(null);
        this.toast.error('领取失败，请稍后重试');
      }
    });
  }

  claimAll(): void {
    if (!this.authStore.isAuthenticated()) {
      this.toast.error(this.i18n.t('auth.login_required')() || 'Please login to claim quest rewards!');
      return;
    }

    const tasks = [...this.claimableQuests()];
    const chestReady = this.canClaimChest();
    if (tasks.length === 0 && !chestReady) return;

    this.isClaimingAll.set(true);

    const requests = tasks.map(t => this.questService.claimQuest(t.id));
    if (chestReady) {
      requests.push(this.questService.claimQuest('daily_chest'));
    }

    forkJoin(requests).subscribe({
      next: (results: ClaimQuestResponse[]) => {
        this.isClaimingAll.set(false);
        let totalXp = 0;
        let totalCoins = 0;
        let hasLeveledUp = false;
        let finalLevel = this.userLevel();
        let lastMilestone = '';

        results.forEach(r => {
          totalXp += r.xp_amount || 0;
          totalCoins += r.coins_amount || 0;
          if (r.xp_result?.leveled_up) {
            hasLeveledUp = true;
            finalLevel = r.xp_result.level;
          }
          if (r.milestone_notice) {
            lastMilestone = r.milestone_notice;
          }
        });

        // 触发大丰收全清大弹窗！
        this.celebrationData.set({
          title: '🎉 奖励大丰收！',
          subtitle: `成功领取全部 ${results.length} 项挑战奖励`,
          icon: '👑',
          xp: totalXp,
          coins: totalCoins,
          leveledUp: hasLeveledUp,
          newLevel: finalLevel,
          milestoneTitle: lastMilestone ? '连胜里程碑' : undefined,
          milestoneDesc: lastMilestone || undefined
        });
      },
      error: () => {
        this.isClaimingAll.set(false);
        this.toast.error('一键领取部分失败，请重试');
      }
    });
  }

  private updateCountdown(): void {
    this.countdown.set(this.questService.formatCountdown(this.questService.secondsUntilMidnight()));
  }
}
