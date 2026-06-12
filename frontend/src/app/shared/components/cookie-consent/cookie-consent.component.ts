import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (isVisible()) {
      <div class="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-[9999] bg-[var(--color-bg-card)]/90 backdrop-blur-xl border border-[var(--color-border-card)] shadow-2xl rounded-2xl p-5 translate-y-0 transition-transform duration-500 ease-out animate-slide-up">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between">
            <h3 class="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
              🍪 <span>{{ i18n.t('cookie.title')() || 'Cookie Settings' }}</span>
            </h3>
            <button (click)="hide()" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {{ i18n.t('cookie.desc')() || 'We use cookies to enhance your gaming experience, analyze traffic, and serve personalized ads. By continuing to use our site, you consent to our use of cookies.' }}
            <a routerLink="/legal/privacy" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-1" (click)="hide()">{{ i18n.t('legal.privacy.title')() || 'Privacy Policy' }}</a>
          </p>
          <div class="flex gap-3 mt-1">
            <button (click)="accept()" class="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              {{ i18n.t('cookie.accept')() || 'Accept All' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from { transform: translateY(150%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-up {
      animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class CookieConsentComponent implements OnInit {
  i18n = inject(I18nService);
  isVisible = signal(false);

  ngOnInit() {
    // Check if user already consented
    const hasConsented = localStorage.getItem('cookie_consent');
    if (!hasConsented) {
      // Small delay to make the entrance animation noticeable after page load
      setTimeout(() => this.isVisible.set(true), 1500);
    }
  }

  accept() {
    localStorage.setItem('cookie_consent', 'true');
    this.isVisible.set(false);
  }

  hide() {
    this.isVisible.set(false);
  }
}
