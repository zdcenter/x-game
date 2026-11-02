import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HapticService } from '../../../core/services/haptic.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 1. Auto-Healed Success Capsule (Appears for ~3.5s upon network reconnection & sync) -->
    @if (offlineSync.healedNotification()) {
      <div role="status" aria-live="polite"
           class="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] sm:max-w-md px-3.5 py-1.5 rounded-full bg-emerald-950/85 text-emerald-200 border border-emerald-500/40 backdrop-blur-md shadow-lg shadow-emerald-950/50 flex items-center justify-between gap-2.5 text-xs animate-healedBounce select-none">
        <div class="flex items-center gap-2 min-w-0">
          <span class="flex h-2 w-2 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="font-bold text-emerald-300 truncate">
            ✓ {{ i18n.t('offline.healed_title')() }}
          </span>
          <span class="hidden sm:inline text-emerald-300/80 text-[11px] truncate">
            {{ i18n.t('offline.healed_desc')() }}
          </span>
        </div>

        @if (offlineSync.healedSyncedCount() > 0) {
          <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            +{{ offlineSync.healedSyncedCount() }}
          </span>
        }
      </div>
    }

    <!-- 2. Weak Network / Offline Floating Healing Indicator Bar -->
    @else if (offlineSync.isOffline() || offlineSync.isSyncing() || offlineSync.isHealing()) {
      <aside aria-label="Offline Mode Status"
             class="w-full bg-amber-500/10 border-b border-amber-500/25 px-3 py-1.5 backdrop-blur-md transition-all duration-300 select-none z-40">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2 min-w-0">
            @if (offlineSync.isSyncing() || offlineSync.isHealing()) {
              <span class="animate-spin text-sm">🔄</span>
              <span class="font-bold text-amber-400 truncate">
                {{ i18n.t('offline.reconnecting')() }}
              </span>
            } @else {
              <span class="flex h-2 w-2 relative mr-0.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span class="text-sm">✈️</span>
              <span class="font-bold text-amber-300 truncate">
                {{ i18n.t('offline.banner_title')() }}
              </span>
              <span class="hidden sm:inline text-[var(--color-text-muted)] text-[11px]">
                {{ i18n.t('offline.local_fast_tip')() }}
              </span>
            }
          </div>

          <div class="flex items-center gap-2 shrink-0">
            @if (offlineSync.pendingCount() > 0) {
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    [title]="i18n.t('offline.queued_count')().replace('{count}', offlineSync.pendingCount().toString())">
                {{ i18n.t('offline.queued_count')().replace('{count}', offlineSync.pendingCount().toString()) }}
              </span>
            }

            <button (click)="retryHealing()"
                    [disabled]="offlineSync.isHealing() || offlineSync.isSyncing()"
                    class="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50">
              <span>⚡</span>
              <span class="hidden sm:inline">{{ i18n.t('offline.retry_btn')() }}</span>
            </button>
          </div>
        </div>
      </aside>
    }
  `,
  styles: [`
    @keyframes healedBounce {
      0% { opacity: 0; transform: translate(-50%, -12px) scale(0.95); }
      50% { opacity: 1; transform: translate(-50%, 2px) scale(1.02); }
      100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    .animate-healedBounce {
      animation: healedBounce 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class OfflineBannerComponent {
  offlineSync = inject(OfflineSyncService);
  i18n = inject(I18nService);
  private haptic = inject(HapticService);

  retryHealing() {
    this.haptic.vibrateLight();
    this.offlineSync.testConnectionAndHeal();
  }
}
