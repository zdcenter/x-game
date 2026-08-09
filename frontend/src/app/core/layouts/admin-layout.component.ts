import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../auth/auth.store';
import { I18nService, SUPPORTED_LANGS } from '../i18n/i18n.service';
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

          <!-- Divider -->
          <div class="border-t border-[var(--color-border-card)] my-2 opacity-40"></div>
          <p class="px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-1">Retention</p>

          <a routerLink="/admin/achievements" routerLinkActive="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🏅</span>
            <span>{{ i18n.t('admin.menu.achievements')() }}</span>
          </a>
          <a routerLink="/admin/daily-challenges" routerLinkActive="bg-orange-500/20 text-orange-400 border-orange-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📅</span>
            <span>{{ i18n.t('admin.menu.daily_challenges')() }}</span>
          </a>
          <a routerLink="/admin/leaderboard" routerLinkActive="bg-blue-500/20 text-blue-400 border-blue-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🏆</span>
            <span>{{ i18n.t('admin.menu.leaderboard')() }}</span>
          </a>
          <a routerLink="/admin/xp-config" routerLinkActive="bg-green-500/20 text-green-400 border-green-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>✨</span>
            <span>{{ i18n.t('admin.menu.xp_config')() }}</span>
          </a>

          <!-- Divider -->
          <div class="border-t border-[var(--color-border-card)] my-2 opacity-40"></div>
          <p class="px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-1">Content</p>

          <a routerLink="/admin/images" routerLinkActive="bg-violet-500/20 text-violet-400 border-violet-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🖼</span>
            <span>图片管理</span>
          </a>
          <a routerLink="/admin/blog" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📝</span>
            <span>Blog</span>
          </a>
          <a routerLink="/admin/idioms" routerLinkActive="bg-teal-500/20 text-teal-400 border-teal-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📖</span>
            <span>成语词库</span>
          </a>
          <a routerLink="/admin/articles" routerLinkActive="bg-cyan-500/20 text-cyan-400 border-cyan-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📣</span>
            <span>{{ i18n.t('admin.menu.articles')() }}</span>
          </a>
          <a routerLink="/admin/distribute" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>📡</span>
            <span>内容分发</span>
          </a>

          <!-- Divider -->
          <div class="border-t border-[var(--color-border-card)] my-2 opacity-40"></div>
          <p class="px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-1">System</p>

          <a routerLink="/admin/database" routerLinkActive="bg-cyan-500/20 text-cyan-400 border-cyan-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-[var(--color-border-card)] transition-colors text-sm font-bold tracking-wide">
            <span>🗄️</span>
            <span>数据库管理</span>
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
            Puzzle PK Platform / <span class="font-bold">{{ i18n.t('admin.header.breadcrumb')() }}</span>
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

            <!-- Language Dropdown -->
            <div class="relative">
              <button (click)="isLangMenuOpen.set(!isLangMenuOpen())"
                      class="p-1.5 sm:p-2 text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)] rounded-lg transition-colors border border-transparent hover:border-[var(--color-border-card)]"
                      title="Select Language">
                <span class="text-xl leading-none block">{{ currentLangFlag() }}</span>
              </button>
              
              @if (isLangMenuOpen()) {
                <!-- Invisible backdrop -->
                <div class="fixed inset-0 z-[90]" (click)="isLangMenuOpen.set(false)"></div>
                
                <div class="absolute right-0 mt-2 w-40 rounded-xl shadow-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] py-2 z-[100] animate-fade-in-down" (click)="isLangMenuOpen.set(false)">
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
