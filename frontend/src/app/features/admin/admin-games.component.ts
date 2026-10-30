import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameConfig } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';

interface ParsedMeta {
  penaltySeconds?: number;
  icon?: string;
  multiRound?: boolean;
  priority?: number;
  modesJson?: string;
  difficultiesJson?: string;
  winAction?: 'modal' | 'auto_next';
  loseAction?: 'modal' | 'board_overlay' | 'auto_restart';
  autoNextAdFreq?: number;
  autoNextDelayMs?: number;
  [key: string]: any;
}

interface AdminGame extends GameConfig {
  parsedConfig: ParsedMeta;
  rawConfigText: string;
  isSaving?: boolean;
  savedRecently?: boolean;
}

@Component({
  selector: 'app-admin-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-7xl mx-auto flex flex-col gap-6 transition-colors duration-300 pb-12">
      <!-- 页面顶栏 -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <span>🎮</span>
            <span>{{ i18n.t('admin.games.title')() }}</span>
          </h2>
          <p class="opacity-70 text-sm mt-1">
            {{ i18n.t('admin.games.subtitle')() }}
          </p>
        </div>

        <!-- 快速刷新 -->
        <button (click)="fetchGames()" [disabled]="isLoading()"
                class="self-start md:self-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)] text-[var(--color-text-main)] hover:shadow transition-all flex items-center gap-2 disabled:opacity-50">
          <span [class.animate-spin]="isLoading()">🔄</span>
          <span>{{ isLoading() ? i18n.t('admin.games.saving')() : '刷新数据' }}</span>
        </button>
      </div>

      <!-- 全局指标卡片 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span class="text-xs font-bold opacity-60 uppercase tracking-wider">全部游戏 (Total)</span>
          <div class="flex items-baseline justify-between mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--color-text-main)]">{{ totalCount() }}</span>
            <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{{ activeCount() }} 启用</span>
          </div>
        </div>

        <div (click)="setFilter('auto_next')"
             class="bg-[var(--color-bg-card)] border p-4 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:border-emerald-500/50"
             [class.border-emerald-500]="filterTag() === 'auto_next'"
             [class.border-[var(--color-border-card)]]="filterTag() !== 'auto_next'">
          <span class="text-xs font-bold opacity-60 uppercase tracking-wider">⚡ 极速自动下一关</span>
          <div class="flex items-baseline justify-between mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">{{ autoNextCount() }}</span>
            <span class="text-[11px] opacity-50">高连贯心流</span>
          </div>
        </div>

        <div (click)="setFilter('modal')"
             class="bg-[var(--color-bg-card)] border p-4 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:border-[var(--color-accent-from)]/50"
             [class.border-[var(--color-accent-from)]]="filterTag() === 'modal'"
             [class.border-[var(--color-border-card)]]="filterTag() !== 'modal'">
          <span class="text-xs font-bold opacity-60 uppercase tracking-wider">📋 传统弹窗结算</span>
          <div class="flex items-baseline justify-between mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--color-accent-from)]">{{ modalCount() }}</span>
            <span class="text-[11px] opacity-50">标准弹窗</span>
          </div>
        </div>

        <div (click)="setFilter('free_ad')"
             class="bg-[var(--color-bg-card)] border p-4 rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:border-amber-500/50"
             [class.border-amber-500]="filterTag() === 'free_ad'"
             [class.border-[var(--color-border-card)]]="filterTag() !== 'free_ad'">
          <span class="text-xs font-bold opacity-60 uppercase tracking-wider">🛡️ 独立免插屏对局</span>
          <div class="flex items-baseline justify-between mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">{{ freeAdCount() }}</span>
            <span class="text-[11px] opacity-50">频次为 0</span>
          </div>
        </div>
      </div>

      <!-- 搜索与筛选工具栏 -->
      <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div class="relative flex-grow max-w-md">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-sm">🔍</span>
          <input type="text" [(ngModel)]="searchQuery" [placeholder]="i18n.t('admin.games.search_placeholder')()"
                 class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent-from)] transition-colors">
          @if (searchQuery()) {
            <button (click)="searchQuery.set('')" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100">✕</button>
          }
        </div>

        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button (click)="setFilter('all')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  [class.bg-[var(--color-accent-from)]]="filterTag() === 'all'"
                  [class.text-[var(--color-bg-main)]]="filterTag() === 'all'"
                  [class.bg-[var(--color-bg-main)]]="filterTag() !== 'all'"
                  [class.border]="filterTag() !== 'all'"
                  [class.border-[var(--color-border-card)]]="filterTag() !== 'all'">
            {{ i18n.t('admin.games.filter_all')() }} ({{ totalCount() }})
          </button>
          <button (click)="setFilter('auto_next')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  [class.bg-emerald-500]="filterTag() === 'auto_next'"
                  [class.text-white]="filterTag() === 'auto_next'"
                  [class.bg-[var(--color-bg-main)]]="filterTag() !== 'auto_next'"
                  [class.border]="filterTag() !== 'auto_next'"
                  [class.border-[var(--color-border-card)]]="filterTag() !== 'auto_next'">
            {{ i18n.t('admin.games.filter_auto_next')() }} ({{ autoNextCount() }})
          </button>
          <button (click)="setFilter('modal')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  [class.bg-[var(--color-accent-to)]]="filterTag() === 'modal'"
                  [class.text-[var(--color-bg-main)]]="filterTag() === 'modal'"
                  [class.bg-[var(--color-bg-main)]]="filterTag() !== 'modal'"
                  [class.border]="filterTag() !== 'modal'"
                  [class.border-[var(--color-border-card)]]="filterTag() !== 'modal'">
            {{ i18n.t('admin.games.filter_modal')() }} ({{ modalCount() }})
          </button>
          <button (click)="setFilter('free_ad')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  [class.bg-amber-500]="filterTag() === 'free_ad'"
                  [class.text-black]="filterTag() === 'free_ad'"
                  [class.bg-[var(--color-bg-main)]]="filterTag() !== 'free_ad'"
                  [class.border]="filterTag() !== 'free_ad'"
                  [class.border-[var(--color-border-card)]]="filterTag() !== 'free_ad'">
            {{ i18n.t('admin.games.filter_free_ad')() }} ({{ freeAdCount() }})
          </button>
          <button (click)="setFilter('active')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  [class.bg-emerald-500]="filterTag() === 'active'"
                  [class.text-white]="filterTag() === 'active'"
                  [class.bg-[var(--color-bg-main)]]="filterTag() !== 'active'"
                  [class.border]="filterTag() !== 'active'"
                  [class.border-[var(--color-border-card)]]="filterTag() !== 'active'">
            {{ i18n.t('admin.games.filter_active')() }} ({{ activeCount() }})
          </button>
        </div>
      </div>

      <!-- 🖥️ 桌面/平板全景表格视图 (Desktop & Tablet Table) -->
      <div class="hidden md:block bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-[var(--color-border-card)] bg-[var(--color-bg-main)]/50 text-[var(--color-text-main)] uppercase tracking-wider font-extrabold text-[11px] opacity-75">
                <th class="py-3.5 px-4 min-w-[200px]">{{ i18n.t('admin.games.th_game')() }}</th>
                <th class="py-3.5 px-3 text-center min-w-[80px]">{{ i18n.t('admin.games.th_status')() }}</th>
                <th class="py-3.5 px-3 text-center min-w-[95px]">{{ i18n.t('admin.games.priority')() }}</th>
                <th class="py-3.5 px-3 text-center min-w-[90px]">{{ i18n.t('admin.games.th_multi_round')() }}</th>
                <th class="py-3.5 px-3 min-w-[170px]">{{ i18n.t('admin.games.th_win_action')() }}</th>
                <th class="py-3.5 px-3 min-w-[170px]">{{ i18n.t('admin.games.th_lose_action')() }}</th>
                <th class="py-3.5 px-3 min-w-[140px]">{{ i18n.t('admin.games.th_ad_freq')() }}</th>
                <th class="py-3.5 px-3 min-w-[110px]">{{ i18n.t('admin.games.th_delay')() }}</th>
                <th class="py-3.5 px-4 text-right min-w-[110px]">{{ i18n.t('admin.games.th_action')() }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-card)]">
              @for (game of filteredGames(); track game.id) {
                <tr class="hover:bg-[var(--color-bg-main)]/40 transition-colors group">
                  <!-- 游戏标识 -->
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <!-- Emoji 可就地修改 -->
                      <input type="text" [(ngModel)]="game.parsedConfig.icon" (blur)="saveGame(game)" (keydown.enter)="saveGame(game)"
                             title="点击可直接修改此图标 Emoji"
                             class="w-10 h-10 text-xl text-center bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl outline-none focus:border-[var(--color-accent-from)] transition-all shrink-0">
                      <div class="min-w-0">
                        <div class="font-bold text-sm text-[var(--color-text-main)] truncate flex items-center gap-1.5">
                          <span>{{ getGameName(game.id) }}</span>
                          @if ((game.parsedConfig.priority || 0) > 0) {
                            <span class="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">⭐ {{ game.parsedConfig.priority }}</span>
                          }
                        </div>
                        <div class="text-[11px] font-mono opacity-50 uppercase tracking-wider truncate">
                          #{{ game.id }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- 上架状态 -->
                  <td class="py-3 px-3 text-center">
                    <button (click)="toggleGameStatus(game)"
                            [title]="game.isActive ? '点击下架' : '点击上架'"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                            [class.bg-emerald-500]="game.isActive"
                            [class.bg-[var(--color-bg-main)]]="!game.isActive"
                            [class.border]="!game.isActive"
                            [class.border-[var(--color-border-card)]]="!game.isActive">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                            [class.translate-x-6]="game.isActive"
                            [class.translate-x-1]="!game.isActive"></span>
                    </button>
                    <div class="text-[10px] font-bold mt-0.5" [class.text-emerald-400]="game.isActive" [class.text-red-400]="!game.isActive">
                      {{ game.isActive ? 'Active' : 'Offline' }}
                    </div>
                  </td>

                  <!-- 置顶权重 (Priority) -->
                  <td class="py-3 px-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <input type="number" [(ngModel)]="game.parsedConfig.priority"
                             (blur)="saveGame(game)" (keydown.enter)="saveGame(game)"
                             min="0" max="999" placeholder="0"
                             [title]="i18n.t('admin.games.priority_hint')()"
                             class="w-14 bg-[var(--color-bg-main)] border rounded-xl py-1.5 px-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-accent-to)] transition-all text-center"
                             [class.border-amber-400]="(game.parsedConfig.priority || 0) > 0"
                             [class.text-amber-400]="(game.parsedConfig.priority || 0) > 0"
                             [class.border-[var(--color-border-card)]]="!(game.parsedConfig.priority && game.parsedConfig.priority > 0)">
                    </div>
                  </td>

                  <!-- 多局制 PK -->
                  <td class="py-3 px-3 text-center">
                    <button (click)="toggleMultiRound(game)"
                            [title]="game.parsedConfig.multiRound ? '点击关闭多局制' : '点击开启多局制 (BO3/BO5)'"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                            [class.bg-[var(--color-accent-to)]]="game.parsedConfig.multiRound"
                            [class.bg-[var(--color-bg-main)]]="!game.parsedConfig.multiRound"
                            [class.border]="!game.parsedConfig.multiRound"
                            [class.border-[var(--color-border-card)]]="!game.parsedConfig.multiRound">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                            [class.translate-x-6]="game.parsedConfig.multiRound"
                            [class.translate-x-1]="!game.parsedConfig.multiRound"></span>
                    </button>
                    <div class="text-[10px] font-bold opacity-60 mt-0.5">
                      {{ game.parsedConfig.multiRound ? 'BO3/BO5' : 'BO1' }}
                    </div>
                  </td>

                  <!-- 通关动作 (Win Action) -->
                  <td class="py-3 px-3">
                    <select [(ngModel)]="game.parsedConfig.winAction" (change)="saveGame(game)"
                            class="w-full bg-[var(--color-bg-main)] border rounded-xl py-2 px-2.5 text-xs font-bold focus:outline-none focus:border-[var(--color-accent-to)] transition-all cursor-pointer"
                            [class.border-emerald-500]="game.parsedConfig.winAction === 'auto_next'"
                            [class.text-emerald-400]="game.parsedConfig.winAction === 'auto_next'"
                            [class.border-[var(--color-border-card)]]="game.parsedConfig.winAction !== 'auto_next'">
                      <option value="auto_next">{{ i18n.t('admin.games.action_auto_next')() }}</option>
                      <option value="modal">{{ i18n.t('admin.games.action_modal')() }}</option>
                    </select>
                  </td>

                  <!-- 失败动作 (Lose Action) -->
                  <td class="py-3 px-3">
                    <select [(ngModel)]="game.parsedConfig.loseAction" (change)="saveGame(game)"
                            class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl py-2 px-2.5 text-xs font-bold focus:outline-none focus:border-[var(--color-accent-to)] transition-all cursor-pointer">
                      <option value="modal">{{ i18n.t('admin.games.action_modal')() }}</option>
                      <option value="board_overlay">{{ i18n.t('admin.games.action_overlay')() }}</option>
                      <option value="auto_restart">{{ i18n.t('admin.games.action_restart')() }}</option>
                    </select>
                  </td>

                  <!-- 下一关插屏频次 -->
                  <td class="py-3 px-3">
                    <div class="flex flex-col">
                      <input type="number" [(ngModel)]="game.parsedConfig.autoNextAdFreq"
                             (blur)="saveGame(game)" (keydown.enter)="saveGame(game)"
                             placeholder="-1"
                             class="w-full bg-[var(--color-bg-main)] border rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-accent-to)] transition-all text-center"
                             [class.border-amber-500]="game.parsedConfig.autoNextAdFreq === 0"
                             [class.border-[var(--color-border-card)]]="game.parsedConfig.autoNextAdFreq !== 0">
                      <span class="text-[10px] opacity-40 mt-1 truncate" title="{{ i18n.t('admin.games.ad_hint')() }}">
                        {{ game.parsedConfig.autoNextAdFreq === 0 ? '🛡️ 完全免插屏' : (game.parsedConfig.autoNextAdFreq! > 0 ? (game.parsedConfig.autoNextAdFreq + ' 局/次') : '🌐 继承全局') }}
                      </span>
                    </div>
                  </td>

                  <!-- 流转延时 -->
                  <td class="py-3 px-3">
                    <div class="flex items-center gap-1">
                      <input type="number" [(ngModel)]="game.parsedConfig.autoNextDelayMs"
                             (blur)="saveGame(game)" (keydown.enter)="saveGame(game)"
                             placeholder="1500" step="100"
                             class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl py-1.5 px-2 text-xs font-mono text-center focus:outline-none focus:border-[var(--color-accent-to)] transition-all">
                      <span class="text-[10px] opacity-40 font-mono">ms</span>
                    </div>
                  </td>

                  <!-- 操作 / 保存状态 -->
                  <td class="py-3 px-4 text-right">
                    @if (game.isSaving) {
                      <span class="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                        <span class="animate-spin text-sm">⏳</span>
                        <span>{{ i18n.t('admin.games.saving')() }}</span>
                      </span>
                    } @else if (game.savedRecently) {
                      <span class="inline-flex items-center gap-1 text-xs text-emerald-400 font-extrabold bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-lg animate-pulse">
                        <span>✓</span>
                        <span>{{ i18n.t('admin.games.saved')() }}</span>
                      </span>
                    } @else {
                      <button (click)="saveGame(game)"
                              title="点击立即保存当前配置"
                              class="px-3 py-1.5 rounded-xl font-bold text-xs bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-to)] hover:text-[var(--color-accent-to)] transition-all opacity-60 group-hover:opacity-100 shadow-sm active:scale-95">
                        💾 {{ i18n.t('admin.games.save_btn')() }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="text-center py-12 text-slate-500">
                    {{ i18n.t('admin.games.no_games')() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 📱 移动端全景卡片视图 (Mobile Panoramic Cards) -->
      <div class="grid grid-cols-1 gap-4 md:hidden">
        @for (game of filteredGames(); track game.id) {
          <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
            <!-- 头部：Emoji + 名称 + 上架状态 -->
            <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border-card)]">
              <div class="flex items-center gap-2.5 min-w-0">
                <input type="text" [(ngModel)]="game.parsedConfig.icon" (blur)="saveGame(game)"
                       class="w-9 h-9 text-lg text-center bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl shrink-0 outline-none">
                <div class="truncate">
                  <div class="font-bold text-sm text-[var(--color-text-main)] truncate flex items-center gap-1">
                    <span>{{ getGameName(game.id) }}</span>
                    @if ((game.parsedConfig.priority || 0) > 0) {
                      <span class="text-[10px] text-amber-400 font-bold">⭐</span>
                    }
                  </div>
                  <div class="text-[10px] font-mono opacity-50 uppercase">#{{ game.id }}</div>
                </div>
              </div>

              <!-- 上架 Toggle -->
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="toggleGameStatus(game)"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                        [class.bg-emerald-500]="game.isActive"
                        [class.bg-[var(--color-bg-main)]]="!game.isActive"
                        [class.border]="!game.isActive"
                        [class.border-[var(--color-border-card)]]="!game.isActive">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                        [class.translate-x-6]="game.isActive"
                        [class.translate-x-1]="!game.isActive"></span>
                </button>
              </div>
            </div>

            <!-- 控制项网格 -->
            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <!-- 多局制 PK -->
              <div class="bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)] flex flex-col justify-between">
                <span class="text-[10px] font-bold opacity-60 mb-1">多局制 PK</span>
                <button (click)="toggleMultiRound(game)"
                        class="flex items-center justify-between w-full font-bold">
                  <span>{{ game.parsedConfig.multiRound ? 'BO3/BO5' : '单局' }}</span>
                  <span class="w-3 h-3 rounded-full" [class.bg-[var(--color-accent-to)]]="game.parsedConfig.multiRound" [class.bg-slate-700]="!game.parsedConfig.multiRound"></span>
                </button>
              </div>

              <!-- 置顶权重 -->
              <div class="bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold opacity-60 mb-1">{{ i18n.t('admin.games.priority')() }}</span>
                  @if ((game.parsedConfig.priority || 0) > 0) {
                    <span class="text-xs text-amber-400 font-bold">⭐</span>
                  }
                </div>
                <input type="number" [(ngModel)]="game.parsedConfig.priority" (blur)="saveGame(game)"
                       placeholder="0" min="0" max="999"
                       class="w-full bg-transparent font-mono font-bold text-xs outline-none"
                       [class.text-amber-400]="(game.parsedConfig.priority || 0) > 0">
              </div>

              <!-- 流转延时 -->
              <div class="col-span-2 bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)] flex items-center justify-between">
                <span class="text-[10px] font-bold opacity-60">流转延时 (ms)</span>
                <input type="number" [(ngModel)]="game.parsedConfig.autoNextDelayMs" (blur)="saveGame(game)"
                       placeholder="1500" step="100"
                       class="w-24 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg p-1 text-center font-mono font-bold text-xs outline-none">
              </div>

              <!-- 通关流转 -->
              <div class="col-span-2 bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)]">
                <span class="text-[10px] font-bold opacity-60 block mb-1">通关动作 (Win Action)</span>
                <select [(ngModel)]="game.parsedConfig.winAction" (change)="saveGame(game)"
                        class="w-full bg-transparent font-bold text-xs outline-none cursor-pointer">
                  <option value="auto_next">{{ i18n.t('admin.games.action_auto_next')() }}</option>
                  <option value="modal">{{ i18n.t('admin.games.action_modal')() }}</option>
                </select>
              </div>

              <!-- 失败流转 -->
              <div class="col-span-2 bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)]">
                <span class="text-[10px] font-bold opacity-60 block mb-1">失败动作 (Lose Action)</span>
                <select [(ngModel)]="game.parsedConfig.loseAction" (change)="saveGame(game)"
                        class="w-full bg-transparent font-bold text-xs outline-none cursor-pointer">
                  <option value="modal">{{ i18n.t('admin.games.action_modal')() }}</option>
                  <option value="board_overlay">{{ i18n.t('admin.games.action_overlay')() }}</option>
                  <option value="auto_restart">{{ i18n.t('admin.games.action_restart')() }}</option>
                </select>
              </div>

              <!-- 插屏频次 -->
              <div class="col-span-2 bg-[var(--color-bg-main)] p-2.5 rounded-xl border border-[var(--color-border-card)] flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold opacity-60 block">下一关插屏频次</span>
                  <span class="text-[9px] opacity-40">-1: 全局 | 0: 免插屏 | >0: 局数</span>
                </div>
                <input type="number" [(ngModel)]="game.parsedConfig.autoNextAdFreq" (blur)="saveGame(game)"
                       placeholder="-1"
                       class="w-20 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg p-1.5 text-center font-mono font-bold text-xs outline-none">
              </div>
            </div>

            <!-- 卡片底栏即时状态与保存 -->
            <div class="pt-2 flex justify-between items-center text-xs">
              <span class="text-[10px] opacity-50">修改失焦即刻自动生效</span>
              @if (game.isSaving) {
                <span class="text-amber-400 font-bold flex items-center gap-1">
                  <span class="animate-spin text-sm">⏳</span> 保存中...
                </span>
              } @else if (game.savedRecently) {
                <span class="text-emerald-400 font-bold flex items-center gap-1">✓ 已生效</span>
              } @else {
                <button (click)="saveGame(game)"
                        class="px-3 py-1 rounded-lg font-bold bg-[var(--color-accent-from)] text-[var(--color-bg-main)]">
                  💾 保存
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-slate-500 border border-slate-700 border-dashed rounded-2xl">
            {{ i18n.t('admin.games.no_games')() }}
          </div>
        }
      </div>
    </div>
  `
})
export class AdminGamesComponent implements OnInit {
  private adminService = inject(AdminService);
  i18n = inject(I18nService);
  private toastService = inject(ToastService);
  
  games = signal<AdminGame[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  filterTag = signal<'all' | 'auto_next' | 'modal' | 'free_ad' | 'active'>('all');

  totalCount = computed(() => this.games().length);
  autoNextCount = computed(() => this.games().filter(g => g.parsedConfig.winAction === 'auto_next').length);
  modalCount = computed(() => this.games().filter(g => g.parsedConfig.winAction !== 'auto_next').length);
  freeAdCount = computed(() => this.games().filter(g => g.parsedConfig.autoNextAdFreq === 0).length);
  activeCount = computed(() => this.games().filter(g => g.isActive).length);

  filteredGames = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tag = this.filterTag();
    return this.games().filter(g => {
      const name = this.getGameName(g.id).toLowerCase();
      const matchSearch = !q || g.id.toLowerCase().includes(q) || name.includes(q);
      if (!matchSearch) return false;
      if (tag === 'auto_next') return g.parsedConfig.winAction === 'auto_next';
      if (tag === 'modal') return g.parsedConfig.winAction !== 'auto_next';
      if (tag === 'free_ad') return g.parsedConfig.autoNextAdFreq === 0;
      if (tag === 'active') return g.isActive;
      return true;
    });
  });

  ngOnInit() {
    this.fetchGames();
  }

  setFilter(tag: 'all' | 'auto_next' | 'modal' | 'free_ad' | 'active') {
    this.filterTag.set(tag);
  }

  getGameName(gameId: string): string {
    const trans = this.i18n.t('lobby.' + gameId)();
    if (trans && trans !== 'lobby.' + gameId) return trans;
    return gameId;
  }

  fetchGames() {
    this.isLoading.set(true);
    this.adminService.getGames().subscribe({
      next: (res) => {
        this.games.set(res.map(g => {
          let parsedConfig: ParsedMeta = {};
          let rawConfigText = '{}';
          try {
            if (g.config) {
              rawConfigText = g.config;
              const c = JSON.parse(g.config);
              if (c && typeof c === 'object') {
                parsedConfig = {
                  penaltySeconds: c.penaltySeconds,
                  icon: c.icon || '',
                  multiRound: !!c.multiRound,
                  priority: c.priority !== undefined ? Number(c.priority) : 0,
                  winAction: c.finishFlow?.winAction || 'modal',
                  loseAction: c.finishFlow?.loseAction || 'modal',
                  autoNextAdFreq: c.finishFlow?.autoNextAdFreq !== undefined ? c.finishFlow.autoNextAdFreq : -1,
                  autoNextDelayMs: c.finishFlow?.autoNextDelayMs !== undefined ? c.finishFlow.autoNextDelayMs : 1500,
                };
              }
            }
          } catch(e) {}

          return { ...g, parsedConfig, rawConfigText, isSaving: false, savedRecently: false };
        }));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.show(this.i18n.t('admin.games.load_error')() + ': ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  toggleGameStatus(game: AdminGame) {
    game.isActive = !game.isActive;
    this.saveGame(game, false);
  }

  toggleMultiRound(game: AdminGame) {
    game.parsedConfig.multiRound = !game.parsedConfig.multiRound;
    this.saveGame(game, false);
  }

  saveGame(game: AdminGame, showToast = true) {
    game.isSaving = true;
    let merged: Record<string, any> = {};
    try { merged = JSON.parse(game.rawConfigText || '{}'); } catch(e) {}
    if (game.parsedConfig.icon !== undefined)           merged['icon'] = game.parsedConfig.icon;
    if (game.parsedConfig.multiRound !== undefined)     merged['multiRound'] = game.parsedConfig.multiRound;
    if (game.parsedConfig.penaltySeconds !== undefined) merged['penaltySeconds'] = game.parsedConfig.penaltySeconds;
    if (game.parsedConfig.priority !== undefined)       merged['priority'] = Number(game.parsedConfig.priority);

    merged['finishFlow'] = {
      winAction: game.parsedConfig.winAction || 'modal',
      loseAction: game.parsedConfig.loseAction || 'modal',
      autoNextAdFreq: Number(game.parsedConfig.autoNextAdFreq ?? -1),
      autoNextDelayMs: Number(game.parsedConfig.autoNextDelayMs ?? 1500),
    };

    const configJson = JSON.stringify(merged);
    game.config = configJson;
    game.rawConfigText = configJson;

    this.adminService.updateGame(game.id, configJson, game.isActive).subscribe({
      next: () => {
        game.isSaving = false;
        game.savedRecently = true;
        if (showToast) {
          this.toastService.show(`${this.getGameName(game.id)}: ${this.i18n.t('admin.games.update_success')()}`, 'success');
        }
        setTimeout(() => {
          game.savedRecently = false;
        }, 2000);
      },
      error: (err) => {
        game.isSaving = false;
        this.toastService.show(this.i18n.t('admin.games.update_error')() + ': ' + (err.error?.error || err.message), 'error');
      }
    });
  }
}
