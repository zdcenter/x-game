import { Component, inject } from '@angular/core';
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
    <div class="min-h-screen flex bg-slate-950 text-slate-300 font-sans">
      
      <!-- Left Sidebar -->
      <aside class="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <!-- Brand -->
        <div class="h-16 flex items-center px-6 border-b border-slate-800">
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
          <a routerLink="/admin/users" routerLinkActive="bg-purple-500/20 text-purple-400 border-purple-500/50" class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent hover:bg-slate-800 transition-colors text-sm font-bold tracking-wide">
            <span>👥</span>
            <span>{{ i18n.t('admin.menu.users')() }}</span>
          </a>
          <!-- Future links can go here: Game Settings, Server Logs, etc. -->
          <a class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent opacity-50 cursor-not-allowed text-sm font-bold tracking-wide">
            <span>⚙️</span>
            <span>{{ i18n.t('admin.menu.settings')() }}</span>
          </a>
          <a class="flex items-center space-x-3 px-4 py-3 rounded-xl border border-transparent opacity-50 cursor-not-allowed text-sm font-bold tracking-wide">
            <span>📊</span>
            <span>{{ i18n.t('admin.menu.logs')() }}</span>
          </a>
        </nav>

        <!-- Current User Info -->
        <div class="p-4 border-t border-slate-800">
          <div class="flex items-center space-x-3 mb-4 px-2">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {{ authStore.currentUser()?.username?.charAt(0)?.toUpperCase() }}
            </div>
            <div>
              <div class="text-sm font-bold text-white">{{ authStore.currentUser()?.username }}</div>
              <div class="text-xs text-purple-400 uppercase tracking-widest">{{ authStore.currentUser()?.role }}</div>
            </div>
          </div>
          <button (click)="logout()" class="w-full py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg text-sm font-bold transition-colors">
            {{ i18n.t('auth.logout')() }}
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Header -->
        <header class="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8">
          <div class="text-sm font-medium text-slate-500">
            X-Game Platform / <span class="text-slate-300">{{ i18n.t('admin.header.breadcrumb')() }}</span>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Theme Switcher Dropdown -->
            <select (change)="onThemeChange($event)" [value]="theme.currentTheme()"
                    class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 border uppercase cursor-pointer outline-none bg-slate-800 border-slate-700 text-purple-400">
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
            </select>

            <!-- Language Switcher Dropdown -->
            <select (change)="onLangChange($event)" [value]="i18n.currentLang()"
                    class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 border cursor-pointer outline-none bg-slate-800 border-slate-700 text-slate-300">
              <option value="zh">🇨🇳 中文</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 overflow-y-auto p-8 bg-slate-950">
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

  onThemeChange(event: any) {
    const selectedTheme = event.target.value;
    if (this.theme.currentTheme() !== selectedTheme) {
      this.theme.cycleTheme(); 
    }
  }

  onLangChange(event: any) {
    const selectedLang = event.target.value;
    if (this.i18n.currentLang() !== selectedLang) {
      this.i18n.toggleLang(); 
    }
  }

  logout() {
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
