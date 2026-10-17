import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (offlineSync.isOffline() || offlineSync.isSyncing()) {
      <aside aria-label="Offline Mode Status"
           class="w-full bg-amber-500/10 border-b border-amber-500/25 px-3 py-1.5 backdrop-blur-md transition-all duration-300 select-none z-40">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2 min-w-0">
            @if (offlineSync.isSyncing()) {
              <span class="animate-spin text-sm">🔄</span>
              <span class="font-bold text-amber-400 truncate">
                {{ i18n.t('offline.syncing')() }}
              </span>
            } @else {
              <span class="text-sm">✈️</span>
              <span class="font-bold text-amber-300 truncate">
                {{ i18n.t('offline.banner_title')() }}
              </span>
              <span class="hidden sm:inline text-[var(--color-text-muted)] text-[11px]">
                {{ i18n.t('offline.banner_desc')() }}
              </span>
            }
          </div>

          @if (offlineSync.pendingCount() > 0) {
            <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {{ i18n.t('offline.queued_count')().replace('{count}', offlineSync.pendingCount().toString()) }}
            </span>
          }
        </div>
      </aside>
    }
  `
})
export class OfflineBannerComponent {
  offlineSync = inject(OfflineSyncService);
  i18n = inject(I18nService);
}
