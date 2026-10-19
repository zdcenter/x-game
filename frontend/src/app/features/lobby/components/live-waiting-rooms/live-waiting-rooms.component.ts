import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiveRoomService, WaitingRoom } from '../../../../core/services/live-room.service';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-live-waiting-rooms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (live.hasWaitingRooms()) {
      <section class="mb-6 animate-fade-in">
        <!-- Section Header -->
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-2">
            <span class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <h2 class="text-sm sm:text-base font-black tracking-wide text-[var(--color-text-main)] flex items-center gap-1.5">
              <span>🔥</span>
              <span>{{ i18n.t('lobby.live_waiting_title')() }}</span>
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {{ live.waitingCount() }} ROOMS
            </span>
          </div>

          <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']"
             class="text-xs font-bold text-[var(--color-accent-from)] hover:underline flex items-center gap-1">
            <span>{{ i18n.t('lobby.view_all_rooms')() }}</span>
            <span>→</span>
          </a>
        </div>

        <!-- Waiting Room Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          @for (room of live.waitingRooms(); track room.id) {
            <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all duration-300 relative overflow-hidden group">
              <!-- Top Row: Game Info & Badge -->
              <div class="flex items-start justify-between gap-2 mb-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                    {{ live.getGameEmoji(room.game) }}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-bold text-[var(--color-text-main)] truncate">
                      {{ live.getGameTitle(room.game) }}
                    </h3>
                    <div class="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                      <span class="truncate max-w-[100px]">👤 {{ room.host }}</span>
                      <span>·</span>
                      <span class="text-amber-500 font-semibold shrink-0">{{ live.getTimeAgo(room.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-secondary)] shrink-0">
                  {{ live.getDifficultyLabel(room.game, room.difficulty) }}
                </span>
              </div>

              <!-- Bottom Row: Challenge Button -->
              <button (click)="live.quickJoin(room)"
                      class="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 group-hover:shadow-md"
                      [style.background]="live.getModeInfo(room.game).gradient"
                      [style.box-shadow]="live.getModeInfo(room.game).shadow">
                <span>{{ live.getModeInfo(room.game).icon }}</span>
                <span>{{ i18n.t('lobby.quick_join')() }}</span>
                <span class="opacity-80 text-[10px]">({{ live.getModeInfo(room.game).label }})</span>
              </button>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class LiveWaitingRoomsComponent {
  live = inject(LiveRoomService);
  i18n = inject(I18nService);
}
