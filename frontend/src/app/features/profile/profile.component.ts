import { GameMode } from "../../core/models/game.model";
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameStatsService, UserGameStat, PKBattle, MyPKStatsSummary } from '../../core/services/game-stats.service';
import { GameService, getLocalizedField } from '../../core/services/game.service';
import { AuthStore } from '../../core/auth/auth.store';
import { XpService } from '../../core/services/xp.service';
import { AchievementService, AchievementWithStatus } from '../../core/services/achievement.service';
import { LeaderboardService, RankEntry } from '../../core/services/leaderboard.service';
import { LevelBadgeComponent } from '../../shared/components/level-badge/level-badge.component';
import { AvatarFrameComponent } from '../../shared/components/avatar-frame/avatar-frame.component';
import { BrainRadarComponent } from '../../shared/components/brain-radar/brain-radar.component';
import { BrainRadarService, BrainRadarData } from '../../core/services/brain-radar.service';
import { ShopService, ShopResponse } from "../../core/services/shop.service";
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
import { ShareService } from '../../core/services/share.service';
import { ShareImageService, ProfileCardData } from '../../core/services/share-image.service';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { getOrigin, isBrowser } from '../../core/utils/browser.util';

import { CoinIconComponent } from '../../shared/components/coin-icon/coin-icon.component';
import { ChangePasswordModalComponent } from '../../shared/components/change-password-modal/change-password-modal.component';

type Tab = 'overview' | 'shop' | 'achievements' | 'rankings' | 'history';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, LevelBadgeComponent, AvatarFrameComponent, BrainRadarComponent, CoinIconComponent, ChangePasswordModalComponent],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] py-4 md:py-8">
      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col gap-6">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-[var(--color-border-card)] pb-6">
          <!-- Avatar with dynamic frame -->
          <div class="relative">
            <app-avatar-frame
              [frame]="authStore.currentUser()?.equipped_frame || 'none'"
              [size]="'xl'"
            />
          </div>

          <div class="flex-1 min-w-0 flex flex-col items-center sm:items-start">
            <div class="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]">
                {{ authStore.currentUser()?.username || 'Player' }}
              </h1>
              <app-level-badge [level]="authStore.currentUser()?.level ?? 1" />

              <!-- Equipped Title Badge -->
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-1 shadow-xs">
                📜 {{ i18n.t('shop.title_' + (authStore.currentUser()?.equipped_title || 'novice'))() }}
              </span>
            </div>

            <!-- Stats Ribbon (BQ, Coins, Freezes) -->
            <div class="flex items-center gap-2.5 flex-wrap mt-2.5 justify-center sm:justify-start">
              <!-- BQ Rating -->
              <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs">
                <span class="text-xs text-[var(--color-text-muted)] font-bold">🧠 BQ:</span>
                <span class="font-black text-sm text-[var(--color-accent-to)] font-mono">{{ radarData()?.bq || 250 }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] font-bold">
                  {{ i18n.t(radarData()?.tier_key || 'brain.tier_curious')() }}
                </span>
              </div>

              <!-- Brain Coins -->
              <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs">
                <app-coin-icon size="xs" />
                <span class="font-black text-sm text-yellow-500 font-mono">{{ authStore.currentUser()?.brain_coins ?? 0 }}</span>
                <span class="text-[10px] text-[var(--color-text-muted)] font-bold">{{ i18n.t('shop.coins_balance')() }}</span>
              </div>

              <!-- Streak Freezes -->
              <div class="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs">
                <span class="text-sm">🧊</span>
                <span class="font-black text-sm text-cyan-400 font-mono">{{ authStore.currentUser()?.streak_freezes ?? 1 }}/2</span>
                <span class="text-[10px] text-[var(--color-text-muted)] font-bold">{{ i18n.t('streak.freezes_count')() }}</span>
              </div>

              <!-- Login Streak -->
              <div class="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs">
                <span class="text-sm">🔥</span>
                <span class="font-black text-sm text-orange-500 font-mono">{{ authStore.currentUser()?.login_streak ?? 0 }}</span>
                <span class="text-[10px] text-[var(--color-text-muted)] font-bold">{{ i18n.t('xp.days')() }}</span>
              </div>
            </div>

            <!-- XP Bar -->
            @if (authStore.currentUser()) {
              <div class="w-full max-w-md mt-3 flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full bg-[var(--color-border-card)] overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full transition-all duration-700"
                       [style.width.%]="xpProgress().pct">
                  </div>
                </div>
                <span class="text-xs font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                  {{ xpProgress().current }}/{{ xpProgress().total }} XP
                </span>
              </div>

              <div class="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                <button (click)="shareProfile()"
                  class="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] font-bold text-xs transition-all active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {{ i18n.t('share.profile_card')() }}
                </button>

                @if (authStore.currentUser()?.role !== 'guest') {
                  <button (click)="isPasswordModalOpen.set(true)"
                    class="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] font-bold text-xs transition-all active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {{ i18n.t('auth.change_password.title')() }}
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Tab selector -->
        <div class="flex rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-1 gap-1 overflow-x-auto custom-scrollbar">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all"
                    [class]="activeTab() === tab.id
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ tab.icon }} {{ i18n.t(tab.labelKey)() }}
            </button>
          }
        </div>

        <!-- ── Overview Tab (Brain Power Radar + Game Stats) ── -->
        @if (activeTab() === 'overview') {
          <!-- Brain Power Radar Showcase Card -->
          <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-6 shadow-xl relative overflow-hidden">
            <div class="flex flex-col md:flex-row items-center gap-6">
              <!-- Radar Chart SVG -->
              <div class="w-full md:w-1/2 flex justify-center">
                <app-brain-radar
                  [dimensions]="radarData()?.dimensions || []"
                  [bq]="radarData()?.bq || 250"
                />
              </div>

              <!-- Radar Stats & Dimensions breakdown -->
              <div class="w-full md:w-1/2 flex flex-col gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">🧠</span>
                    <h2 class="text-xl font-black text-[var(--color-text-main)]">{{ i18n.t('brain.radar_title')() }}</h2>
                  </div>
                  <p class="text-xs text-[var(--color-text-muted)] mt-1">
                    {{ i18n.t('brain.radar_desc')() }}
                  </p>
                </div>

                <div class="flex flex-col gap-2.5">
                  @for (dim of radarData()?.dimensions || []; track dim.key) {
                    <div class="flex flex-col gap-1">
                      <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>{{ dim.icon }}</span> {{ i18n.t(dim.name_key)() }}
                        </span>
                        <span class="font-mono font-black text-[var(--color-accent-to)]">{{ dim.score }} / 200</span>
                      </div>
                      <div class="h-2 rounded-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full transition-all duration-700"
                             [style.width.%]="dim.pct">
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <div class="pt-2 border-t border-[var(--color-border-card)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>🎮 {{ i18n.t('leaderboard.tab_plays')() }}: <b class="text-[var(--color-text-main)]">{{ radarData()?.total_played || 0 }}</b></span>
                  <span>🏆 {{ i18n.t('leaderboard.tab_wins')() }}: <b class="text-yellow-500">{{ radarData()?.total_wins || 0 }}</b></span>
                  <span>⚡ 综合评级: <b class="text-[var(--color-accent-from)] font-bold">{{ i18n.t(radarData()?.tier_key || 'brain.tier_curious')() }}</b></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Game Personal Best Records -->
          @if (isLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (gamesWithStats().length === 0) {
            <div class="flex flex-col items-center gap-4 py-16 text-[var(--color-text-muted)]">
              <span class="text-5xl opacity-40">🎮</span>
              <p class="font-bold">{{ i18n.t('profile.no_stats')() }}</p>
              <a [routerLink]="['/', i18n.currentLang(), 'lobby']" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm">
                {{ i18n.t('lobby.title')() }}
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              @for (game of gamesWithStats(); track game.id) {
                <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div class="absolute -right-6 -top-6 text-8xl opacity-[0.03] pointer-events-none">{{ getGameEmoji(game.id) }}</div>
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-xl shadow-inner">
                      {{ getGameEmoji(game.id) }}
                    </div>
                    <h3 class="font-bold text-[var(--color-text-main)]">{{ getLocalized(game.name) }}</h3>
                  </div>
                  @for (stat of game.stats; track stat.ID) {
                    <div class="bg-[var(--color-bg-main)] rounded-xl p-3 border border-[var(--color-border-card)] mb-2 last:mb-0">
                      <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-accent-from)]/10 text-[var(--color-text-muted)] border border-[var(--color-accent-from)]/20">
                          {{ formatModeAndDiff(stat) }}
                        </span>
                        <span class="text-[10px] text-[var(--color-text-muted)]">🎮 {{ stat.PlayCount }}</span>
                      </div>
                      @if (isTimeGame(game.id)) {
                        <p class="font-mono text-xl font-black text-[var(--color-accent-to)]">
                          {{ stat.BestTime > 0 ? formatTime(stat.BestTime) : '--:--' }}
                        </p>
                      } @else {
                        <p class="font-mono text-xl font-black text-amber-400">{{ stat.BestScore }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ── Shop / Cosmetics Hub Tab ── -->
        @if (activeTab() === 'shop') {
          <div class="flex flex-col gap-6">
            <!-- Balance Card -->
            <div class="bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-main)] rounded-2xl border border-[var(--color-border-card)] p-5 flex items-center justify-between flex-wrap gap-4 shadow-lg">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-inner">
                  <app-coin-icon size="lg" />
                </div>
                <div>
                  <h3 class="font-black text-lg text-[var(--color-text-main)]">{{ i18n.t('shop.coins_balance')() }}</h3>
                  <p class="text-xs text-[var(--color-text-muted)]">玩游戏、做每日任务或达成连胜即可免费赚取金币</p>
                </div>
              </div>
              <div class="text-3xl font-black font-mono text-yellow-500 drop-shadow-sm">
                {{ authStore.currentUser()?.brain_coins ?? 0 }}
              </div>
            </div>

            <!-- Frames Section -->
            <div class="flex flex-col gap-3">
              <h3 class="text-lg font-black text-[var(--color-text-main)] flex items-center gap-2">
                <span>🖼️</span> {{ i18n.t('shop.frames')() }}
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (item of shopCatalog()?.frames || []; track item.id) {
                  <div class="bg-[var(--color-bg-card)] rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all"
                       [class]="item.equipped ? 'border-[var(--color-accent-from)] shadow-md shadow-[var(--color-accent-from)]/10' : 'border-[var(--color-border-card)]'">
                    <div class="flex items-center gap-3">
                      <app-avatar-frame [frame]="item.id" [size]="'lg'" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h4 class="font-bold text-sm text-[var(--color-text-main)]">{{ i18n.t(item.name_key)() }}</h4>
                          @if (item.rarity === 'legendary') {
                            <span class="text-[9px] px-1 rounded bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">传说</span>
                          } @else if (item.rarity === 'epic') {
                            <span class="text-[9px] px-1 rounded bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30">史诗</span>
                          }
                        </div>
                        <p class="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{{ i18n.t(item.desc_key)() }}</p>
                        @if (item.unlock_hint) {
                          <p class="text-[10px] text-cyan-400 mt-1 font-bold">✨ {{ item.unlock_hint }}</p>
                        }
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-[var(--color-border-card)]">
                      <span class="text-xs font-mono font-bold text-yellow-500 flex items-center gap-1">
                        @if (item.price === 0) {
                          <span>免费</span>
                        } @else {
                          <app-coin-icon size="xs" />
                          <span>{{ item.price }}</span>
                        }
                      </span>
                      @if (item.equipped) {
                        <button disabled class="px-3 py-1 rounded-xl bg-green-500/20 text-green-400 font-bold text-xs border border-green-500/30">
                          ✅ {{ i18n.t('shop.equipped')() }}
                        </button>
                      } @else if (item.unlocked) {
                        <button (click)="equipItem(item.id, 'frame')"
                                class="px-3 py-1 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all">
                          {{ i18n.t('shop.equip')() }}
                        </button>
                      } @else {
                        <button (click)="buyItem(item.id, 'frame', item.price)"
                                [disabled]="(authStore.currentUser()?.brain_coins || 0) < item.price"
                                class="px-3 py-1 rounded-xl bg-amber-500 text-slate-900 font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none">
                          {{ i18n.t('shop.buy')() }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Titles Section -->
            <div class="flex flex-col gap-3">
              <h3 class="text-lg font-black text-[var(--color-text-main)] flex items-center gap-2">
                <span>📜</span> {{ i18n.t('shop.titles')() }}
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (item of shopCatalog()?.titles || []; track item.id) {
                  <div class="bg-[var(--color-bg-card)] rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all"
                       [class]="item.equipped ? 'border-[var(--color-accent-from)] shadow-md shadow-[var(--color-accent-from)]/10' : 'border-[var(--color-border-card)]'">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center text-xl shadow-inner">
                        {{ item.icon }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h4 class="font-bold text-sm text-[var(--color-text-main)]">{{ i18n.t(item.name_key)() }}</h4>
                          @if (item.rarity === 'legendary') {
                            <span class="text-[9px] px-1 rounded bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">传说</span>
                          }
                        </div>
                        <p class="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{{ i18n.t(item.desc_key)() }}</p>
                        @if (item.unlock_hint) {
                          <p class="text-[10px] text-cyan-400 mt-1 font-bold">✨ {{ item.unlock_hint }}</p>
                        }
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-[var(--color-border-card)]">
                      <span class="text-xs font-mono font-bold text-yellow-500 flex items-center gap-1">
                        @if (item.price === 0) {
                          <span>免费</span>
                        } @else {
                          <app-coin-icon size="xs" />
                          <span>{{ item.price }}</span>
                        }
                      </span>
                      @if (item.equipped) {
                        <button disabled class="px-3 py-1 rounded-xl bg-green-500/20 text-green-400 font-bold text-xs border border-green-500/30">
                          ✅ {{ i18n.t('shop.equipped')() }}
                        </button>
                      } @else if (item.unlocked) {
                        <button (click)="equipItem(item.id, 'title')"
                                class="px-3 py-1 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all">
                          {{ i18n.t('shop.equip')() }}
                        </button>
                      } @else {
                        <button (click)="buyItem(item.id, 'title', item.price)"
                                [disabled]="(authStore.currentUser()?.brain_coins || 0) < item.price"
                                class="px-3 py-1 rounded-xl bg-amber-500 text-slate-900 font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none">
                          {{ i18n.t('shop.buy')() }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ── Achievements Tab ── -->
        @if (activeTab() === 'achievements') {
          @if (achievementsLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else {
            <div class="flex flex-col gap-6">
              <div class="flex items-center justify-between bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4">
                <span class="text-sm font-bold text-[var(--color-text-main)]">{{ i18n.t('profile.achievements_progress')() }}</span>
                <span class="font-mono text-sm font-black text-[var(--color-accent-to)]">{{ unlockedCount() }}/{{ achievements().length }}</span>
              </div>
              @for (cat of achievementCategories(); track cat) {
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    {{ i18n.t('achievement.category.' + cat)() || cat }}
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    @for (ach of achievementsByCategory(cat); track ach.id) {
                      <div class="flex items-start gap-3 p-3 rounded-2xl border transition-all"
                           [class]="ach.unlocked_at
                             ? 'bg-[var(--color-bg-card)] border-[var(--color-border-card)] shadow-sm'
                             : 'bg-[var(--color-bg-card)]/40 border-[var(--color-border-card)]/40 opacity-50'">
                        <span class="text-2xl mt-0.5">{{ ach.icon_emoji }}</span>
                        <div class="flex-1 min-w-0">
                          <p class="font-bold text-xs text-[var(--color-text-main)] truncate">{{ i18n.t(ach.title_key)() || ach.id }}</p>
                          <p class="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{{ i18n.t(ach.desc_key)() }}</p>
                          <span class="text-[10px] font-bold text-[var(--color-accent-to)] mt-1 inline-block">+{{ ach.xp_reward }} XP</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- ── Rankings Tab ── -->
        @if (activeTab() === 'rankings') {
          @if (ranksLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (myRanks().length === 0) {
            <div class="flex flex-col items-center gap-4 py-16 text-[var(--color-text-muted)]">
              <span class="text-5xl opacity-40">🏆</span>
              <p class="font-bold">{{ i18n.t('profile.no_ranks')() }}</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (r of myRanks(); track r.game_id) {
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                  <span class="text-xl font-black w-8 text-center" [ngClass]="rankColor(r.rank)">
                    {{ rankMedal(r.rank) }}
                  </span>
                  <div class="flex-1">
                    <p class="font-bold text-sm text-[var(--color-text-main)]">{{ getGameNameById(r.game_id) }}</p>
                    <p class="text-xs text-[var(--color-text-muted)] font-mono">
                      {{ isTimeGame(r.game_id) ? formatTime(r.best_time) : r.best_score }}
                    </p>
                  </div>
                  <span class="text-xs font-mono font-bold text-[var(--color-accent-to)]">#{{ r.rank }}</span>
                </div>
              }
            </div>
          }
        }

        <!-- ── History Tab ── -->
        @if (activeTab() === 'history') {
          <div class="flex flex-col gap-5">
            
            <!-- History Mode Switcher: PK Battles vs Solo Matches -->
            <div class="flex items-center gap-2 border-b border-[var(--color-border-card)] pb-3">
              <button (click)="historySubTab.set('pk')"
                      class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 border"
                      [class.bg-[var(--color-accent-from)]]="historySubTab() === 'pk'"
                      [class.text-white]="historySubTab() === 'pk'"
                      [class.border-transparent]="historySubTab() === 'pk'"
                      [class.shadow-xs]="historySubTab() === 'pk'"
                      [class.bg-[var(--color-bg-card)]]="historySubTab() !== 'pk'"
                      [class.text-[var(--color-text-secondary)]]="historySubTab() !== 'pk'"
                      [class.border-[var(--color-border-card)]]="historySubTab() !== 'pk'">
                <span>⚔️</span>
                <span>{{ i18n.t('profile.tab_pk_battles')() || '会员对战战报' }}</span>
                @if (pkSummary()?.total_matches) {
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                        [class.bg-white/20]="historySubTab() === 'pk'"
                        [class.bg-[var(--color-bg-main)]]="historySubTab() !== 'pk'">
                    {{ pkSummary()?.total_matches }}
                  </span>
                }
              </button>

              <button (click)="historySubTab.set('solo')"
                      class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 border"
                      [class.bg-[var(--color-accent-from)]]="historySubTab() === 'solo'"
                      [class.text-white]="historySubTab() === 'solo'"
                      [class.border-transparent]="historySubTab() === 'solo'"
                      [class.shadow-xs]="historySubTab() === 'solo'"
                      [class.bg-[var(--color-bg-card)]]="historySubTab() !== 'solo'"
                      [class.text-[var(--color-text-secondary)]]="historySubTab() !== 'solo'"
                      [class.border-[var(--color-border-card)]]="historySubTab() !== 'solo'">
                <span>👤</span>
                <span>{{ i18n.t('profile.tab_solo_history')() || '单人通关流水' }}</span>
              </button>
            </div>

            <!-- PK Battles View -->
            @if (historySubTab() === 'pk') {
              @if (pkBattlesLoading()) {
                <div class="flex justify-center py-16">
                  <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
                </div>
              } @else {
                <!-- Career PK Stats Summary Deck -->
                @if (pkSummary(); as sum) {
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="p-3 sm:p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex flex-col gap-1 shadow-2xs">
                      <span class="text-[11px] font-bold text-[var(--color-text-secondary)]">总对战场次</span>
                      <span class="text-xl sm:text-2xl font-black font-mono text-[var(--color-text-main)]">{{ sum.total_matches }}</span>
                    </div>

                    <div class="p-3 sm:p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex flex-col gap-1 shadow-2xs">
                      <span class="text-[11px] font-bold text-[var(--color-text-secondary)]">胜 / 负</span>
                      <div class="flex items-baseline gap-1 text-xl sm:text-2xl font-black font-mono">
                        <span class="text-emerald-500">{{ sum.wins }}</span>
                        <span class="text-xs text-[var(--color-text-muted)]">/</span>
                        <span class="text-rose-500">{{ sum.losses }}</span>
                      </div>
                    </div>

                    <div class="p-3 sm:p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex flex-col gap-1 shadow-2xs">
                      <span class="text-[11px] font-bold text-[var(--color-text-secondary)]">PK 胜率</span>
                      <span class="text-xl sm:text-2xl font-black font-mono text-amber-500">{{ sum.win_rate }}%</span>
                    </div>

                    <div class="p-3 sm:p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex flex-col gap-1 shadow-2xs">
                      <span class="text-[11px] font-bold text-[var(--color-text-secondary)]">赢取脑币</span>
                      <span class="text-xl sm:text-2xl font-black font-mono text-yellow-500 flex items-center gap-1">
                        <span>💰</span>
                        <span>{{ sum.total_bounty_won }}</span>
                      </span>
                    </div>
                  </div>
                }

                <!-- Battle Stream -->
                @if (pkBattles().length === 0) {
                  <div class="flex flex-col items-center gap-3 py-16 text-[var(--color-text-muted)] bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)]">
                    <span class="text-5xl opacity-40">⚔️</span>
                    <p class="font-bold text-sm">{{ i18n.t('profile.no_pk_history')() || '暂无会员对战记录，快去多人竞技场开房对战吧！' }}</p>
                    <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']"
                       class="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all">
                      ⚡ 发起联机对决
                    </a>
                  </div>
                } @else {
                  <div class="flex flex-col gap-3">
                    @for (b of pkBattles(); track b.id) {
                      <div class="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-bg-card)] border flex flex-col gap-3 shadow-xs transition-all border-l-4"
                           [class.border-emerald-500/40]="isCurrentUserWinner(b)"
                           [class.border-l-emerald-500]="isCurrentUserWinner(b)"
                           [class.border-rose-500/30]="!isCurrentUserWinner(b)"
                           [class.border-l-rose-500]="!isCurrentUserWinner(b)">
                        
                        <!-- Top Bar: Game, Mode, Difficulty & Status Badge -->
                        <div class="flex items-center justify-between gap-2 text-xs">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xl sm:text-2xl shrink-0">{{ getGameEmoji(b.game_id) }}</span>
                            <span class="font-black text-sm sm:text-base text-[var(--color-text-main)]">{{ getGameNameById(b.game_id) }}</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold" [ngClass]="getDifficultyBadgeClass(b.difficulty)">
                              {{ getDifficultyLabel(b.game_id, b.difficulty) }}
                            </span>
                            <span class="text-[11px] text-[var(--color-text-muted)] font-mono">
                              {{ formatDate(b.played_at) }}
                            </span>
                          </div>

                          <!-- Outcome Pill & Bounty -->
                          <div class="flex items-center gap-2 shrink-0">
                            @if (b.bounty_coins > 0) {
                              <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                                    [class.bg-emerald-500/15]="isCurrentUserWinner(b)"
                                    [class.text-emerald-500]="isCurrentUserWinner(b)"
                                    [class.bg-rose-500/15]="!isCurrentUserWinner(b)"
                                    [class.text-rose-500]="!isCurrentUserWinner(b)">
                                🪙 {{ isCurrentUserWinner(b) ? '+' : '-' }}{{ b.bounty_coins }}
                              </span>
                            }
                            <span class="text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1 shadow-xs"
                                  [class]="isCurrentUserWinner(b)
                                    ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/15'
                                    : 'text-rose-500 border-rose-500/40 bg-rose-500/15'">
                              <span>{{ isCurrentUserWinner(b) ? '👑' : '🛡️' }}</span>
                              <span>{{ isCurrentUserWinner(b) ? '胜利 WIN' : '惜败 LOSS' }}</span>
                            </span>
                          </div>
                        </div>

                        <!-- Direct Head-to-Head Comparison Grid: 我 (Me) VS 对手 (Opponent) -->
                        <div class="grid grid-cols-11 items-center bg-[var(--color-bg-main)]/80 rounded-xl p-2.5 sm:p-3 border border-[var(--color-border-card)]">
                          
                          <!-- My Side (5 cols) -->
                          <div class="col-span-5 flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                 [class.bg-emerald-500/20]="isCurrentUserWinner(b)"
                                 [class.text-emerald-500]="isCurrentUserWinner(b)"
                                 [class.bg-rose-500/20]="!isCurrentUserWinner(b)"
                                 [class.text-rose-500]="!isCurrentUserWinner(b)">
                              {{ isCurrentUserWinner(b) ? '👑' : '我' }}
                            </div>
                            <div class="min-w-0 flex-1">
                              <div class="flex items-center gap-1.5">
                                <span class="text-xs sm:text-sm font-black truncate"
                                      [class.text-emerald-500]="isCurrentUserWinner(b)"
                                      [class.text-[var(--color-text-main)]]="!isCurrentUserWinner(b)">
                                  {{ isCurrentUserWinner(b) ? (b.winner?.username || '我') : (b.loser?.username || '我') }}
                                </span>
                                <span class="text-[9px] px-1 py-0.1 rounded font-black shrink-0"
                                      [class.bg-emerald-500/20]="isCurrentUserWinner(b)"
                                      [class.text-emerald-500]="isCurrentUserWinner(b)"
                                      [class.bg-zinc-500/20]="!isCurrentUserWinner(b)"
                                      [class.text-[var(--color-text-muted)]]="!isCurrentUserWinner(b)">
                                  {{ isCurrentUserWinner(b) ? '胜' : '负' }}
                                </span>
                              </div>
                              <div class="text-xs sm:text-sm font-mono font-black mt-0.5"
                                   [class.text-emerald-500]="isCurrentUserWinner(b)"
                                   [class.text-[var(--color-text-muted)]]="!isCurrentUserWinner(b)">
                                {{ isCurrentUserWinner(b)
                                    ? formatScoreOrTime(b.game_id, b.winner_time, b.winner_score, true)
                                    : formatScoreOrTime(b.game_id, b.loser_time, b.loser_score, false) }}
                              </div>
                            </div>
                          </div>

                          <!-- Center VS & Margin (1 col) -->
                          <div class="col-span-1 flex flex-col items-center justify-center shrink-0">
                            <span class="text-xs font-black italic text-[var(--color-text-muted)]">VS</span>
                            @if (b.margin > 0) {
                              <span class="text-[9px] font-mono font-bold px-1 rounded whitespace-nowrap mt-0.5"
                                    [class.text-emerald-500]="isCurrentUserWinner(b)"
                                    [class.bg-emerald-500/10]="isCurrentUserWinner(b)"
                                    [class.text-rose-400]="!isCurrentUserWinner(b)"
                                    [class.bg-rose-500/10]="!isCurrentUserWinner(b)">
                                {{ isCurrentUserWinner(b) ? '+' : '-' }}{{ b.margin }}{{ isTimeGame(b.game_id) ? 's' : '' }}
                              </span>
                            }
                          </div>

                          <!-- Opponent Side (5 cols) -->
                          <div class="col-span-5 flex items-center justify-end gap-2.5 min-w-0 text-right">
                            <div class="min-w-0 flex-1">
                              <div class="flex items-center justify-end gap-1.5">
                                <span class="text-[9px] px-1 py-0.1 rounded font-black shrink-0"
                                      [class.bg-emerald-500/20]="!isCurrentUserWinner(b)"
                                      [class.text-emerald-500]="!isCurrentUserWinner(b)"
                                      [class.bg-zinc-500/20]="isCurrentUserWinner(b)"
                                      [class.text-[var(--color-text-muted)]]="isCurrentUserWinner(b)">
                                  {{ isCurrentUserWinner(b) ? '负' : '胜' }}
                                </span>
                                <span class="text-xs sm:text-sm font-bold truncate"
                                      [class.text-emerald-500]="!isCurrentUserWinner(b)"
                                      [class.text-[var(--color-text-secondary)]]="isCurrentUserWinner(b)">
                                  {{ isCurrentUserWinner(b) ? (b.loser?.username || '对手') : (b.winner?.username || '对手') }}
                                </span>
                              </div>
                              <div class="text-xs sm:text-sm font-mono mt-0.5"
                                   [class.text-emerald-500]="!isCurrentUserWinner(b)"
                                   [class.text-[var(--color-text-muted)]]="isCurrentUserWinner(b)">
                                {{ isCurrentUserWinner(b)
                                    ? formatScoreOrTime(b.game_id, b.loser_time, b.loser_score, false)
                                    : formatScoreOrTime(b.game_id, b.winner_time, b.winner_score, true) }}
                              </div>
                            </div>
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 opacity-80"
                                 [class.bg-emerald-500/20]="!isCurrentUserWinner(b)"
                                 [class.text-emerald-500]="!isCurrentUserWinner(b)"
                                 [class.bg-zinc-500/20]="isCurrentUserWinner(b)"
                                 [class.text-[var(--color-text-muted)]]="isCurrentUserWinner(b)">
                              {{ isCurrentUserWinner(b) ? '敌' : '👑' }}
                            </div>
                          </div>

                        </div>

                      </div>
                    }
                  </div>
                }
              }
            }

            <!-- Solo Matches View -->
            @if (historySubTab() === 'solo') {
              @if (historyLoading()) {
                <div class="flex justify-center py-16">
                  <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
                </div>
              } @else if (matchHistory().length === 0) {
                <div class="flex flex-col items-center gap-4 py-16 text-[var(--color-text-muted)]">
                  <span class="text-5xl opacity-40">📋</span>
                  <p class="font-bold">{{ i18n.t('profile.no_history')() }}</p>
                </div>
              } @else {
                <div class="flex flex-col gap-3">
                  @for (h of matchHistory(); track h.id) {
                    <div class="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                      <div class="flex items-center gap-3">
                        <span class="text-2xl">{{ getGameEmoji(h.game_id) }}</span>
                        <div>
                          <p class="font-bold text-sm text-[var(--color-text-main)]">{{ getGameNameById(h.game_id) }}</p>
                          <p class="text-xs text-[var(--color-text-muted)]">{{ formatDate(h.created_at) }}</p>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-0.5">
                        <span class="text-xs font-bold px-2 py-0.5 rounded-full border"
                              [class]="h.result === 'win' || h.result === 'completed'
                                ? 'text-green-300 border-green-400/40 bg-green-400/10'
                                : 'text-red-300 border-red-400/40 bg-red-400/10'">
                          {{ i18n.t('history.result.' + h.result)() || h.result }}
                        </span>
                        <span class="text-[11px] font-bold text-[var(--color-accent-to)]">+{{ h.xp_earned }} XP</span>
                      </div>
                    </div>
                  }
                </div>
              }
            }

          </div>
        }

      </div>

      <!-- Change Password Modal -->
      <app-change-password-modal
        [isOpen]="isPasswordModalOpen()"
        (closed)="isPasswordModalOpen.set(false)"
      />
    </div>
  `
})
export class ProfileComponent implements OnInit {
  isPasswordModalOpen = signal(false);
  GameMode = GameMode;
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  xpService = inject(XpService);
  achievementService = inject(AchievementService);
  private statsService = inject(GameStatsService);
  private gameService = inject(GameService);
  private leaderboardService = inject(LeaderboardService);
  private brainRadarService = inject(BrainRadarService);
  private shopService = inject(ShopService);
  private shareService = inject(ShareService);
  private shareImageService = inject(ShareImageService);
  private gameRegistry = inject(GameRegistryService);

  activeTab = signal<Tab>('overview');

  tabs = [
    { id: 'overview' as Tab,     icon: '📊', labelKey: 'profile.tab.overview' },
    { id: 'shop' as Tab,         icon: '✨', labelKey: 'shop.tab_title' },
    { id: 'achievements' as Tab, icon: '🏅', labelKey: 'profile.tab.achievements' },
    { id: 'rankings' as Tab,     icon: '🏆', labelKey: 'profile.tab.rankings' },
    { id: 'history' as Tab,      icon: '📋', labelKey: 'profile.tab.history' },
  ];

  // Brain Radar
  radarData = signal<BrainRadarData | null>(null);

  // Shop
  shopCatalog = signal<ShopResponse | null>(null);

  // Overview
  isLoading = signal(true);
  gamesWithStats = signal<any[]>([]);

  // Achievements
  achievementsLoading = signal(false);
  achievements = signal<AchievementWithStatus[]>([]);

  unlockedCount = computed(() => this.achievements().filter(a => !!a.unlocked_at).length);
  achievementCategories = computed(() => [...new Set(this.achievements().map(a => a.category))]);

  achievementsByCategory(cat: string): AchievementWithStatus[] {
    return this.achievements().filter(a => a.category === cat);
  }

  // Rankings
  ranksLoading = signal(false);
  myRanks = signal<RankEntry[]>([]);

  // History
  historyLoading = signal(false);
  matchHistory = signal<any[]>([]);
  historySubTab = signal<'pk' | 'solo'>('pk');
  pkBattles = signal<PKBattle[]>([]);
  pkSummary = signal<MyPKStatsSummary | null>(null);
  pkBattlesLoading = signal(false);

  xpProgress = computed(() => {
    const u = this.authStore.currentUser();
    return u ? this.xpService.levelProgress(u.xp) : { level: 1, xp: 0, current: 0, total: 100, pct: 0 };
  });

  ngOnInit() {
    this.loadRadar();
    this.loadShop();
    if (!this.authStore.isAuthenticated()) {
      this.isLoading.set(false);
      return;
    }
    this.loadStats();
    this.loadAchievements();
    this.loadRanks();
    this.loadHistory();
    this.loadPKBattles();
  }

  private loadRadar(): void {
    this.brainRadarService.getRadar().subscribe({
      next: r => this.radarData.set(r),
      error: () => {},
    });
  }

  private loadShop(): void {
    this.shopService.getCatalog().subscribe({
      next: c => this.shopCatalog.set(c),
      error: () => {},
    });
  }

  buyItem(itemId: string, itemType: 'frame' | 'title', price: number): void {
    const user = this.authStore.currentUser();
    if (!user || (user.brain_coins || 0) < price) return;
    this.shopService.buyItem(itemId, itemType).subscribe({
      next: () => this.loadShop(),
    });
  }

  equipItem(itemId: string, itemType: 'frame' | 'title'): void {
    this.shopService.equipItem(itemId, itemType).subscribe({
      next: () => this.loadShop(),
    });
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.gameService.getAllGames().subscribe(allGames => {
      this.statsService.getAllStats().subscribe(stats => {
        const grouped = stats.reduce((acc, stat) => {
          if (!acc[stat.GameID]) acc[stat.GameID] = [];
          acc[stat.GameID].push(stat);
          return acc;
        }, {} as Record<string, UserGameStat[]>);

        const games = allGames.filter(g => grouped[g.id]).map(g => ({
          ...g,
          stats: grouped[g.id].sort((a, b) => {
            if (a.Mode !== b.Mode) return a.Mode.localeCompare(b.Mode);
            return a.Difficulty.localeCompare(b.Difficulty);
          })
        }));
        this.gamesWithStats.set(games);
        this.isLoading.set(false);
      });
    });
  }

  private loadAchievements(): void {
    this.achievementsLoading.set(true);
    this.achievementService.getAchievements().subscribe({
      next: a => { this.achievements.set(a); this.achievementsLoading.set(false); },
      error: () => this.achievementsLoading.set(false),
    });
  }

  private loadRanks(): void {
    this.ranksLoading.set(true);
    this.leaderboardService.getMyRanks().subscribe({
      next: r => { this.myRanks.set(r); this.ranksLoading.set(false); },
      error: () => this.ranksLoading.set(false),
    });
  }

  private loadHistory(): void {
    this.historyLoading.set(true);
    this.statsService.getMatchHistory().subscribe({
      next: h => { this.matchHistory.set(h); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false),
    });
  }

  loadPKBattles(): void {
    this.pkBattlesLoading.set(true);
    this.statsService.getMyPKBattles(1, 25).subscribe({
      next: res => {
        this.pkBattles.set(res.battles || []);
        this.pkSummary.set(res.summary);
        this.pkBattlesLoading.set(false);
      },
      error: () => this.pkBattlesLoading.set(false),
    });
  }

  isCurrentUserWinner(b: PKBattle): boolean {
    const curUserId = this.authStore.currentUser()?.id;
    return b.winner_id === curUserId;
  }

  formatSeconds(sec: number): string {
    if (!sec || sec <= 0) return '0s';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m${s > 0 ? s + 's' : ''}`;
  }

  getGameEmoji(id: string): string {
    return GAME_DEFINITIONS.find(g => g.id === id)?.iconEmoji ?? '🎮';
  }

  getGameNameById(id: string): string {
    const g = GAME_DEFINITIONS.find(g => g.id === id);
    return g ? (this.i18n.t(g.titleKey)() || id) : id;
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }

  isTimeGame(gameId: string): boolean {
    const timeGames = ['nonogram', 'minesweeper', 'sudoku', 'sliding', 'codebreaker', 'math24', 'watersort', 'sokoban', 'lightsout'];
    return timeGames.includes(gameId);
  }

  formatScoreOrTime(gameId: string, time: number, score: number, isWinner: boolean): string {
    if (this.isTimeGame(gameId)) {
      if (time > 0) {
        return this.formatSeconds(time);
      }
      return isWinner ? '极速通关' : '未完成';
    }
    if (score > 0) {
      return `${score}分`;
    }
    return isWinner ? '胜出' : '0分';
  }

  getDifficultyLabel(gameId: string, diffId: string): string {
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
      master: '大师'
    };
    return dict[diffId] || diffId;
  }

  getDifficultyBadgeClass(diff: string): string {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'hard':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'expert':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'master':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  }

  formatTime(seconds: number): string {
    if (seconds <= 0) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  formatModeAndDiff(stat: UserGameStat): string {
    let modeStr = stat.Mode === GameMode.Single ? (this.i18n.t('game.single_mode')() || 'Single') : stat.Mode;
    const zhMap: Record<string, string> = {
      'easy': '简单', 'medium': '中等', 'hard': '困难', 'expert': '专家',
      'beginner': '初级', 'intermediate': '中级',
    };
    let diffStr = this.i18n.currentLang() === 'zh' ? (zhMap[stat.Difficulty] || stat.Difficulty) : stat.Difficulty;
    if (!diffStr) return modeStr;
    return `${modeStr} · ${diffStr}`;
  }

  rankColor(rank: number): string {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-[var(--color-text-muted)]';
  }

  rankMedal(rank: number): string {
    return ['🥇','🥈','🥉'][rank - 1] ?? String(rank);
  }

  async shareProfile() {
    const user = this.authStore.currentUser();
    if (!user) return;
    const topStats = this.gamesWithStats().slice(0, 3).map(g => ({
      gameEmoji: this.getGameEmoji(g.id),
      gameName: this.getLocalized(g.name),
      value: g.stats[0] ? (this.isTimeGame(g.id) ? this.formatTime(g.stats[0].BestTime) : String(g.stats[0].BestScore)) : '--'
    }));
    const totalGames = this.gamesWithStats().reduce((s, g) => s + g.stats.reduce((a: number, st: UserGameStat) => a + st.PlayCount, 0), 0);
    const blob = await this.shareImageService.generateProfileCard({
      username: user.username,
      level: user.level ?? 1,
      totalGames,
      topStats,
      siteDomain: getOrigin().replace('https://', '').replace('http://', ''),
    } as ProfileCardData);
    const url = `${getOrigin()}/profile`;
    const text = this.i18n.t('share.profile_text')();
    if (blob && isBrowser()) {
      const file = new File([blob], 'profile-card.png', { type: 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        try { await navigator.share({ title: 'Puzzle PK Profile', text, url, files: [file] } as any); return; } catch {}
      }
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = 'profile-card.png'; a.click();
      URL.revokeObjectURL(objUrl);
    } else {
      this.shareService.share({ title: 'Puzzle PK Profile', text, url });
    }
  }
}
