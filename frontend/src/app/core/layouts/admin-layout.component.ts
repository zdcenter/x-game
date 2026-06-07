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
              <ng-container i18n="@@admin.title">admin.title</ng-container>
            </span>
          </a>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <a routerLink="/admin/realtime" routerLinkActive="bg-emerald-500/20 text-emerald-400 border-emerald-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📊</span>
            <span><ng-container i18n="@@admin.menu.realtime">admin.menu.realtime</ng-container></span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>👥</span>
            <span><ng-container i18n="@@admin.menu.users">admin.menu.users</ng-container></span>
          </a>
          <a routerLink="/admin/games" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>⚙️</span>
            <span><ng-container i18n="@@admin.menu.games">Games</ng-container></span>
          </a>
          <a routerLink="/admin/announcements" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📢</span>
            <span><ng-container i18n="@@admin.menu.announcements">admin.menu.announcements</ng-container></span>
          </a>
          <a routerLink="/admin/settings" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🛠️</span>
            <span><ng-container i18n="@@admin.menu.settings">System Settings</ng-container></span>
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
            <ng-container i18n="@@auth.logout">auth.logout</ng-container>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header -->
        <header class="h-16 bg-[var(--color-bg-card)] backdrop-blur-md border-b border-[var(--color-border-card)] flex items-center justify-between px-8">
          <div class="text-sm font-medium opacity-70">
            Puzzle PK Platform / <span class="font-bold"><ng-container i18n="@@admin.header.breadcrumb">admin.header.breadcrumb</ng-container></span>
          </div>
          
          <div class="flex items-center space-x-2 sm:space-x-4">
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
