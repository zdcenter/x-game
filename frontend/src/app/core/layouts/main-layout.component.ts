import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthStore } from '../auth/auth.store';
import { PwaService } from '../services/pwa.service';
import { ShareModalComponent } from '../../shared/components/share-modal/share-modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, ShareModalComponent],
  template: `
    <div class="h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 overflow-hidden">
      
      <!-- Global Navbar -->
      <header class="flex-shrink-0 relative z-50 backdrop-blur-md border-b" style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">

          <!-- Left: Logo + Nav links -->
          <div class="flex items-center gap-1 sm:gap-5 min-w-0">
            <a routerLink="/lobby" class="flex items-center cursor-pointer group shrink-0">
              <span class="text-xl sm:text-2xl lg:text-3xl font-black tracking-widest bg-clip-text text-transparent transition-transform group-hover:scale-105"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                Puzzle PK
              </span>
            </a>
            <a routerLink="/leaderboard" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              🏆 {{ i18n.t('leaderboard.title')() }}
            </a>
            <a routerLink="/daily" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              📅 {{ i18n.t('daily.title')() }}
            </a>
          </div>

          <!-- Right: Controls -->
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">

            <!-- Install App: Android (native prompt) or iOS (guide modal) -->
            @if (!pwa.isStandalone()) {
              @if (pwa.canInstall()) {
                <button (click)="pwa.install()"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-bold rounded-lg transition-all hover:scale-105 border border-[var(--color-accent-from)]/50 text-[var(--color-accent-from)] hover:bg-[var(--color-accent-from)]/10">
                  <span class="text-base leading-none">💻</span>
                  <span class="hidden sm:inline">{{ i18n.t('nav.installApp')() }}</span>
                  <span class="sm:hidden">{{ i18n.t('nav.install')() }}</span>
                </button>
              } @else if (pwa.isIos()) {
                <button (click)="pwa.openIosGuide()"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-bold rounded-lg transition-all hover:scale-105 border border-[var(--color-accent-from)]/50 text-[var(--color-accent-from)] hover:bg-[var(--color-accent-from)]/10">
                  <span class="text-base leading-none">📲</span>
                  <span class="hidden sm:inline">{{ i18n.t('nav.installApp')() }}</span>
                  <span class="sm:hidden">{{ i18n.t('nav.install')() }}</span>
                </button>
              }
            }

            <!-- Theme Toggle -->
            <button (click)="theme.cycleTheme()"
                    class="p-2 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]"
                    title="Toggle Theme">
              <span class="text-lg leading-none block">{{ theme.currentTheme() === 'dark' ? '☀️' : '🌙' }}</span>
            </button>

            <!-- Language Toggle -->
            <button (click)="i18n.toggleLang()"
                    class="p-2 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]"
                    title="Toggle Language">
              <span class="text-lg leading-none block">{{ i18n.currentLang() === 'zh' ? '🇬🇧' : '🇨🇳' }}</span>
            </button>

            <!-- Divider -->
            <div class="w-px h-6 mx-1" style="background-color: var(--color-border-card)"></div>

            <!-- Authenticated -->
            @if (authStore.isAuthenticated()) {

              <!-- Avatar + username → profile link -->
              <a routerLink="/profile"
                 class="flex items-center gap-2 px-1.5 py-1 rounded-lg transition-colors hover:bg-[var(--color-bg-main)]"
                 [title]="authStore.currentUser()?.username">
                <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                  {{ (authStore.currentUser()?.username || '?')[0].toUpperCase() }}
                </span>
                <span class="hidden md:block text-sm font-bold max-w-[110px] truncate" style="color: var(--color-accent-from)">
                  {{ authStore.currentUser()?.username }}
                </span>
              </a>

              <!-- Admin badge (md+) -->
              @if (authStore.isAdmin()) {
                <a routerLink="/admin"
                   class="hidden md:inline-flex px-2 py-1 text-xs font-bold rounded-lg transition-all hover:scale-105 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 uppercase">
                  Admin
                </a>
              }

              <!-- Guest badge (md+) -->
              @if (authStore.currentUser()?.role === 'guest') {
                <span class="hidden md:inline-flex px-2 py-1 text-xs font-bold rounded-lg bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase">
                  {{ i18n.t('nav.guest')() }}
                </span>
              }

              <!-- Logout -->
              <button (click)="logout()"
                      class="flex items-center gap-1.5 px-2 py-1.5 text-sm font-bold rounded-lg transition-all hover:scale-105 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      [title]="authStore.currentUser()?.role === 'guest' ? i18n.t('auth.login.submit')() : i18n.t('auth.logout')()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden sm:inline">{{ authStore.currentUser()?.role === 'guest' ? i18n.t('auth.login.submit')() : i18n.t('auth.logout')() }}</span>
              </button>

            } @else {
              <a routerLink="/login"
                 class="px-3 py-1.5 text-sm font-bold rounded-lg transition-all hover:scale-105 border"
                 style="background-color: var(--color-bg-main); border-color: var(--color-border-card); color: var(--color-text-main)">
                {{ i18n.t('nav.signin')() }}
              </a>
            }
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 block overflow-y-auto custom-scrollbar relative min-h-0">
        <router-outlet></router-outlet>
        <app-share-modal></app-share-modal>
      </main>

      <!-- iOS Install Guide — bottom sheet on mobile, centered modal on sm+ -->
      @if (pwa.showIosGuide()) {
        <div class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="pwa.closeIosGuide()"></div>
          <div class="relative w-full sm:max-w-sm sm:mx-4 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
               style="background-color: var(--color-bg-card); border-top: 1px solid var(--color-border-card)">
            <!-- Drag handle (mobile) -->
            <div class="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden" style="background-color: var(--color-border-card)"></div>

            <h3 class="text-lg font-black text-center mb-6" style="color: var(--color-text-main)">
              {{ i18n.t('nav.installGuideTitle')() }}
            </h3>

            <div class="space-y-4 mb-6">
              <!-- Step 1 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">1</span>
                <div class="flex-1">
                  <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep1')() }}</p>
                  <span class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                    Share
                  </span>
                </div>
              </div>
              <!-- Step 2 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">2</span>
                <div class="flex-1">
                  <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep2')() }}</p>
                  <span class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-[var(--color-bg-main)] border border-[var(--color-border-card)]" style="color: var(--color-text-secondary)">
                    ➕ {{ i18n.currentLang() === 'zh' ? '添加到主屏幕' : 'Add to Home Screen' }}
                  </span>
                </div>
              </div>
              <!-- Step 3 -->
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">3</span>
                <p class="text-sm font-medium" style="color: var(--color-text-main)">{{ i18n.t('nav.installGuideStep3')() }}</p>
              </div>
            </div>

            <p class="text-center text-xs mb-5" style="color: var(--color-text-secondary)">
              🎮 {{ i18n.t('nav.installGuideTip')() }}
            </p>

            <button (click)="pwa.closeIosGuide()"
                    class="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                    style="background: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              {{ i18n.t('nav.installGuideDone')() }}
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class MainLayoutComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  authStore = inject(AuthStore);
  router = inject(Router);
  pwa = inject(PwaService);

  isSettingsOpen = signal(false);

  logout() {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
