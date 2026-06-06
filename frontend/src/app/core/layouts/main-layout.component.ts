import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthStore } from '../auth/auth.store';
import { PwaService } from '../services/pwa.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <div class="h-[100dvh] w-full flex flex-col font-sans transition-colors duration-300 overflow-hidden">
      
      <!-- Global Navbar -->
      <header class="flex-shrink-0 relative z-50 backdrop-blur-md border-b" style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <!-- Logo & Brand -->
          <a routerLink="/lobby" class="flex items-center space-x-2 cursor-pointer group">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg transition-transform group-hover:scale-110"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              P
            </div>
            <span class="text-xl font-extrabold tracking-widest bg-clip-text text-transparent transition-all"
                  style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              PUZZLE PK
            </span>
          </a>

          <!-- Controls -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            
            @if (pwa.canInstall()) {
              <button (click)="pwa.install()" 
                      class="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow-lg transition-all hover:scale-105 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border border-blue-400/50 hover:shadow-blue-500/25 shrink-0"
                      title="Install Desktop App">
                <span class="hidden sm:inline">⬇️ {{ i18n.t('nav.installApp')() }}</span>
                <span class="sm:hidden">⬇️ App</span>
              </button>
            }

            <!-- Settings Dropdown (Language & Theme) -->
            <div class="relative">
              <button (click)="isSettingsOpen.set(!isSettingsOpen())" 
                      class="p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)] rounded-lg transition-colors border border-transparent hover:border-[var(--color-border-card)]"
                      title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              @if (isSettingsOpen()) {
                <div class="fixed inset-0 z-40" (click)="isSettingsOpen.set(false)"></div>
                
                <div class="absolute right-0 mt-2 w-40 sm:w-48 rounded-xl shadow-xl z-50 overflow-hidden border border-[var(--color-border-card)] backdrop-blur-xl bg-[var(--color-bg-card)]/95 flex flex-col p-2 gap-1">
                  
                  <!-- Theme Toggle -->
                  <button (click)="theme.cycleTheme(); isSettingsOpen.set(false)" class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[var(--color-bg-main)] transition-colors text-xs sm:text-sm font-bold text-[var(--color-text-main)]">
                    <span class="flex items-center gap-2">
                      @if (theme.currentTheme() === 'dark') {
                        <span>☀️</span> <span>Light Mode</span>
                      } @else {
                        <span>🌙</span> <span>Dark Mode</span>
                      }
                    </span>
                  </button>

                  <!-- Language Toggle -->
                  <button (click)="i18n.toggleLang(); isSettingsOpen.set(false)" class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[var(--color-bg-main)] transition-colors text-xs sm:text-sm font-bold text-[var(--color-text-main)]">
                    <span class="flex items-center gap-2">
                      @if (i18n.currentLang() === 'zh') {
                        <span>🇬🇧</span> <span>English</span>
                      } @else {
                        <span>🇨🇳</span> <span>中文</span>
                      }
                    </span>
                  </button>

                </div>
              }
            </div>
            
            <!-- Auth Info -->
            @if (authStore.isAuthenticated()) {
              <div class="flex items-center space-x-1.5 sm:space-x-3 ml-2 sm:ml-4 border-l pl-2 sm:pl-4" style="border-color: var(--color-border-card)">
                <span class="font-bold tracking-wider max-w-[60px] sm:max-w-[120px] truncate" style="color: var(--color-accent-from)" [title]="authStore.currentUser()?.username">
                  {{ authStore.currentUser()?.username }}
                </span>
                
                <a routerLink="/profile" class="hidden sm:flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded shadow transition-all hover:scale-105 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer shrink-0" title="Profile & Achievements">
                  🏆 <span class="hidden md:inline">{{ i18n.t('nav.profile')() }}</span>
                </a>

                @if (authStore.currentUser()?.role === 'guest') {
                  <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded shadow bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase shrink-0 hidden sm:inline-block">
                    {{ i18n.t('nav.guest')() }}
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
                  {{ i18n.t('nav.signin')() }}
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
