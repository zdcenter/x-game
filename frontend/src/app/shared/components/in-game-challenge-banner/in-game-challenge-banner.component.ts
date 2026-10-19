import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveRoomService } from '../../../core/services/live-room.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-in-game-challenge-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (live.newRoomAlert(); as room) {
      <div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999] max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-slide-up pointer-events-auto">
        <div class="rounded-2xl p-3.5 shadow-2xl border border-amber-500/40 bg-[var(--color-bg-card)]/95 backdrop-blur-xl flex items-center justify-between gap-3 text-[var(--color-text-main)]">
          <!-- Game Emoji & Details -->
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-3xl shrink-0 p-1.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
              {{ live.getGameEmoji(room.game) }}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span class="text-xs font-black truncate text-[var(--color-text-main)]">
                  {{ room.host }}
                </span>
                <span class="text-[11px] text-[var(--color-text-secondary)]">
                  {{ i18n.t('lobby.in_game_challenge')() }}
                </span>
              </div>
              <div class="text-[11px] text-[var(--color-accent-from)] font-bold truncate mt-0.5">
                {{ live.getGameTitle(room.game) }} · {{ live.getDifficultyLabel(room.game, room.difficulty) }}
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button (click)="live.quickJoin(room)"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all flex items-center gap-1 hover:scale-105"
                    [style.background]="live.getModeInfo(room.game).gradient"
                    [style.box-shadow]="live.getModeInfo(room.game).shadow">
              <span>⚡</span>
              <span>{{ i18n.t('lobby.in_game_accept')() }}</span>
            </button>
            <button (click)="live.dismissAlert()"
                    class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] text-xs transition-colors"
                    [attr.title]="i18n.t('lobby.in_game_ignore')()">
              ✕
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class InGameChallengeBannerComponent {
  live = inject(LiveRoomService);
  i18n = inject(I18nService);
}
