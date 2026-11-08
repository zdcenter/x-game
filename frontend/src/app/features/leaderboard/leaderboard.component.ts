import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { LeaderboardService, LeaderboardEntry, LeaderboardResponse } from '../../core/services/leaderboard.service';
import { GameStatsService, GameDifficultyRecord } from '../../core/services/game-stats.service';
import { GameRegistryService, GameDifficultyConfig } from '../../core/services/game-registry.service';
import { FriendService } from '../../core/services/friend.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthStore } from '../../core/auth/auth.store';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
import { LevelBadgeComponent } from '../../shared/components/level-badge/level-badge.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, LevelBadgeComponent],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] py-4 md:py-8">
      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col gap-6">

        <!-- Top Header -->
        <div class="flex items-center gap-3 border-b border-[var(--color-border-card)] pb-5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-2xl shadow-lg shrink-0">
            🏆
          </div>
          <div class="min-w-0">
            <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] truncate">
              {{ i18n.t('leaderboard.title')() || '天梯排行榜' }}
            </h1>
            <p class="text-xs sm:text-sm text-[var(--color-text-muted)] truncate">
              {{ selectedGameId() === 'global' ? (i18n.t('leaderboard.global_desc')() || '全网脑力天梯总榜，见证全能脑力王者诞生') : (selectedGame()?.titleKey ? (i18n.t(selectedGame()!.titleKey)() + ' · 全服实力榜与难度极限纪录') : '游戏排行榜') }}
            </p>
          </div>
        </div>

        <!-- Horizontal Capsule Navigation Bar (Replaces Dropdown) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          <!-- Global Capsule -->
          <button (click)="selectGame('global')"
                  class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 flex items-center gap-2 cursor-pointer border active:scale-95 shadow-xs"
                  [class.bg-[var(--color-accent-from)]]="selectedGameId() === 'global'"
                  [class.text-white]="selectedGameId() === 'global'"
                  [class.border-transparent]="selectedGameId() === 'global'"
                  [class.bg-[var(--color-bg-card)]]="selectedGameId() !== 'global'"
                  [class.text-[var(--color-text-secondary)]]="selectedGameId() !== 'global'"
                  [class.border-[var(--color-border-card)]]="selectedGameId() !== 'global'">
            <span>🌍</span>
            <span>{{ i18n.t('leaderboard.global')() || '全服总榜' }}</span>
          </button>

          <!-- Individual Games Capsules -->
          @for (g of games; track g.id) {
            <button (click)="selectGame(g.id)"
                    class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border active:scale-95 shadow-xs"
                    [class.bg-[var(--color-accent-from)]]="selectedGameId() === g.id"
                    [class.text-white]="selectedGameId() === g.id"
                    [class.border-transparent]="selectedGameId() === g.id"
                    [class.bg-[var(--color-bg-card)]]="selectedGameId() !== g.id"
                    [class.text-[var(--color-text-secondary)]]="selectedGameId() !== g.id"
                    [class.border-[var(--color-border-card)]]="selectedGameId() !== g.id">
              <span>{{ g.iconEmoji }}</span>
              <span>{{ i18n.t(g.titleKey)() || g.id }}</span>
            </button>
          }
        </div>

        <!-- Section 1: Pinnacle Milestones Hall (Only when a specific game is selected) -->
        @if (selectedGameId() !== 'global') {
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-[var(--color-border-card)] pb-3">
              <div class="flex items-center gap-2">
                <span class="text-xl sm:text-2xl drop-shadow-sm">👑</span>
                <div>
                  <h2 class="text-sm sm:text-base font-black tracking-tight text-[var(--color-text-main)] flex items-center gap-1.5">
                    <span>{{ selectedGameTitle() }} · {{ i18n.t('lobby.hall_of_fame_title')() || '各难度极限纪录殿堂' }}</span>
                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">All-Time</span>
                  </h2>
                  <p class="text-[11px] text-[var(--color-text-secondary)]">
                    各难度殿堂榜首纪录保持者，点击任意难度可快速过滤下方详细天梯
                  </p>
                </div>
              </div>

              <!-- Quick Play CTA -->
              <button (click)="challengeRecord(selectedDifficulty() === 'all' ? '' : selectedDifficulty())"
                      class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:opacity-95 active:scale-95 cursor-pointer shrink-0">
                <span>🎮</span>
                <span>即刻开玩</span>
              </button>
            </div>

            @if (loadingPinnacle()) {
              <div class="py-8 flex flex-col items-center justify-center gap-2">
                <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs text-[var(--color-text-muted)]">加载极限纪录...</span>
              </div>
            } @else if (pinnacleRecords().length > 0) {
              <div class="flex flex-col gap-2">
                @for (rec of pinnacleRecords(); track rec.difficulty) {
                  <div class="group flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs"
                       [class.border-amber-500]="selectedDifficulty() === rec.difficulty"
                       [class.bg-amber-500/5]="selectedDifficulty() === rec.difficulty"
                       [class.border-[var(--color-border-card)]]="selectedDifficulty() !== rec.difficulty"
                       [class.bg-[var(--color-bg-main)]/60]="selectedDifficulty() !== rec.difficulty"
                       (click)="setDifficulty(rec.difficulty)">
                    
                    <!-- Difficulty & Spec (Left) -->
                    <div class="flex items-center gap-2.5 shrink-0 min-w-[105px] sm:min-w-[145px]">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" [ngClass]="getDifficultyDotClass(rec.difficulty)"></span>
                      <div class="flex flex-col">
                        <span class="text-xs font-black text-[var(--color-text-main)] tracking-wide">
                          {{ getDifficultyName(selectedGameId(), rec.difficulty) }}
                        </span>
                        @if (getDifficultySpec(selectedGameId(), rec.difficulty)) {
                          <span class="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {{ getDifficultySpec(selectedGameId(), rec.difficulty) }}
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Champion & Record (Center) -->
                    @if (rec.user_id > 0) {
                      <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-6 flex-1 min-w-0">
                        <!-- User info -->
                        <div class="flex items-center gap-1.5 min-w-0">
                          <span class="text-base shrink-0">👑</span>
                          <span class="text-xs sm:text-sm font-bold text-[var(--color-text-main)] truncate max-w-[85px] sm:max-w-[130px]">
                            {{ rec.username }}
                          </span>
                          <app-level-badge [level]="rec.level || 1" size="xs" />
                        </div>

                        <!-- Record value -->
                        <div class="flex items-baseline gap-2 shrink-0">
                          @if (rec.rank_type === 'time') {
                            <div class="flex items-baseline gap-1">
                              <span class="text-xs text-emerald-500 font-bold">⚡</span>
                              <span class="text-sm sm:text-base font-black font-mono text-emerald-500">
                                {{ formatTime(rec.best_time) }}
                              </span>
                              <span class="text-[10px] text-[var(--color-text-muted)] hidden md:inline ml-0.5">全网极速</span>
                            </div>
                          } @else {
                            <div class="flex items-baseline gap-1">
                              <span class="text-xs text-amber-500 font-bold">🏆</span>
                              <span class="text-sm sm:text-base font-black font-mono text-amber-500">
                                {{ rec.best_score }}
                              </span>
                              <span class="text-[10px] text-[var(--color-text-muted)] hidden md:inline ml-0.5">最高分</span>
                            </div>
                          }
                          <span class="text-[10px] text-[var(--color-text-muted)] font-mono hidden sm:inline">
                            {{ formatAchievedDate(rec.achieved_at) }}
                          </span>
                        </div>
                      </div>
                    } @else {
                      <!-- Unclaimed -->
                      <div class="flex items-center justify-between sm:justify-start gap-2 flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <span class="text-sm opacity-50">🚩</span>
                          <span class="font-medium text-[11px] sm:text-xs">虚位以待 · 首通载入殿堂</span>
                        </div>
                        <span class="text-xs font-mono text-[var(--color-text-muted)] opacity-50">⚡ --:--</span>
                      </div>
                    }

                    <!-- CTA Action Button (Right) -->
                    <div class="shrink-0" (click)="$event.stopPropagation()">
                      @if (rec.user_id > 0) {
                        <button (click)="challengeRecord(rec.difficulty)"
                                class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                          <span>⚔️</span>
                          <span class="hidden sm:inline">破纪录</span><span>挑战</span>
                        </button>
                      } @else {
                        <button (click)="challengeRecord(rec.difficulty)"
                                class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--color-accent-from)]/10 hover:bg-[var(--color-accent-from)] text-[var(--color-accent-from)] hover:text-white border border-[var(--color-accent-from)]/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                          <span>🚀</span>
                          <span>抢首登</span>
                        </button>
                      }
                    </div>

                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Section 2: Detailed Ranking Sub-filters (Difficulty & Period) -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Difficulty Capsule Filter (Game Mode) -->
          @if (selectedGameId() !== 'global' && gameDifficulties().length > 0) {
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              <button (click)="setDifficulty('all')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border active:scale-95 shadow-xs"
                      [class.bg-[var(--color-accent-from)]]="selectedDifficulty() === 'all'"
                      [class.text-white]="selectedDifficulty() === 'all'"
                      [class.border-transparent]="selectedDifficulty() === 'all'"
                      [class.bg-[var(--color-bg-card)]]="selectedDifficulty() !== 'all'"
                      [class.text-[var(--color-text-secondary)]]="selectedDifficulty() !== 'all'"
                      [class.border-[var(--color-border-card)]]="selectedDifficulty() !== 'all'">
                {{ i18n.t('game.all_difficulties')() || '全部难度' }}
              </button>

              @for (d of gameDifficulties(); track d.id) {
                <button (click)="setDifficulty(d.id)"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border active:scale-95 shadow-xs"
                        [class.bg-[var(--color-accent-from)]]="selectedDifficulty() === d.id"
                        [class.text-white]="selectedDifficulty() === d.id"
                        [class.border-transparent]="selectedDifficulty() === d.id"
                        [class.bg-[var(--color-bg-card)]]="selectedDifficulty() !== d.id"
                        [class.text-[var(--color-text-secondary)]]="selectedDifficulty() !== d.id"
                        [class.border-[var(--color-border-card)]]="selectedDifficulty() !== d.id">
                  <span class="w-2 h-2 rounded-full" [ngClass]="getDifficultyDotClass(d.id)"></span>
                  <span>{{ getDifficultyName(selectedGameId(), d.id) }}</span>
                  @if (d.desc) {
                    <span class="text-[10px] opacity-75 font-mono">({{ d.desc }})</span>
                  }
                </button>
              }
            </div>
          } @else {
            <div></div>
          }

          <!-- Period toggle -->
          <div class="flex rounded-xl border border-[var(--color-border-card)] overflow-hidden shadow-xs ml-auto">
            <button (click)="setPeriod('all')"
                    class="px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                    [class]="selectedPeriod() === 'all'
                      ? 'bg-[var(--color-accent-from)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.all_time')() || '历史总榜' }}
            </button>
            <button (click)="setPeriod('weekly')"
                    class="px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                    [class]="selectedPeriod() === 'weekly'
                      ? 'bg-[var(--color-accent-from)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.weekly')() || '本周热门' }}
            </button>
          </div>
        </div>

        <!-- My Rank Highlight -->
        @if (authStore.isAuthenticated() && data()?.my_rank) {
          <div class="flex items-center justify-between px-4 py-3 rounded-2xl border border-[var(--color-accent-from)]/30 bg-[var(--color-accent-from)]/10 shadow-xs">
            <div class="flex items-center gap-3">
              <span class="text-2xl font-black text-[var(--color-accent-from)] font-mono">#{{ data()!.my_rank }}</span>
              <div>
                <p class="text-xs sm:text-sm font-bold text-[var(--color-text-main)]">{{ i18n.t('leaderboard.my_rank')() || '我的排名' }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ authStore.currentUser()?.username }}</p>
              </div>
            </div>
            <div class="text-xs text-[var(--color-text-muted)] font-mono">
              @if (selectedGameId() !== 'global' && selectedDifficulty() !== 'all') {
                {{ getDifficultyName(selectedGameId(), selectedDifficulty()) }}
              }
            </div>
          </div>
        }

        <!-- Section 3: Ranking Table -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden shadow-xs">
          @if (isLoading()) {
            <div class="flex items-center justify-center h-48">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (!data()?.entries?.length) {
            <div class="flex flex-col items-center justify-center h-48 text-[var(--color-text-muted)] gap-2">
              <span class="text-4xl">🏆</span>
              <p class="font-bold text-sm">{{ i18n.t('leaderboard.no_data')() || '暂无排行记录' }}</p>
              @if (selectedGameId() !== 'global') {
                <button (click)="challengeRecord(selectedDifficulty() === 'all' ? '' : selectedDifficulty())"
                        class="mt-1 px-3 py-1.5 rounded-lg bg-[var(--color-accent-from)]/10 hover:bg-[var(--color-accent-from)] text-[var(--color-accent-from)] hover:text-white border border-[var(--color-accent-from)]/30 text-xs font-bold transition-all cursor-pointer">
                  成为该难度的第一人 →
                </button>
              }
            </div>
          } @else {
            <!-- Header row -->
            <div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-card)]">
              <div class="col-span-1 text-center">#</div>
              <div class="col-span-5 sm:col-span-4">{{ i18n.t('leaderboard.player')() || '玩家' }}</div>
              @if (selectedGameId() === 'global') {
                <div class="col-span-2 text-right">{{ i18n.t('leaderboard.level')() || '等级' }}</div>
                <div class="col-span-2 sm:col-span-3 text-right flex items-center justify-end gap-1">
                  <span>🪙</span>
                  <span class="hidden sm:inline">{{ i18n.t('leaderboard.coins')() || '脑力币' }}</span>
                </div>
                <div class="col-span-2 sm:col-span-2 text-right">{{ i18n.t('leaderboard.xp')() || '经验' }}</div>
              } @else {
                <div class="col-span-3 sm:col-span-3 text-right">
                  {{ isTimeType() ? (i18n.t('leaderboard.best_time')() || '最佳用时') : (i18n.t('leaderboard.best_score')() || '最高得分') }}
                </div>
                <div class="col-span-3 sm:col-span-2 text-right">
                  {{ i18n.t('leaderboard.plays')() || '通关/场次' }}
                </div>
                <div class="hidden sm:flex col-span-2 text-right items-center justify-end gap-1">
                  <span>🪙</span>
                  <span class="hidden sm:inline">{{ i18n.t('leaderboard.coins')() || '脑力币' }}</span>
                </div>
              }
            </div>

            <!-- Table Rows -->
            @for (entry of data()!.entries; track entry.user_id) {
              <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--color-border-card)]/50 last:border-0 transition-colors hover:bg-[var(--color-bg-main)]/50 items-center"
                   [class.bg-[var(--color-accent-from)]/5]="entry.is_current_user">
                <!-- Rank -->
                <div class="col-span-1 text-center font-mono font-black"
                     [ngClass]="rankColor(entry.rank)">
                  @if (entry.rank <= 3) {
                    <span class="text-base">{{ rankMedal(entry.rank) }}</span>
                  } @else {
                    <span>{{ entry.rank }}</span>
                  }
                </div>
                <!-- Player -->
                <div class="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
                  <span class="font-bold text-xs sm:text-sm truncate" [class.text-[var(--color-accent-from)]]="entry.is_current_user">
                    {{ entry.username }}
                    @if (entry.is_current_user) {
                      <span class="text-xs ml-1 opacity-60">({{ i18n.t('leaderboard.you')() || '你' }})</span>
                    }
                  </span>
                  @if (entry.level) {
                    <app-level-badge [level]="entry.level" size="xs" />
                  }
                  @if (!entry.is_current_user && authStore.isAuthenticated()) {
                    <button (click)="addFriend(entry.user_id)" class="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-500/10 rounded-full transition-all cursor-pointer" [title]="i18n.t('game.add_friend')() || '加好友'">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </button>
                  }
                </div>
                <!-- Global Mode Columns -->
                @if (selectedGameId() === 'global') {
                  <div class="col-span-2 text-right font-mono font-bold text-[var(--color-accent-from)] text-xs sm:text-sm">
                    Lv.{{ entry.level }}
                  </div>
                  <div class="col-span-2 sm:col-span-3 text-right font-mono font-bold text-amber-500 flex items-center justify-end gap-1 text-xs sm:text-sm">
                    <span class="text-xs">🪙</span>
                    <span>{{ (entry.brain_coins || 0) | number }}</span>
                  </div>
                  <div class="col-span-2 sm:col-span-2 text-right text-xs sm:text-sm text-[var(--color-text-muted)] font-mono">
                    {{ entry.xp | number }} XP
                  </div>
                } @else {
                  <!-- Game-Specific Columns -->
                  <div class="col-span-3 sm:col-span-3 text-right font-mono font-bold text-[var(--color-accent-to)] text-xs sm:text-sm">
                    @if (isTimeType()) {
                      ⚡ {{ formatTime(entry.best_time) }}
                    } @else {
                      🏆 {{ (entry.best_score || entry.rating || 0) | number }}
                    }
                  </div>
                  <div class="col-span-3 sm:col-span-2 text-right text-xs sm:text-sm text-[var(--color-text-muted)]">
                    @if (entry.win_count > 0 && entry.play_count > 0) {
                      <span>{{ entry.play_count }} <span class="text-[10px] opacity-75">({{ getWinRate(entry) }}%)</span></span>
                    } @else {
                      <span>{{ entry.play_count }}</span>
                    }
                  </div>
                  <div class="hidden sm:flex col-span-2 text-right font-mono font-bold text-amber-500 items-center justify-end gap-1 text-xs sm:text-sm">
                    <span class="text-xs">🪙</span>
                    <span>{{ (entry.brain_coins || 0) | number }}</span>
                  </div>
                }
              </div>
            }
          }
        </div>

        <!-- Pagination Controls -->
        @if (data() && (data()!.total || 0) > 0) {
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-xs">
            <div class="text-xs sm:text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full bg-[var(--color-accent-from)]"></span>
              <span>{{ totalPlayersLabel() }}</span>
            </div>

            <div class="flex items-center gap-3">
              <button
                (click)="prevPage()"
                [disabled]="currentPage() <= 1 || isLoading()"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-all hover:bg-[var(--color-accent-from)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                ← {{ i18n.t('leaderboard.prev')() || '上一页' }}
              </button>

              <span class="text-xs font-mono font-bold text-[var(--color-text-main)] px-2">
                {{ pageInfoLabel() }}
              </span>

              <button
                (click)="nextPage()"
                [disabled]="currentPage() >= (data()?.total_pages || 1) || isLoading()"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-all hover:bg-[var(--color-accent-from)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                {{ i18n.t('leaderboard.next')() || '下一页' }} →
              </button>
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class LeaderboardComponent implements OnInit {
  i18n = inject(I18nService);
  private friendService = inject(FriendService);
  authStore = inject(AuthStore);
  private leaderboardService = inject(LeaderboardService);
  private statsService = inject(GameStatsService);
  private gameRegistry = inject(GameRegistryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  games = GAME_DEFINITIONS;

  selectedGameId = signal<string>('global');
  selectedDifficulty = signal<string>('all');
  selectedPeriod = signal<string>('all');
  currentPage = signal<number>(1);

  isLoading = signal(false);
  data = signal<LeaderboardResponse | null>(null);

  pinnacleRecords = signal<GameDifficultyRecord[]>([]);
  loadingPinnacle = signal<boolean>(false);

  selectedGame = computed(() => GAME_DEFINITIONS.find(g => g.id === this.selectedGameId()));

  selectedGameTitle = computed(() => {
    const g = this.selectedGame();
    if (!g) return '';
    return this.i18n.t(g.titleKey)() || g.id;
  });

  gameDifficulties = computed(() => {
    const gameId = this.selectedGameId();
    if (gameId === 'global') return [];
    const config = this.gameRegistry.getConfig(gameId);
    return config?.difficulties || [];
  });

  totalPlayersLabel = computed(() => {
    const total = this.data()?.total || 0;
    const raw = this.i18n.t('leaderboard.total_players', { total })() || `共 ${total} 位玩家`;
    return raw.replace(/\[total\]/g, String(total)).replace(/\{total\}/g, String(total));
  });

  pageInfoLabel = computed(() => {
    const page = this.currentPage();
    const total = this.data()?.total_pages || 1;
    const raw = this.i18n.t('leaderboard.page', { page, total })() || `${page} / ${total}`;
    return raw
      .replace(/\[page\]/g, String(page))
      .replace(/\{page\}/g, String(page))
      .replace(/\[total\]/g, String(total))
      .replace(/\{total\}/g, String(total));
  });

  isTimeType = computed(() => {
    const timeGames = ['nonogram', 'minesweeper', 'sudoku', 'sliding', 'codebreaker', 'math24', 'watersort', 'sokoban', 'lightsout'];
    return timeGames.includes(this.selectedGameId());
  });

  ngOnInit(): void {
    // Check if game or difficulty is requested via query params
    const initialGame = this.route.snapshot.queryParams['game'];
    const initialDiff = this.route.snapshot.queryParams['difficulty'];
    if (initialGame && (initialGame === 'global' || this.games.some(g => g.id === initialGame))) {
      this.selectedGameId.set(initialGame);
      if (initialDiff) {
        this.selectedDifficulty.set(initialDiff);
      }
    }
    this.reloadAll();
  }

  selectGame(gameId: string): void {
    if (this.selectedGameId() === gameId) return;
    this.selectedGameId.set(gameId);
    this.selectedDifficulty.set('all');
    this.currentPage.set(1);
    this.reloadAll();
  }

  setDifficulty(diffId: string): void {
    if (this.selectedDifficulty() === diffId) return;
    this.selectedDifficulty.set(diffId);
    this.currentPage.set(1);
    this.loadTable();
  }

  setPeriod(p: string): void {
    if (this.selectedPeriod() !== p) {
      this.selectedPeriod.set(p);
      this.currentPage.set(1);
      this.loadTable();
    }
  }

  private reloadAll(): void {
    const gameId = this.selectedGameId();
    if (gameId !== 'global') {
      this.fetchPinnacleRecords(gameId);
    } else {
      this.pinnacleRecords.set([]);
    }
    this.loadTable();
  }

  private fetchPinnacleRecords(gameId: string): void {
    this.loadingPinnacle.set(true);
    this.statsService.getGameDifficultyRecords(gameId).subscribe({
      next: res => {
        this.pinnacleRecords.set(res.records || []);
        this.loadingPinnacle.set(false);
      },
      error: () => {
        this.pinnacleRecords.set([]);
        this.loadingPinnacle.set(false);
      }
    });
  }

  private loadTable(): void {
    this.isLoading.set(true);
    const options: any = {
      period: this.selectedPeriod(),
      page: this.currentPage(),
      limit: 20,
    };
    if (this.selectedDifficulty() !== 'all') {
      options.difficulty = this.selectedDifficulty();
    }

    this.leaderboardService.getLeaderboard(this.selectedGameId(), options).subscribe({
      next: r => { this.data.set(r); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); }
    });
  }

  challengeRecord(difficulty?: string): void {
    const lang = this.i18n.currentLang();
    const gameId = this.selectedGameId();
    if (gameId === 'global') return;
    const qp: any = {};
    if (difficulty && difficulty !== 'all') {
      qp.difficulty = difficulty;
    }
    this.router.navigate([`/${lang}/games/${gameId}`], { queryParams: qp });
  }

  getDifficultyName(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        return match.labelKey ? (this.i18n.t(match.labelKey)() || match.id) : match.id;
      }
    }
    const dict: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      master: '大师',
      '3x3': '3×3 阶',
      '4x4': '4×4 阶',
      '5x5': '5×5 阶'
    };
    return dict[diffId] || diffId;
  }

  getDifficultySpec(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        return match.descKey ? (this.i18n.t(match.descKey)() || match.desc || '') : (match.desc || '');
      }
    }
    return '';
  }

  getDifficultyDotClass(diff: string): string {
    switch (diff?.toLowerCase()) {
      case 'easy':
      case '3x3':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'medium':
      case '4x4':
        return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      case 'hard':
      case '5x5':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'expert':
        return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
      case 'master':
        return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      default:
        return 'bg-zinc-400';
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadTable();
    }
  }

  nextPage(): void {
    const totalPages = this.data()?.total_pages ?? 1;
    if (this.currentPage() < totalPages) {
      this.currentPage.update(p => p + 1);
      this.loadTable();
    }
  }

  rankColor(rank: number): string {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-[var(--color-text-muted)]';
  }

  rankMedal(rank: number): string {
    return ['🥇','🥈','🥉'][rank - 1] ?? String(rank);
  }

  formatTime(s: number): string {
    if (!s || s <= 0) return '--:--';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  formatAchievedDate(dateStr: string): string {
    if (!dateStr || dateStr.startsWith('0001')) return '';
    try {
      const date = new Date(dateStr);
      const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) return '刚刚';
      if (diffHours < 24) return `${Math.floor(diffHours)}小时前`;
      if (diffHours < 48) return '昨天';
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '';
    }
  }

  getWinRate(entry: LeaderboardEntry): string {
    if (entry.play_count === 0) return '0.0';
    return ((entry.win_count / entry.play_count) * 100).toFixed(1);
  }

  private toast = inject(ToastService);

  addFriend(userId: number) {
    this.friendService.sendRequest(userId).subscribe(() => {
      this.toast.success(this.i18n.t('game.friend_request_sent')() || '好友请求已发送');
    });
  }
}
