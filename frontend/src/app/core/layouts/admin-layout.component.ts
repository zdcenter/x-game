import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="h-[100dvh] overflow-hidden w-full flex bg-[var(--color-bg-main)] text-[var(--color-text-main)] font-sans">
      
      <!-- Left Sidebar -->
      <aside class="w-64 flex-shrink-0 bg-[var(--color-bg-card)] border-r border-[var(--color-border-card)] flex flex-col">
        <!-- Brand -->
        <div class="h-16 flex items-center px-6 border-b border-[var(--color-border-card)]">
          <a routerLink="/lobby" class="flex items-center space-x-2 group">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              X
            </div>
            <span class="text-xl font-extrabold tracking-widest text-white">
              {{ i18n.t('admin.title')() }}
            </span>
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <a routerLink="/admin/realtime" routerLinkActive="bg-emerald-500/20 text-emerald-400 border-emerald-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📊</span>
            <span>{{ i18n.t('admin.menu.realtime')() }}</span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>👥</span>
            <span>{{ i18n.t('admin.menu.users')() }}</span>
          </a>
          <a routerLink="/admin/games" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>⚙️</span>
            <span>{{ i18n.t('admin.menu.games')() || 'Games' }}</span>
          </a>
          <a routerLink="/admin/announcements" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📢</span>
            <span>{{ i18n.t('admin.menu.announcements')() }}</span>
          </a>
          <a routerLink="/admin/settings" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🛠️</span>
            <span>{{ i18n.t('admin.menu.settings')() || 'System Settings' }}</span>
          </a>
        </nav>

        <!-- Current User Info -->
        <div class="p-4 border-t border-[var(--color-border-card)]">
          <div class="flex items-center space-x-3 mb-4 px-2">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {{ authStore.currentUser()?.username?.charAt(0)?.toUpperCase() }}
            </div>
            <div>
              <div class="text-sm font-bold text-inherit">{{ authStore.currentUser()?.username }}</div>
              <div class="text-xs text-purple-400 uppercase tracking-widest">{{ authStore.currentUser()?.role }}</div>
            </div>
          </div>
          <button (click)="logout()" class="w-full py-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 text-inherit opacity-80 hover:opacity-100 rounded-lg text-sm font-bold transition-colors">
            {{ i18n.t('auth.logout')() }}
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header -->
        <header class="h-16 bg-[var(--color-bg-card)] backdrop-blur-md border-b border-[var(--color-border-card)] flex items-center justify-between px-8">
          <div class="text-sm font-medium opacity-70">
            X-Game Platform / <span class="font-bold">{{ i18n.t('admin.header.breadcrumb')() }}</span>
          </div>
          
          <div class="flex items-center space-x-2 sm:space-x-4">
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
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 overflow-y-auto p-8 bg-transparent">
          <router-outlet></router-outlet>
        </div>
      </main>

    </div>
  `
})
export class AdminLayoutComponent {
  authStore = inject(AuthStore);
  router = inject(Router);
  i18n = inject(I18nService);
  theme = inject(ThemeService);

  isSettingsOpen = signal(false);

  logout() {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
