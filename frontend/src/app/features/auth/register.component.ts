import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex-grow flex items-center justify-center p-8 transition-colors duration-300">
      <div class="w-full max-w-md backdrop-blur-xl border rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 relative overflow-hidden"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
           
        <div class="absolute -top-20 -left-20 w-40 h-40 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div class="relative z-10">
          <h2 class="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 text-center">
            {{ i18n.t('auth.register.title')() }}
          </h2>
          <p class="text-slate-400 text-center mb-8 font-medium tracking-wide">{{ i18n.t('auth.register.subtitle')() }}</p>

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
              <input type="password" [(ngModel)]="password" name="password" required
                     class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <button type="submit" [disabled]="isLoading()"
                    class="w-full py-4 mt-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isLoading() ? i18n.t('auth.register.submitting')() : i18n.t('auth.register.submit')() }}
            </button>
          </form>

          <div class="mt-6 flex items-center justify-between">
            <span class="border-b w-1/5 border-[var(--color-border-card)]"></span>
            <span class="text-xs text-center text-slate-500 uppercase font-semibold">Or</span>
            <span class="border-b w-1/5 border-[var(--color-border-card)]"></span>
          </div>

          <button type="button" (click)="onGuestLogin()" [disabled]="isLoading()"
                  class="w-full py-4 mt-6 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {{ i18n.currentLang() === 'zh' ? '游客直接游玩' : 'Play as Guest' }}
          </button>

          <div class="mt-8 text-center text-slate-400 text-sm">
            {{ i18n.t('auth.register.has_account')() }}
            <a routerLink="/login" class="text-teal-400 font-bold hover:text-emerald-400 transition-colors">{{ i18n.t('auth.register.signin')() }}</a>
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
  i18n = inject(I18nService);

  username = '';
  password = '';
  isLoading = signal(false);
  errorMsg = signal('');

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
      next: () => {
        this.isLoading.set(false);
        // Automatically redirect to login page after successful registration
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.error?.error || 'Registration failed');
      }
    });
  }

  onGuestLogin() {
    this.isLoading.set(true);
    this.errorMsg.set('');

    this.authService.guestLogin().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.token && res.user) {
          this.authStore.setCredentials(res.token, res.user);
          this.router.navigate(['/lobby']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.error?.error || 'Guest login failed');
      }
    });
  }
}
