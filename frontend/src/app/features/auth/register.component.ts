import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  host: {
    class: 'block min-h-screen w-full'
  },
  template: `
    <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 transition-colors duration-300 bg-[var(--color-bg-main)] relative">
      <!-- Top Left Floating Back Capsule -->
      <a [routerLink]="['/', i18n.currentLang(), 'lobby']"
         class="fixed top-4 left-4 sm:top-6 sm:left-6 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--color-bg-card)]/80 hover:bg-[var(--color-bg-card)] backdrop-blur-xl border border-[var(--color-border-card)] shadow-sm hover:shadow-md text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-all active:scale-95 group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>{{ i18n.t('nav.lobby')() }}</span>
      </a>

      <div class="w-full max-w-md backdrop-blur-xl border rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 relative overflow-hidden my-auto"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
           
        <div class="absolute -top-20 -left-20 w-40 h-40 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div class="relative z-10">
          <!-- Brand Icon Badge -->
          <div class="flex justify-center mb-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>

          <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 text-center">
            {{ i18n.t('auth.register.title')() }}
          </h2>
          <p class="text-[var(--color-text-muted)] text-center mb-8 font-medium tracking-wide text-sm sm:text-base">{{ i18n.t('auth.register.subtitle')() }}</p>

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            @if (errorMsg()) {
              <div class="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center animate-pulse">
                {{ errorMsg() }}
              </div>
            }

            <div>
              <label class="block text-sm font-semibold opacity-80 mb-2 uppercase tracking-wider">{{ i18n.t('auth.register.username')() }}</label>
              <input type="text" [(ngModel)]="username" name="username" required
                     class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <div>
              <label class="block text-sm font-semibold opacity-80 mb-2 uppercase tracking-wider">{{ i18n.t('auth.register.password')() }}</label>
              <div class="relative">
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" required
                       class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl pl-4 pr-11 py-3 text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner">
                <button type="button" (click)="showPassword.set(!showPassword())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors focus:outline-none cursor-pointer"
                        [attr.title]="showPassword() ? (i18n.t('auth.hide_password')() || '隐藏密码') : (i18n.t('auth.show_password')() || '显示密码')"
                        [attr.aria-label]="showPassword() ? (i18n.t('auth.hide_password')() || '隐藏密码') : (i18n.t('auth.show_password')() || '显示密码')">
                  @if (showPassword()) {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" [disabled]="isLoading()"
                    class="w-full py-4 mt-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {{ isLoading() ? i18n.t('auth.register.submitting')() : i18n.t('auth.register.submit')() }}
            </button>
          </form>

          <div class="mt-8 text-center text-[var(--color-text-muted)] text-sm">
            {{ i18n.t('auth.register.has_account')() }}
            <a [routerLink]="['/', i18n.currentLang(), 'login']" [queryParams]="route.snapshot.queryParams" class="text-teal-400 font-bold hover:text-emerald-400 transition-colors ml-1">{{ i18n.t('auth.register.signin')() }}</a>
          </div>

          <div class="mt-6 pt-4 border-t border-[var(--color-border-card)]/50 text-center">
            <a [routerLink]="['/', i18n.currentLang(), 'lobby']" class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors inline-flex items-center gap-1 group">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {{ i18n.t('nav.lobby')() }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  authService = inject(AuthService);
  authStore = inject(AuthStore);
  router = inject(Router);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toastService = inject(ToastService);

  username = '';
  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMsg = signal('');

  private redirectAfterAuth() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/', this.i18n.currentLang(), 'lobby']);
    }
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMsg.set('Please fill in all fields');
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg.set('Password must be at least 6 characters');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set('');

    this.authService.register(this.username, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.token && res.user) {
          this.authStore.setCredentials(res.token, res.user);
        }
        this.toastService.show(this.i18n.t('auth.register.success')(), 'success');
        this.redirectAfterAuth();
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || this.i18n.t('auth.register.failed')();
        this.errorMsg.set(msg);
        this.toastService.show(msg, 'error');
      }
    });
  }
}
