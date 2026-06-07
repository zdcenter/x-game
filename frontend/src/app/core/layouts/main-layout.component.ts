import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthStore } from '../auth/auth.store';
import { PwaService } from '../services/pwa.service';
import { GlobalSideAdsComponent } from '../../shared/components/adsense/global-side-ads.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, GlobalSideAdsComponent],
  template: `
    <app-global-side-ads></app-global-side-ads>
    <div class="h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 overflow-hidden">
      
      <!-- Global Navbar -->
      <header class="flex-shrink-0 relative z-50 backdrop-blur-md border-b" style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div class="flex items-center gap-4 sm:gap-8">
            <a routerLink="/lobby" class="flex items-center cursor-pointer group">
              <span class="text-2xl sm:text-3xl font-black tracking-widest bg-clip-text text-transparent transition-transform group-hover:scale-105"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                Puzzle PK
              </span>
            </a>
            
            <a routerLink="/blog" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]">
              📖 Blog
            </a>
          </div>

          <!-- Controls -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            
            @if (pwa.canInstall()) {
              <button (click)="pwa.install()" 
                      class="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg shadow-lg transition-all hover:scale-105 backdrop-blur-md border border-[var(--color-accent-from)]/50 text-[var(--color-accent-from)] hover:bg-[var(--color-accent-from)]/10 shrink-0"
                      title="Install Desktop App">
                <span class="hidden sm:inline">💻 <ng-container i18n="@@nav.installApp">nav.installApp</ng-container></span>
                <span class="sm:hidden">💻 App</span>
              </button>
            }

            <!-- Theme Toggle -->
            <button (click)="theme.cycleTheme()" 
                    class="p-1.5 sm:p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)] rounded-lg transition-colors border border-transparent hover:border-[var(--color-border-card)]"
                    title="Toggle Theme">
              @if (theme.currentTheme() === 'dark') {
                <span class="text-xl leading-none block">☀️</span>
              } @else {
                <span class="text-xl leading-none block">🌙</span>
              }
            </button>

            <!-- Language Toggle -->
            <button (click)="i18n.toggleLang()" 
                    class="p-1.5 sm:p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)] rounded-lg transition-colors border border-transparent hover:border-[var(--color-border-card)]"
                    title="Toggle Language">
              @if (i18n.currentLang() === 'zh') {
                <span class="text-xl leading-none block">🇬🇧</span>
              } @else {
                <span class="text-xl leading-none block">🇨🇳</span>
              }
            </button>
            
            <!-- Auth Info -->
            @if (authStore.isAuthenticated()) {
              <div class="flex items-center space-x-1.5 sm:space-x-3 ml-2 sm:ml-4 border-l pl-2 sm:pl-4" style="border-color: var(--color-border-card)">
                <span class="font-bold tracking-wider max-w-[60px] sm:max-w-[120px] truncate" style="color: var(--color-accent-from)" [title]="authStore.currentUser()?.username">
                  {{ authStore.currentUser()?.username }}
                </span>
                
                <a routerLink="/profile" class="hidden sm:flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow transition-all hover:scale-105 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer shrink-0" title="Profile & Achievements">
                  🏆 <span class="hidden md:inline"><ng-container i18n="@@nav.profile">nav.profile</ng-container></span>
                </a>

                @if (authStore.currentUser()?.role === 'guest') {
                  <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded shadow bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase shrink-0 hidden sm:inline-block">
                    <ng-container i18n="@@nav.guest">nav.guest</ng-container>
                  </span>
                }
                @if (authStore.isAdmin()) {
                  <a routerLink="/admin" class="hidden sm:inline-block px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow transition-all hover:scale-105 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 uppercase cursor-pointer shrink-0">
                    Admin
                  </a>
                }
                <button (click)="logout()" 
                        class="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow transition-all hover:scale-105 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shrink-0">
                  {{ authStore.currentUser()?.role === 'guest' ? i18n.t('auth.login.submit')() : i18n.t('auth.logout')() }}
                </button>
              </div>
            } @else {
              <div class="flex items-center space-x-2 sm:space-x-3 ml-2 sm:ml-4 border-l pl-2 sm:pl-4" style="border-color: var(--color-border-card)">
                <a routerLink="/login" 
                   class="px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow transition-all hover:scale-105 border hover:bg-slate-800"
                   style="background-color: var(--color-bg-main); border-color: var(--color-border-card); color: var(--color-text-main)">
                  <ng-container i18n="@@nav.signin">nav.signin</ng-container>
                </a>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col overflow-y-auto relative min-h-0 overscroll-none">
        <router-outlet></router-outlet>
      </main>
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
