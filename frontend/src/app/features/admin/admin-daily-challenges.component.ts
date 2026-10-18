import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { environment } from '../../../environments/environment';

interface QuestStatItem {
  id: string;
  title: string;
  icon: string;
  xp_amount: number;
  completed_count: number;
  claimed_count: number;
}

interface TopStreakUser {
  id: number;
  username: string;
  streak: number;
}

interface AdminQuestMonitorData {
  status: string;
  mode: string;
  today: string;
  active_users_today: number;
  quests: QuestStatItem[];
  total_xp_claimed_today: number;
  top_streaks: TopStreakUser[];
}

@Component({
  selector: 'app-admin-daily-challenges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-6">

      <!-- Header & System Health Status -->
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border-card)] pb-5">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-black text-[var(--color-text-main)] flex items-center gap-2">
              <span>🎯</span> 每日任务自动化监控大盘
            </h1>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/30 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              全自动托管运行中
            </span>
          </div>
          <p class="text-xs text-[var(--color-text-muted)] mt-1">
            系统每日 00:00:00 自动刷新日常任务，玩家单局游戏结算与联机 PK 实时推进进度，无需人工排期维护。
          </p>
        </div>

        <button (click)="load()" [disabled]="isLoading()"
                class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-sm font-bold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-all flex items-center gap-2 shadow-sm">
          <span>🔄</span> 刷新监控数据
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center h-64 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)]">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
        </div>
      } @else if (data(); as d) {

        <!-- KPI Cards Deck -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- KPI 1: Active Users -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl font-bold">
              👥
            </div>
            <div>
              <p class="text-xs text-[var(--color-text-muted)] font-bold">今日打卡活跃玩家</p>
              <p class="text-2xl font-black text-[var(--color-text-main)] font-mono">{{ d.active_users_today }}</p>
            </div>
          </div>

          <!-- KPI 2: Total XP Claimed -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-2xl font-bold">
              ✨
            </div>
            <div>
              <p class="text-xs text-[var(--color-text-muted)] font-bold">今日已发放任务经验</p>
              <p class="text-2xl font-black text-purple-400 font-mono">+{{ d.total_xp_claimed_today | number }} XP</p>
            </div>
          </div>

          <!-- KPI 3: Coverage -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-2xl font-bold">
              🌐
            </div>
            <div>
              <p class="text-xs text-[var(--color-text-muted)] font-bold">游戏与对战覆盖率</p>
              <p class="text-2xl font-black text-green-400 font-mono">100% (18款)</p>
            </div>
          </div>

          <!-- KPI 4: Date -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 shadow-sm flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl font-bold">
              📅
            </div>
            <div>
              <p class="text-xs text-[var(--color-text-muted)] font-bold">当前统计结算周期</p>
              <p class="text-sm font-black text-[var(--color-text-main)] font-mono">{{ d.today }}</p>
            </div>
          </div>

        </div>

        <!-- Quests Real-time Performance Breakdown -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-sm">
          <h2 class="text-base font-black text-[var(--color-text-main)] mb-4 flex items-center gap-2">
            <span>📊</span> 今日活跃任务达成明细 (Real-Time Breakdown)
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (q of d.quests; track q.id) {
              <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/50 p-4 flex flex-col justify-between gap-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ q.icon }}</span>
                    <div>
                      <p class="font-bold text-xs text-[var(--color-text-main)]">{{ q.title }}</p>
                      <span class="text-[10px] text-[var(--color-accent-from)] font-semibold">+{{ q.xp_amount }} XP</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between text-xs pt-2 border-t border-[var(--color-border-card)]/50">
                  <span class="text-[var(--color-text-muted)]">达成人数:</span>
                  <span class="font-mono font-bold text-[var(--color-text-main)]">{{ q.completed_count }} 人</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[var(--color-text-muted)]">已领取人数:</span>
                  <span class="font-mono font-bold text-green-500">{{ q.claimed_count }} 人</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Top Streak Players Leaderboard -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-black text-[var(--color-text-main)] flex items-center gap-2">
              <span>🔥</span> 全站玩家连胜与打卡天数监控 (Streak Leaderboard)
            </h2>
            <span class="text-xs text-[var(--color-text-muted)]">展示连续每日全清天数最高的玩家</span>
          </div>

          @if (!d.top_streaks.length) {
            <div class="py-8 text-center text-sm text-[var(--color-text-muted)]">
              暂无连胜打卡数据
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (u of d.top_streaks; track u.id; let idx = $index) {
                <div class="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/40">
                  <div class="flex items-center gap-3">
                    <span class="font-mono font-black text-sm w-5 text-center"
                          [class.text-yellow-400]="idx === 0"
                          [class.text-slate-400]="idx === 1"
                          [class.text-amber-600]="idx === 2"
                          [class.text-[var(--color-text-muted)]]="idx > 2">
                      #{{ idx + 1 }}
                    </span>
                    <span class="font-bold text-sm text-[var(--color-text-main)] truncate max-w-[120px]">
                      {{ u.username }}
                    </span>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    🔥 {{ u.streak }} 天
                  </span>
                </div>
              }
            </div>
          }
        </div>

      }
    </div>
  `
})
export class AdminDailyChallengesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  data = signal<AdminQuestMonitorData | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.http.get<AdminQuestMonitorData>(`${this.apiUrl}/admin/quests/stats`).subscribe({
      next: r => {
        this.data.set(r);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
