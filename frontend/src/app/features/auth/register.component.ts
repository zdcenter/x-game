import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
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
              <label class="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">{{ i18n.t('auth.login.username')() }}</label>
              <input type="text" [(ngModel)]="username" name="username" required minlength="3"
                     class="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">{{ i18n.t('auth.login.password')() }}</label>
              <input type="password" [(ngModel)]="password" name="password" required minlength="6"
                     class="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner">
            </div>

            <button type="submit" [disabled]="isLoading()"
                    class="w-full py-4 mt-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isLoading() ? i18n.t('auth.register.submitting')() : i18n.t('auth.register.submit')() }}
            </button>
          </form>

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
}
