import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiveRoomService, WaitingRoom } from '../../../core/services/live-room.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-live-battle-beacon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (live.hasWaitingRooms()) {
      <div class="relative">
        <!-- Glowing Pulse Badge Button -->
        <button (click)="live.toggleBeacon()"
                class="relative flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full text-xs font-black transition-all duration-300 shadow-sm active:scale-95 group border border-amber-500/30 hover:border-amber-400 bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 text-amber-500 hover:text-amber-400"
                [attr.title]="i18n.t('lobby.live_battle_tooltip')()">
          <!-- Ping Radar Wave -->
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>

          <!-- Sword Icon & Counter -->
          <span class="group-hover:rotate-12 transition-transform">⚔️</span>
          <span class="font-bold tracking-wide">{{ live.waitingCount() }}</span>
          <span class="hidden sm:inline font-medium text-[11px] opacity-90">{{ i18n.t('lobby.live_battle_beacon')() }}</span>
          <span class="text-[9px] opacity-70 group-hover:translate-y-0.5 transition-transform">▾</span>
        </button>

        <!-- Dropdown Popover (Live PK Arena Quick Deck) -->
        @if (live.isBeaconOpen()) {
          <!-- Backdrop click outside -->
          <div class="fixed inset-0 z-[110]" (click)="live.toggleBeacon(false)"></div>

          <div class="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm rounded-2xl shadow-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]/95 backdrop-blur-xl z-[120] animate-fade-in-down overflow-hidden">
            <!-- Header -->
            <div class="p-3 border-b border-[var(--color-border-card)] flex items-center justify-between bg-[var(--color-bg-main)]/50">
              <div class="flex items-center gap-1.5">
                <span class="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span class="text-xs font-bold text-[var(--color-text-main)]">
                  {{ i18n.t('lobby.live_waiting_title')() }}
                </span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500">
                  {{ live.waitingCount() }}
                </span>
              </div>
              <button (click)="live.toggleBeacon(false)" class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1">
                ✕
              </button>
            </div>

            <!-- Rooms Scrollable List -->
            <div class="max-h-72 overflow-y-auto divide-y divide-[var(--color-border-card)] p-1">
              @for (room of live.waitingRooms(); track room.id) {
                <div class="p-2.5 rounded-xl hover:bg-[var(--color-bg-main)] transition-colors flex items-center justify-between gap-2.5 group">
                  <!-- Game & Host Info -->
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-2xl shrink-0 p-1.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
                      {{ live.getGameEmoji(room.game) }}
                    </span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[110px]">
                          {{ live.getGameTitle(room.game) }}
                        </span>
                        @if (room.host === live.currentUserId()) {
                          <span class="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-500 font-bold shrink-0">
                            {{ i18n.t('lobby.my_room_tag')() }}
                          </span>
                        }
                      </div>
                      <div class="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] truncate">
                        <span class="truncate max-w-[80px]">👤 {{ room.host }}</span>
                        <span>·</span>
                        <span class="shrink-0">{{ live.getDifficultyLabel(room.game, room.difficulty) }}</span>
                        <span>·</span>
                        <span class="shrink-0 text-amber-500 font-medium">{{ live.getTimeAgo(room.createdAt) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Quick Join CTA Button -->
                  <button (click)="live.quickJoin(room)"
                          class="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all flex items-center gap-1 group-hover:scale-105"
                          [style.background]="live.getModeInfo(room.game).gradient"
                          [style.box-shadow]="live.getModeInfo(room.game).shadow">
                    <span>⚡</span>
                    <span>{{ i18n.t('lobby.quick_join')() }}</span>
                  </button>
                </div>
              }
            </div>

            <!-- Footer: Link to full PK Arena -->
            <div class="p-2 border-t border-[var(--color-border-card)] bg-[var(--color-bg-main)]/30 text-center">
              <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']"
                 (click)="live.toggleBeacon(false)"
                 class="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-accent-from)] hover:underline py-1">
                <span>{{ i18n.t('lobby.view_all_rooms')() }}</span>
                <span>→</span>
              </a>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class LiveBattleBeaconComponent {
  live = inject(LiveRoomService);
  i18n = inject(I18nService);
}
