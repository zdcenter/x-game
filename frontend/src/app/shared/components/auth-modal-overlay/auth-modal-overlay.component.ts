import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-auth-modal-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authModal.isOpen()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 transition-all"
           (click)="onBackdropClick($event)">
        <div class="relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card); color: var(--color-text-main)">
          
          <!-- Ambient Glow Blobs -->
          <div class="absolute -top-16 -right-16 w-36 h-36 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Close button -->
          <button (click)="close()"
                  class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer"
                  aria-label="Close">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Top Badge & Header -->
          <div class="text-center relative z-10 mb-5">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-indigo-500/20 border border-violet-500/30 text-2xl shadow-inner mb-3">
              ⚔️
            </div>
            <h3 class="text-xl sm:text-2xl font-black tracking-tight mb-1">
              {{ authModal.title() || i18n.t('auth_modal.pk_title')() }}
            </h3>
            <p class="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xs mx-auto">
              {{ authModal.subtitle() || i18n.t('auth_modal.pk_subtitle')() }}
            </p>
          </div>

          <!-- Features List -->
          <div class="space-y-2.5 mb-6 relative z-10 text-left">
            <!-- Feature 1 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
              <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 text-sm">
                🏆
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-[var(--color-text-main)]">
                  {{ i18n.t('auth_modal.feat_ladder_title')() }}
                </div>
                <div class="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                  {{ i18n.t('auth_modal.feat_ladder_desc')() }}
                </div>
              </div>
            </div>

            <!-- Feature 2 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
              <div class="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 text-sm">
                📊
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-[var(--color-text-main)]">
                  {{ i18n.t('auth_modal.feat_stats_title')() }}
                </div>
                <div class="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                  {{ i18n.t('auth_modal.feat_stats_desc')() }}
                </div>
              </div>
            </div>

            <!-- Feature 3 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 text-sm">
                🤝
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-[var(--color-text-main)]">
                  {{ i18n.t('auth_modal.feat_social_title')() }}
                </div>
                <div class="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                  {{ i18n.t('auth_modal.feat_social_desc')() }}
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2.5 relative z-10">
            <!-- Primary Conversion Button -->
            <button (click)="goToRegisterOrLogin()"
                    class="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>🚀</span>
              <span>{{ i18n.t('auth_modal.btn_register')() }}</span>
            </button>

            <!-- Secondary Close / Solo Play Button -->
            <button (click)="close()"
                    class="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <span>🎮</span>
              <span>{{ i18n.t('auth_modal.btn_continue_single')() }}</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class AuthModalOverlayComponent {
  authModal = inject(AuthModalService);
  i18n = inject(I18nService);
  router = inject(Router);

  close() {
    this.authModal.close();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop-blur-md')) {
      this.close();
    }
  }

  goToRegisterOrLogin() {
    const returnUrl = this.authModal.returnUrl() || this.router.url;
    this.authModal.close();
    this.router.navigate(['/', this.i18n.currentLang(), 'login'], {
      queryParams: { returnUrl }
    });
  }
}
