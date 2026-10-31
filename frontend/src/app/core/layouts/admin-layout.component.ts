import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../auth/auth.store';
import { I18nService, SUPPORTED_LANGS } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { CoinIconComponent } from '../../shared/components/coin-icon/coin-icon.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, CoinIconComponent],
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
            <span>{{ i18n.t('admin.menu.games')() }}</span>
          </a>
          <a routerLink="/admin/announcements" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📢</span>
            <span>{{ i18n.t('admin.menu.announcements')() }}</span>
          </a>
          <a routerLink="/admin/ads" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>💰</span>
            <span>{{ i18n.t('admin.menu.ads')() }}</span>
          </a>
          <a routerLink="/admin/settings" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🛠️</span>
            <span>{{ i18n.t('admin.menu.settings')() }}</span>
          </a>
          <a routerLink="/admin/feedbacks" routerLinkActive="bg-rose-500/20 text-rose-400 border-rose-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📬</span>
            <span>玩家反馈与留言</span>
          </a>

          <!-- Divider -->
          <div class="border-t border-[var(--color-border-card)] my-2 opacity-40"></div>
          <p class="px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-1">Retention</p>

          <a routerLink="/admin/achievements" routerLinkActive="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🏅</span>
            <span>{{ i18n.t('admin.menu.achievements')() }}</span>
          </a>
          <a routerLink="/admin/daily-challenges" routerLinkActive="bg-orange-500/20 text-orange-400 border-orange-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🎯</span>
            <span>{{ i18n.t('admin.menu.daily_challenges')() }}</span>
          </a>
          <a routerLink="/admin/leaderboard" routerLinkActive="bg-blue-500/20 text-blue-400 border-blue-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🏆</span>
            <span>{{ i18n.t('admin.menu.leaderboard')() }}</span>
          </a>
          <a routerLink="/admin/xp-config" routerLinkActive="bg-green-500/20 text-green-400 border-green-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <app-coin-icon size="sm" />
            <span>{{ i18n.t('admin.menu.xp_config')() }}</span>
          </a>

          <!-- Divider -->
          <div class="border-t border-[var(--color-border-card)] my-2 opacity-40"></div>
          <p class="px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-1">System & Assets</p>

          <a routerLink="/admin/images" routerLinkActive="bg-violet-500/20 text-violet-400 border-violet-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🖼️</span>
            <span>图片管理</span>
          </a>
          <a routerLink="/admin/database" routerLinkActive="bg-cyan-500/20 text-cyan-400 border-cyan-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🗄️</span>
            <span>数据库管理</span>
          </a>
        </nav>

        <!-- Sidebar Bottom Footer: Clean Brand / Return Lobby -->
        <div class="p-3.5 border-t border-[var(--color-border-card)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <a routerLink="/lobby" class="hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1.5 font-bold">
            <span>🎮</span>
            <span>{{ i18n.t('admin.back_to_lobby')() || '返回大厅' }}</span>
          </a>
          <span class="font-mono text-[11px] opacity-50">v3.2</span>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header -->
        <header class="h-16 bg-[var(--color-bg-card)] backdrop-blur-md border-b border-[var(--color-border-card)] flex items-center justify-between px-6 sm:px-8 flex-shrink-0">
          <div class="text-sm font-medium opacity-70 flex items-center gap-2">
            <span>Puzzle PK Platform</span>
            <span class="opacity-40">/</span>
            <span class="font-bold text-[var(--color-text-main)]">{{ i18n.t('admin.header.breadcrumb')() }}</span>
          </div>
          
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Theme Toggle -->
            <button (click)="theme.cycleTheme()" 
                    class="p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] rounded-xl transition-colors border border-[var(--color-border-card)]/50 hover:border-[var(--color-border-card)]"
                    title="Toggle Theme">
              @if (theme.currentTheme() === 'dark') {
                <span class="text-lg leading-none block">☀️</span>
              } @else {
                <span class="text-lg leading-none block">🌙</span>
              }
            </button>

            <!-- Language Dropdown -->
            <div class="relative">
              <button (click)="isLangMenuOpen.set(!isLangMenuOpen())"
                      class="p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] rounded-xl transition-colors border border-[var(--color-border-card)]/50 hover:border-[var(--color-border-card)]"
                      title="Select Language">
                <span class="text-lg leading-none block">{{ currentLangFlag() }}</span>
              </button>
              
              @if (isLangMenuOpen()) {
                <!-- Invisible backdrop -->
                <div class="fixed inset-0 z-[90]" (click)="isLangMenuOpen.set(false)"></div>
                
                <div class="absolute right-0 mt-2 w-40 rounded-xl shadow-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] py-2 z-[100] animate-fade-in-down" (click)="isLangMenuOpen.set(false)">
                  @for (lang of supportedLangs; track lang.code) {
                    <button (click)="i18n.setLang(lang.code)" 
                            class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-border-card)] text-[var(--color-text-main)] flex items-center gap-3 transition-colors"
                            [class.text-emerald-400]="i18n.currentLang() === lang.code">
                      <span class="text-lg">{{ lang.flag }}</span>
                      <span class="font-medium">{{ lang.name }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Divider -->
            <div class="h-6 w-px bg-[var(--color-border-card)] opacity-60 mx-1"></div>

            <!-- Current User Badge & Logout in Top Right -->
            <div class="flex items-center gap-2.5 bg-[var(--color-bg-main)]/60 border border-[var(--color-border-card)] pl-1.5 pr-2.5 py-1 rounded-xl">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                {{ authStore.currentUser()?.username?.charAt(0)?.toUpperCase() || 'A' }}
              </div>
              <div class="flex flex-col text-left leading-tight">
                <span class="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[100px] sm:max-w-[130px]">
                  {{ authStore.currentUser()?.username || 'Admin' }}
                </span>
                <span class="text-[9px] font-mono font-extrabold text-purple-400 uppercase tracking-widest">
                  {{ authStore.currentUser()?.role || 'ADMIN' }}
                </span>
              </div>
              <button (click)="logout()" 
                      [title]="i18n.t('auth.logout')()" 
                      class="ml-1 p-1.5 text-xs text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/15 rounded-lg border border-transparent hover:border-red-500/30 transition-all flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
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
  isLangMenuOpen = signal(false);

  supportedLangs = SUPPORTED_LANGS;
  currentLangFlag = computed(() => {
    const code = this.i18n.currentLang();
    return this.supportedLangs.find(l => l.code === code)?.flag || '🌍';
  });

  logout() {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
