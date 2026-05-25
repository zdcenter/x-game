import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex-grow flex items-center justify-center p-8 transition-colors duration-300">
      <div class="w-full max-w-md backdrop-blur-xl border rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 relative overflow-hidden"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
           
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div class="relative z-10">
          <h2 class="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400 text-center">
            {{ i18n.t('auth.login.title')() }}
          </h2>
          <p class="text-slate-400 text-center mb-8 font-medium tracking-wide">{{ i18n.t('auth.login.subtitle')() }}</p>

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            @if (errorMsg()) {
              <div class="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center animate-pulse">
                {{ errorMsg() }}
              </div>
            }

            <div>
              <label class="block text-sm font-semibold opacity-80 mb-2 uppercase tracking-wider">{{ i18n.t('auth.login.username')() }}</label>
                <input type="text" [(ngModel)]="username" name="username" required
                       class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <div>
              <label class="block text-sm font-semibold opacity-80 mb-2 uppercase tracking-wider">{{ i18n.t('auth.login.password')() }}</label>
                <input type="password" [(ngModel)]="password" name="password" required
                       class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <button type="submit" [disabled]="isLoading()"
                    class="w-full py-4 mt-8 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isLoading() ? i18n.t('auth.login.submitting')() : i18n.t('auth.login.submit')() }}
            </button>
          </form>

          <div class="mt-8 text-center text-slate-400 text-sm">
            {{ i18n.t('auth.login.no_account')() }}
            <a routerLink="/register" class="text-indigo-400 font-bold hover:text-pink-400 transition-colors">{{ i18n.t('auth.login.create')() }}</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  authService = inject(AuthService);
  authStore = inject(AuthStore);
  router = inject(Router);
  i18n = inject(I18nService); // optional for translations

  username = '';
  password = '';
  isLoading = signal(false);
  errorMsg = signal('');

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMsg.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.token && res.user) {
          this.authStore.setCredentials(res.token, res.user);
          this.router.navigate(['/lobby']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.error?.error || 'Login failed');
      }
    });
  }
}
