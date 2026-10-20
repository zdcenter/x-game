import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '../../../core/services/pwa-update.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-pwa-update-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pwa.hasUpdate() && pwa.isStandalone()) {
      <div class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[94%] sm:w-auto sm:min-w-[380px] max-w-[480px] animate-slide-up-prompt select-none">
        <div class="relative overflow-hidden p-3 sm:p-4 rounded-2xl bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-amber-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-between gap-3 text-white">
          
          <!-- Top ambient light accent line -->
          <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>

          <!-- Left Icon & Info -->
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <span class="text-xl sm:text-2xl animate-bounce">🚀</span>
            </div>
            
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-black text-sm sm:text-base text-amber-400 tracking-wide drop-shadow">
                  {{ i18n.t('pwa.update_title')() || '发现新版本' }}
                </span>
                @if (pwa.newVersion()) {
                  <span class="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                    {{ pwa.newVersion() }}
                  </span>
                }
              </div>
              <span class="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                {{ i18n.t('pwa.update_desc')() || '已有全新版本，点击立即应用' }}
              </span>
            </div>
          </div>

          <!-- Right Action Buttons -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Update Button -->
            <button
              type="button"
              (click)="pwa.applyUpdate()"
              [disabled]="pwa.isUpdating()"
              class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-75 disabled:scale-100 cursor-pointer">
              @if (pwa.isUpdating()) {
                <svg class="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>{{ i18n.t('pwa.updating')() || '更新中...' }}</span>
              } @else {
                <span>{{ i18n.t('pwa.update_btn')() || '立即更新' }}</span>
              }
            </button>

            <!-- Close / Dismiss Button -->
            <button
              type="button"
              (click)="pwa.dismiss()"
              class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              [title]="i18n.t('pwa.dismiss')() || '稍后'">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slideUpPrompt {
      0% {
        opacity: 0;
        transform: translate(-50%, 24px) scale(0.96);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, 0) scale(1);
      }
    }
    .animate-slide-up-prompt {
      animation: slideUpPrompt 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class PwaUpdatePromptComponent {
  readonly pwa = inject(PwaUpdateService);
  readonly i18n = inject(I18nService);
}
