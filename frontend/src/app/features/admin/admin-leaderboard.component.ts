import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';

interface DifficultyRecordItem {
  stat_id: number;
  difficulty: string;
  user_id: number;
  username: string;
  avatar: string;
  level: number;
  best_time: number;
  best_score: number;
  rating: number;
  rank_type: string;
  achieved_at: string;
}

@Component({
  selector: 'app-admin-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6 animate-fade-in">

      <!-- Header & Global Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-[var(--color-text-main)] flex items-center gap-2">
            <span>🏆</span>
            <span>游戏极限纪录殿堂 ＆ 全网天梯管理</span>
          </h1>
          <p class="text-xs text-[var(--color-text-muted)] mt-1">
            实时查看各款游戏在不同难度的极限巅峰纪录，支持一键清理作弊秒杀成绩与特定难度记录重置
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- 🧹 全服一键净化秒杀记录 (<3s) -->
          <button (click)="purgeSuspiciousRecords()"
                  [disabled]="isPurging()"
                  class="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:brightness-110 text-white shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <span>🧹</span>
            <span>{{ isPurging() ? '正在全服净化中...' : '一键清理全服秒杀纪录 (<3秒)' }}</span>
          </button>

          <button (click)="refreshCurrent()"
                  class="p-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-all cursor-pointer"
                  title="刷新当前视图">
            <span>🔄</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-[var(--color-border-card)] pb-2">
        <button (click)="activeTab.set('hallOfFame')"
                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border"
                [class.bg-[var(--color-accent-from)]]="activeTab() === 'hallOfFame'"
                [class.text-white]="activeTab() === 'hallOfFame'"
                [class.border-transparent]="activeTab() === 'hallOfFame'"
                [class.bg-[var(--color-bg-card)]]="activeTab() !== 'hallOfFame'"
                [class.text-[var(--color-text-muted)]]="activeTab() !== 'hallOfFame'"
                [class.border-[var(--color-border-card)]]="activeTab() !== 'hallOfFame'">
          <span>👑</span>
          <span>极限纪录殿堂 (各游戏/难度榜首)</span>
        </button>

        <button (click)="activeTab.set('table')"
                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border"
                [class.bg-[var(--color-accent-from)]]="activeTab() === 'table'"
                [class.text-white]="activeTab() === 'table'"
                [class.border-transparent]="activeTab() === 'table'"
                [class.bg-[var(--color-bg-card)]]="activeTab() !== 'table'"
                [class.text-[var(--color-text-muted)]]="activeTab() !== 'table'"
                [class.border-[var(--color-border-card)]]="activeTab() !== 'table'">
          <span>📊</span>
          <span>全服天梯榜单排查 (明细表)</span>
        </button>
      </div>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- TAB 1: 极限纪录殿堂管理 (Hall of Fame by Difficulty) -->
      <!-- ═══════════════════════════════════════════════ -->
      @if (activeTab() === 'hallOfFame') {
        <div class="flex flex-col gap-5">
          <!-- Game Select Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">选择游戏:</span>
              <select [(ngModel)]="selectedGame" (ngModelChange)="loadHallOfFame()"
                      class="px-3.5 py-1.5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] text-sm font-bold cursor-pointer">
                @for (g of games; track g.id) {
                  <option [value]="g.id">{{ g.iconEmoji }} {{ g.id }}</option>
                }
              </select>

              <span class="text-xs px-2.5 py-1 rounded-full font-mono font-bold"
                    [class.bg-emerald-500/10]="hallOfFameRankType() === 'time'"
                    [class.text-emerald-500]="hallOfFameRankType() === 'time'"
                    [class.border]="hallOfFameRankType() === 'time'"
                    [class.border-emerald-500/20]="hallOfFameRankType() === 'time'"
                    [class.bg-amber-500/10]="hallOfFameRankType() !== 'time'"
                    [class.text-amber-500]="hallOfFameRankType() !== 'time'"
                    [class.border-amber-500/20]="hallOfFameRankType() !== 'time'">
                {{ hallOfFameRankType() === 'time' ? '⚡ 竞速极限 (最快通关时间)' : '🏆 积分极限 (最高通关得分)' }}
              </span>
            </div>

            <!-- Danger Zone: Reset entire game -->
            <button (click)="resetEntireGame(selectedGame)"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
              <span>⚠️</span>
              <span>清空该游戏全量纪录</span>
            </button>
          </div>

          <!-- Difficulty Cards Grid -->
          @if (isLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          } @else if (!difficultyRecords().length) {
            <div class="text-center py-12 text-[var(--color-text-muted)] bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)]">
              <p class="text-3xl mb-2">🚩</p>
              <p class="font-bold">该游戏暂未检索到难度配置</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              @for (rec of difficultyRecords(); track rec.difficulty) {
                <div class="p-4 sm:p-5 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:border-amber-500/40 transition-all shadow-xs flex flex-col justify-between gap-4 relative overflow-hidden"
                     [class.border-amber-500/30]="rec.user_id > 0">
                  
                  <!-- Top Row: Difficulty Badge & Stat ID -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            [ngClass]="getDifficultyDotClass(rec.difficulty)"></span>
                      <span class="text-base font-black text-[var(--color-text-main)] capitalize">
                        {{ rec.difficulty }}
                      </span>
                    </div>

                    @if (rec.stat_id > 0) {
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
                        Stat #{{ rec.stat_id }}
                      </span>
                    }
                  </div>

                  <!-- Middle Body: Record Details -->
                  @if (rec.user_id > 0) {
                    <div class="p-3 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]/70 flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-base shrink-0">👑</span>
                          <span class="text-sm font-black text-[var(--color-text-main)] truncate max-w-[120px]">
                            {{ rec.username }}
                          </span>
                          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500">
                            Lv.{{ rec.level || 1 }}
                          </span>
                        </div>

                        <!-- Record Value -->
                        <div class="text-right">
                          @if (rec.rank_type === 'time') {
                            <span class="text-base font-black font-mono text-emerald-500 flex items-center gap-1">
                              <span>⚡</span>
                              <span>{{ formatTime(rec.best_time) }}</span>
                            </span>
                          } @else {
                            <span class="text-base font-black font-mono text-amber-500 flex items-center gap-1">
                              <span>🏆</span>
                              <span>{{ rec.best_score }}分</span>
                            </span>
                          }
                        </div>
                      </div>

                      <div class="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between border-t border-[var(--color-border-card)]/40 pt-1.5">
                        <span>创下时间:</span>
                        <span class="font-mono">{{ rec.achieved_at | date:'yyyy-MM-dd HH:mm' }}</span>
                      </div>
                    </div>
                  } @else {
                    <div class="py-6 flex flex-col items-center justify-center text-center gap-1.5 text-[var(--color-text-muted)] bg-[var(--color-bg-main)]/50 rounded-xl border border-dashed border-[var(--color-border-card)]">
                      <span class="text-2xl opacity-40">🚩</span>
                      <span class="text-xs font-bold">虚位以待 · 暂无巅峰纪录</span>
                    </div>
                  }

                  <!-- Actions Footer -->
                  <div class="flex items-center gap-2 pt-1 border-t border-[var(--color-border-card)]/50">
                    @if (rec.user_id > 0) {
                      <!-- 🗑️ 清除该最高记录 (移除榜首) -->
                      <button (click)="clearSingleRecord(selectedGame, rec.difficulty)"
                              class="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1">
                        <span>🗑️</span>
                        <span>清除最高纪录</span>
                      </button>
                    }

                    <!-- ⚠️ 清空该难度所有玩家纪录 -->
                    <button (click)="clearAllRecordsForDiff(selectedGame, rec.difficulty)"
                            class="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                            [title]="'清空【' + selectedGame + '】难度【' + rec.difficulty + '】的所有玩家纪录'">
                      <span>重置难度</span>
                    </button>
                  </div>

                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ═══════════════════════════════════════════════ -->
      <!-- TAB 2: 全服天梯完整明细排查 (Full Leaderboard Table) -->
      <!-- ═══════════════════════════════════════════════ -->
      @if (activeTab() === 'table') {
        <div class="flex flex-col gap-4">
          <!-- Filters -->
          <div class="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] items-center">
            <select [(ngModel)]="selectedGame" (ngModelChange)="loadTable()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] text-sm font-bold">
              @for (g of games; track g.id) {
                <option [value]="g.id">{{ g.iconEmoji }} {{ g.id }}</option>
              }
            </select>
            <select [(ngModel)]="selectedMode" (ngModelChange)="loadTable()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] text-sm">
              <option value="">全部模式</option>
              <option value="single">Single 单人</option>
              <option value="speed">Speed 极速PK</option>
              <option value="steal">Steal 抢分PK</option>
            </select>
            <select [(ngModel)]="selectedDiff" (ngModelChange)="loadTable()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] text-sm">
              <option value="">全部难度</option>
              <option value="easy">Easy 简单</option>
              <option value="medium">Medium 中等</option>
              <option value="hard">Hard 困难</option>
              <option value="expert">Expert 专家</option>
              <option value="master">Master 大师</option>
            </select>
            <div class="flex rounded-xl border border-[var(--color-border-card)] overflow-hidden">
              <button (click)="selectedPeriod = 'all'; loadTable()"
                      class="px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      [class]="selectedPeriod === 'all' ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white' : 'bg-[var(--color-bg-main)] text-[var(--color-text-muted)]'">
                历史总榜 (All Time)
              </button>
              <button (click)="selectedPeriod = 'weekly'; loadTable()"
                      class="px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      [class]="selectedPeriod === 'weekly' ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white' : 'bg-[var(--color-bg-main)] text-[var(--color-text-muted)]'">
                本周榜 (Weekly)
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden shadow-xs">
            @if (isLoading()) {
              <div class="flex justify-center py-16">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
              </div>
            } @else if (!entries().length) {
              <div class="text-center py-16 text-[var(--color-text-muted)]">
                <p class="text-3xl mb-2">🏆</p>
                <p class="font-bold">暂无玩家排行记录</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-[var(--color-border-card)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider bg-[var(--color-bg-main)]/60">
                      <th class="text-left px-4 py-3">排名</th>
                      <th class="text-left px-4 py-3">玩家</th>
                      <th class="text-right px-4 py-3">最快用时</th>
                      <th class="text-right px-4 py-3">最高得分</th>
                      <th class="text-right px-4 py-3">总场次</th>
                      <th class="text-right px-4 py-3">胜场</th>
                      <th class="text-center px-4 py-3">记录 ID</th>
                      <th class="text-right px-4 py-3">管理操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of entries(); track (e.stat_id || e.user_id)) {
                      <tr class="border-b border-[var(--color-border-card)]/50 last:border-0 hover:bg-[var(--color-bg-main)]/40 transition-colors">
                        <td class="px-4 py-3 font-black" [class]="rankColor(e.rank)">
                          {{ e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank - 1] : '#' + e.rank }}
                        </td>
                        <td class="px-4 py-3 font-bold text-[var(--color-text-main)]">
                          {{ e.username }}
                        </td>
                        <td class="px-4 py-3 text-right font-mono text-emerald-500 font-bold">
                          {{ e.best_time > 0 ? (formatTime(e.best_time) + (e.best_time < 3 ? ' ⚠️' : '')) : '—' }}
                        </td>
                        <td class="px-4 py-3 text-right font-mono text-amber-500 font-bold">
                          {{ e.best_score || '—' }}
                        </td>
                        <td class="px-4 py-3 text-right text-[var(--color-text-muted)] font-mono">{{ e.play_count }}</td>
                        <td class="px-4 py-3 text-right text-[var(--color-text-muted)] font-mono">{{ e.win_count }}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-main)] px-1.5 py-0.5 rounded border border-[var(--color-border-card)]">
                            #{{ e.stat_id || e.user_id }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button (click)="confirmDeleteStat(e.stat_id)"
                                  [disabled]="!e.stat_id"
                                  class="text-xs px-2.5 py-1 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer disabled:opacity-30">
                            删除
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `
})
export class AdminLeaderboardComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private apiUrl = environment.apiUrl;

  games = GAME_DEFINITIONS;

  activeTab = signal<'hallOfFame' | 'table'>('hallOfFame');
  isLoading = signal(false);
  isPurging = signal(false);

  // Hall of Fame signals
  selectedGame = GAME_DEFINITIONS[0]?.id ?? 'nonogram';
  hallOfFameRankType = signal('time');
  difficultyRecords = signal<DifficultyRecordItem[]>([]);

  // Table View filters
  selectedMode = '';
  selectedDiff = '';
  selectedPeriod = 'all';
  entries = signal<any[]>([]);

  ngOnInit(): void {
    this.loadHallOfFame();
  }

  refreshCurrent(): void {
    if (this.activeTab() === 'hallOfFame') {
      this.loadHallOfFame();
    } else {
      this.loadTable();
    }
  }

  // 1. Load Hall of Fame for the selected game
  loadHallOfFame(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/admin/leaderboard/game-records?gameId=${this.selectedGame}`).subscribe({
      next: res => {
        this.hallOfFameRankType.set(res.rank_type || 'time');
        this.difficultyRecords.set(res.records || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.difficultyRecords.set([]);
        this.isLoading.set(false);
        this.toast.error('加载极限纪录失败');
      }
    });
  }

  // 2. Load Full Leaderboard Table
  loadTable(): void {
    this.isLoading.set(true);
    let params = `mode=${this.selectedMode}&difficulty=${this.selectedDiff}&period=${this.selectedPeriod}&limit=100`;
    this.http.get<any>(`${this.apiUrl}/admin/leaderboard/${this.selectedGame}?${params}`).subscribe({
      next: r => {
        this.entries.set(r.entries ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.isLoading.set(false);
        this.toast.error('加载天梯榜单失败');
      }
    });
  }

  // 3. Clear single #1 record for game & difficulty
  clearSingleRecord(gameId: string, diff: string): void {
    const msg = `确定要清除【${gameId}】难度【${diff}】的全网最高纪录吗？\n清除后，次优记录将成为新纪录；若无其他记录则虚位以待。`;
    if (!confirm(msg)) return;

    this.http.delete<any>(`${this.apiUrl}/admin/leaderboard/records/${gameId}/${diff}`).subscribe({
      next: res => {
        this.toast.show(res.message || '最高记录已清除', 'success');
        this.loadHallOfFame();
      },
      error: err => {
        this.toast.error(err.error?.error || '清除失败');
      }
    });
  }

  // 4. Clear all records for game & difficulty
  clearAllRecordsForDiff(gameId: string, diff: string): void {
    const msg = `⚠️ 高危操作：确定要彻底清空【${gameId}】难度【${diff}】的所有玩家纪录吗？\n此操作不可逆！`;
    if (!confirm(msg)) return;

    this.http.delete<any>(`${this.apiUrl}/admin/leaderboard/records/${gameId}/${diff}?all=true`).subscribe({
      next: res => {
        this.toast.show(res.message || '全量记录已重置', 'success');
        this.loadHallOfFame();
      },
      error: err => {
        this.toast.error(err.error?.error || '清空失败');
      }
    });
  }

  // 5. Reset entire game across all difficulties
  resetEntireGame(gameId: string): void {
    const msg = `⚠️ 警告：确定要彻底清空游戏【${gameId}】所有难度下的全部记录吗？`;
    if (!confirm(msg)) return;

    this.http.delete<any>(`${this.apiUrl}/admin/leaderboard/records/${gameId}`).subscribe({
      next: res => {
        this.toast.show(res.message || '该游戏记录已全部清空', 'success');
        this.loadHallOfFame();
      },
      error: err => {
        this.toast.error(err.error?.error || '重置失败');
      }
    });
  }

  // 6. One-click purge suspicious < 3s cheat records across all games
  purgeSuspiciousRecords(): void {
    const msg = `确定要全服扫描并清理所有历史秒杀记录吗？\n系统将自动删除所有竞速游戏中用时小于 3 秒 (<3s) 的异常记录。`;
    if (!confirm(msg)) return;

    this.isPurging.set(true);
    this.http.post<any>(`${this.apiUrl}/admin/leaderboard/purge-suspicious`, {}).subscribe({
      next: res => {
        this.isPurging.set(false);
        this.toast.show(res.message || `净化完成，共删除 ${res.deleted_count} 条可疑记录`, 'success');
        this.loadHallOfFame();
      },
      error: err => {
        this.isPurging.set(false);
        this.toast.error(err.error?.error || '全服净化失败');
      }
    });
  }

  // 7. Delete single stat entry by statId
  confirmDeleteStat(statId: number): void {
    if (!statId) return;
    if (!confirm(`确定要移除该条玩家记录 (ID #${statId}) 吗？`)) return;

    this.http.delete(`${this.apiUrl}/admin/leaderboard/stat/${statId}`).subscribe({
      next: () => {
        this.toast.show('已成功移除该记录', 'success');
        this.loadTable();
      },
      error: err => {
        this.toast.error(err.error?.error || '删除失败');
      }
    });
  }

  getDifficultyDotClass(diff: string): string {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-emerald-500';
      case 'medium': return 'bg-blue-500';
      case 'hard': return 'bg-amber-500';
      case 'expert': return 'bg-purple-500';
      case 'master': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  }

  rankColor(rank: number): string {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-[var(--color-text-muted)]';
  }

  formatTime(s: number): string {
    if (!s || s <= 0) return '00:00';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
}
