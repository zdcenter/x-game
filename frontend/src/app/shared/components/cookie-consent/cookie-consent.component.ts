import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (isVisible()) {
      <div class="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-[999] animate-fade-in-up">
        <div class="rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border p-5 flex flex-col"
             style="background-color: var(--color-bg-main); border-color: var(--color-border-card)">
          
          <!-- Header -->
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-lg flex items-center gap-2" style="color: var(--color-text-main)">
              <span>🍪</span> {{ i18n.t('cookie.title')() || 'Cookie Settings' }}
            </h3>
            <button (click)="close()" class="opacity-50 hover:opacity-100 transition-opacity p-1" style="color: var(--color-text-primary)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="text-sm leading-relaxed mb-5" style="color: var(--color-text-secondary)">
            {{ i18n.t('cookie.message')() || i18n.t('cookie.desc')() || 'We use cookies and similar technologies to personalize content, tailor and measure ads, and provide a better experience. By clicking accept, you agree to this, as outlined in our Cookie Policy.' }}
            <a routerLink="/pages/privacy" class="underline hover:text-[var(--color-accent-from)] ml-1">
              {{ i18n.t('cookie.learnMore')() || 'Privacy Policy' }}
            </a>
          </div>

          <!-- Footer -->
          <button (click)="accept()" 
                  class="w-full px-6 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02] active:scale-95"
                  style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
            {{ i18n.t('cookie.accept')() || 'Accept All' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class CookieConsentComponent implements OnInit {
  i18n = inject(I18nService);
  private platformId = inject(PLATFORM_ID);
  
  isVisible = signal(false);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const hasConsented = localStorage.getItem('cookie_consent');
      if (!hasConsented) {
        setTimeout(() => this.isVisible.set(true), 1500); // delay show slightly
      }
    }
  }

  accept() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cookie_consent', 'true');
    }
    this.isVisible.set(false);
  }

  close() {
    // Allows user to dismiss temporarily without accepting
    this.isVisible.set(false);
  }
}
