import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-revenge-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notificationService.activeRevengeModal(); as item) {
      <div class="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
           (click)="notificationService.closeRevenge()">
        
        <!-- Modal Card -->
        <div class="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-stone-900 via-zinc-900 to-black border-2 border-rose-600/70 shadow-[0_0_50px_rgba(225,29,72,0.4)] p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden animate-scale-up"
             (click)="$event.stopPropagation()">
          
          <!-- Background Flame Halos -->
          <div class="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-rose-600/20 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-600/15 blur-3xl"></div>

          <!-- Close button -->
          <button (click)="notificationService.closeRevenge()"
                  class="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm">
            ✕
          </button>

          <!-- Warning Beacon -->
          <div class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-amber-600 p-0.5 shadow-xl shadow-rose-600/40 mb-3 sm:mb-4 animate-bounce">
            <div class="w-full h-full rounded-[22px] bg-zinc-950 flex items-center justify-center text-3xl sm:text-4xl">
              👑💥
            </div>
          </div>

          <!-- Title & Subtitle -->
          <h2 class="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-rose-400 tracking-tight">
            {{ i18n.t('revenge.throne_lost_title')() || '王座失守警告！' }}
          </h2>
          <p class="text-xs sm:text-sm text-zinc-300 mt-1 max-w-sm">
            {{ i18n.t('revenge.throne_lost_desc', { game: getGameTitle(item.game_id), user: item.sender_name })() || ('你在《' + getGameTitle(item.game_id) + '》的巅峰纪录已被 ' + item.sender_name + ' 改写！') }}
          </p>

          <!-- VS Duel Comparison Card -->
          <div class="w-full mt-5 p-4 rounded-2xl bg-zinc-900/90 border border-rose-500/30 grid grid-cols-7 items-center gap-2">
            
            <!-- Left: You (Previous Champion) -->
            <div class="col-span-3 flex flex-col items-center">
              <div class="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base sm:text-lg font-black text-zinc-300 shadow-inner">
                {{ (authStore.currentUser()?.username || '你')[0].toUpperCase() }}
              </div>
              <span class="text-xs font-bold text-zinc-300 mt-1.5 truncate max-w-[90px]">
                {{ authStore.currentUser()?.username || '你' }}
              </span>
              <span class="text-[10px] text-zinc-400 font-mono">原纪录保持者</span>
              <div class="mt-1 font-mono font-black text-xs sm:text-sm text-zinc-300 line-through opacity-70">
                {{ formatRecord(item.old_record, item.rank_type) }}
              </div>
            </div>

            <!-- Center: VS Badge -->
            <div class="col-span-1 flex flex-col items-center justify-center">
              <span class="px-2 py-1 rounded-full bg-rose-600/30 border border-rose-500/50 text-rose-400 font-black text-[10px] tracking-wider">
                VS
              </span>
              <span class="text-[9px] text-rose-400 font-mono mt-1 font-bold whitespace-nowrap">
                {{ getDiffText(item) }}
              </span>
            </div>

            <!-- Right: Challenger B (New Champion) -->
            <div class="col-span-3 flex flex-col items-center">
              <div class="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/30">
                <div class="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center text-base sm:text-lg font-black text-amber-400">
                  {{ (item.sender_name || 'B')[0].toUpperCase() }}
                </div>
                <span class="absolute -top-2 -right-1 text-xs">👑</span>
              </div>
              <span class="text-xs font-black text-amber-400 mt-1.5 truncate max-w-[90px]">
                {{ item.sender_name }}
              </span>
              <span class="text-[10px] text-amber-500/90 font-mono font-bold">现任新擂主</span>
              <div class="mt-1 font-mono font-black text-sm sm:text-base text-amber-400">
                {{ formatRecord(item.new_record, item.rank_type) }}
              </div>
            </div>

          </div>

          <!-- Difficulty Pill -->
          @if (item.difficulty) {
            <div class="mt-3 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>🎯</span>
              <span>对决难度：<strong class="text-zinc-200">{{ getDifficultyLabel(item.game_id, item.difficulty) }}</strong></span>
            </div>
          }

          <!-- CTA Buttons -->
          <div class="w-full mt-6 flex flex-col sm:flex-row gap-2.5">
            <button (click)="notificationService.launchRevenge(item)"
                    class="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">
              <span>🔥</span>
              <span>{{ i18n.t('revenge.launch_btn')() || '即刻开启复仇局 (夺回王座)' }}</span>
              <span>→</span>
            </button>

            <button (click)="notificationService.closeRevenge()"
                    class="py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white font-bold text-xs transition-colors cursor-pointer active:scale-95">
              {{ i18n.t('revenge.later_btn')() || '稍后迎战' }}
            </button>
          </div>

        </div>
      </div>
    }

    <!-- Real-time Live Banner Notification (Floats when in game or on page) -->
    @if (notificationService.realtimeAlert(); as alert) {
      <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100001] w-[calc(100vw-32px)] max-w-md rounded-2xl bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 border-2 border-rose-500/80 shadow-2xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-slide-in backdrop-blur-xl">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-lg shrink-0 shadow-md animate-pulse">
            👑💥
          </div>
          <div class="min-w-0 leading-tight">
            <p class="text-xs font-black text-white truncate">
              王座失守！{{ alert.sender_name }} 刚刚刷新了纪录
            </p>
            <p class="text-[11px] text-rose-300/80 truncate">
              《{{ getGameTitle(alert.game_id) }}》· 新纪录 {{ formatRecord(alert.new_record, alert.rank_type) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button (click)="notificationService.openRevenge(alert)"
                  class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer">
            🔥 迎战
          </button>
          <button (click)="notificationService.dismissRealtimeAlert()"
                  class="p-1 text-zinc-400 hover:text-white text-xs cursor-pointer">
            ✕
          </button>
        </div>
      </div>
    }
  `
})
export class RevengeModalComponent {
  notificationService = inject(NotificationService);
  private gameRegistry = inject(GameRegistryService);
  authStore = inject(AuthStore);
  i18n = inject(I18nService);

  getGameTitle(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    return config?.titleKey ? (this.i18n.t(config.titleKey)() || gameId) : gameId;
  }

  getDifficultyLabel(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    const diff = config?.difficulties?.find(d => d.id === diffId);
    return diff?.labelKey ? (this.i18n.t(diff.labelKey)() || diffId) : diffId;
  }

  formatRecord(val: number, type: 'time' | 'score'): string {
    if (type === 'time') {
      const mins = Math.floor(val / 60);
      const secs = val % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${val.toLocaleString()} 分`;
  }

  getDiffText(item: NotificationItem): string {
    if (item.rank_type === 'time') {
      const diff = item.old_record - item.new_record;
      return diff > 0 ? `落后 ${diff}s` : `被刷新`;
    }
    const diff = item.new_record - item.old_record;
    return diff > 0 ? `落后 ${diff}分` : `被刷新`;
  }
}
