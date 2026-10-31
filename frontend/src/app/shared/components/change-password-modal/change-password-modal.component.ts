import { Component, inject, signal, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
           style="overscroll-behavior: contain;">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="close()"></div>

        <!-- Modal Dialog -->
        <div class="relative w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden z-10 flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3.5 border-b border-[var(--color-border-card)]">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-white shadow-sm text-lg">
                🔑
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-black text-[var(--color-text-main)]">
                  {{ i18n.t('auth.change_password.title')() }}
                </h3>
                <p class="text-[11px] text-[var(--color-text-muted)]">
                  {{ i18n.t('auth.change_password.subtitle')() }}
                </p>
              </div>
            </div>
            <button (click)="close()"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors active:scale-95"
                    [attr.aria-label]="i18n.t('common.close')() || 'Close'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Success State -->
          @if (isSuccess()) {
            <div class="py-8 flex flex-col items-center text-center animate-fade-in">
              <div class="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center text-2xl mb-3 shadow-inner">
                ✓
              </div>
              <h4 class="text-base font-bold text-[var(--color-text-main)] mb-1">
                {{ i18n.t('auth.change_password.success')() }}
              </h4>
              <p class="text-xs text-[var(--color-text-muted)] max-w-xs mb-5">
                {{ i18n.t('auth.change_password.subtitle')() }}
              </p>
              <button (click)="close()"
                      class="px-6 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-xs shadow-md active:scale-95 transition-all">
                {{ i18n.t('common.confirm')() || 'OK' }}
              </button>
            </div>
          } @else {
            <!-- Form Body -->
            <form (ngSubmit)="onSubmit()" class="pt-4 space-y-4">
              
              <!-- Error Banner -->
              @if (errorMessage()) {
                <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2 animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ errorMessage() }}</span>
                </div>
              }

              <!-- Current Password -->
              <div>
                <label class="block text-xs font-bold text-[var(--color-text-main)] mb-1">
                  {{ i18n.t('auth.change_password.old')() }}
                </label>
                <div class="relative">
                  <input [type]="showOld() ? 'text' : 'password'"
                         [(ngModel)]="oldPassword"
                         name="oldPassword"
                         [placeholder]="i18n.t('auth.change_password.old_placeholder')()"
                         required
                         class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] focus:border-[var(--color-accent-from)] focus:ring-1 focus:ring-[var(--color-accent-from)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] text-sm transition-all outline-none pr-10" />
                  <button type="button"
                          (click)="showOld.set(!showOld())"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs transition-colors p-1"
                          [attr.aria-label]="showOld() ? i18n.t('auth.hide_password')() : i18n.t('auth.show_password')()">
                    {{ showOld() ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-xs font-bold text-[var(--color-text-main)] mb-1">
                  {{ i18n.t('auth.change_password.new')() }}
                </label>
                <div class="relative">
                  <input [type]="showNew() ? 'text' : 'password'"
                         [(ngModel)]="newPassword"
                         name="newPassword"
                         [placeholder]="i18n.t('auth.change_password.new_placeholder')()"
                         required
                         minlength="6"
                         class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] focus:border-[var(--color-accent-from)] focus:ring-1 focus:ring-[var(--color-accent-from)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] text-sm transition-all outline-none pr-10" />
                  <button type="button"
                          (click)="showNew.set(!showNew())"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs transition-colors p-1"
                          [attr.aria-label]="showNew() ? i18n.t('auth.hide_password')() : i18n.t('auth.show_password')()">
                    {{ showNew() ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- Confirm New Password -->
              <div>
                <label class="block text-xs font-bold text-[var(--color-text-main)] mb-1">
                  {{ i18n.t('auth.change_password.confirm')() }}
                </label>
                <div class="relative">
                  <input [type]="showConfirm() ? 'text' : 'password'"
                         [(ngModel)]="confirmPassword"
                         name="confirmPassword"
                         [placeholder]="i18n.t('auth.change_password.confirm_placeholder')()"
                         required
                         class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] focus:border-[var(--color-accent-from)] focus:ring-1 focus:ring-[var(--color-accent-from)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] text-sm transition-all outline-none pr-10" />
                  <button type="button"
                          (click)="showConfirm.set(!showConfirm())"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs transition-colors p-1"
                          [attr.aria-label]="showConfirm() ? i18n.t('auth.hide_password')() : i18n.t('auth.show_password')()">
                    {{ showConfirm() ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- Submit Buttons -->
              <div class="pt-2 flex items-center justify-end gap-2.5">
                <button type="button"
                        (click)="close()"
                        class="px-4 py-2.5 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-bold text-xs transition-all active:scale-95">
                  {{ i18n.t('common.cancel')() || 'Cancel' }}
                </button>
                <button type="submit"
                        [disabled]="isLoading() || !isFormValid()"
                        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                  @if (isLoading()) {
                    <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ i18n.t('auth.change_password.submitting')() }}</span>
                  } @else {
                    <span>{{ i18n.t('auth.change_password.submit')() }}</span>
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `
})
export class ChangePasswordModalComponent {
  private authService = inject(AuthService);
  i18n = inject(I18nService);

  isOpen = input<boolean>(false);
  closed = output<void>();

  oldPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  showOld = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isSuccess = signal(false);

  isFormValid = computed(() => {
    return this.oldPassword().length > 0 &&
           this.newPassword().length >= 6 &&
           this.confirmPassword().length > 0;
  });

  close() {
    this.resetForm();
    this.closed.emit();
  }

  resetForm() {
    this.oldPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.errorMessage.set(null);
    this.isSuccess.set(false);
    this.isLoading.set(false);
    this.showOld.set(false);
    this.showNew.set(false);
    this.showConfirm.set(false);
  }

  onSubmit() {
    this.errorMessage.set(null);

    if (this.newPassword().length < 6) {
      this.errorMessage.set(this.i18n.t('auth.change_password.too_short')());
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set(this.i18n.t('auth.change_password.mismatch')());
      return;
    }

    if (this.oldPassword() === this.newPassword()) {
      this.errorMessage.set(this.i18n.t('auth.change_password.same_as_old')());
      return;
    }

    this.isLoading.set(true);

    this.authService.changePassword(this.oldPassword(), this.newPassword()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        const serverError = err.error?.error;
        if (serverError === 'Current password is incorrect') {
          this.errorMessage.set(this.i18n.t('auth.change_password.old_incorrect')());
        } else if (serverError === 'Guest accounts cannot change password') {
          this.errorMessage.set(this.i18n.t('auth.change_password.guest_error')());
        } else if (serverError) {
          this.errorMessage.set(serverError);
        } else {
          this.errorMessage.set(this.i18n.t('auth.change_password.old_incorrect')());
        }
      }
    });
  }
}
