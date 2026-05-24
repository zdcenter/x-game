import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <div class="min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      <!-- Global Navbar -->
      <header class="sticky top-0 z-50 backdrop-blur-md border-b" style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <!-- Logo & Brand -->
          <a routerLink="/lobby" class="flex items-center space-x-2 cursor-pointer group">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg transition-transform group-hover:scale-110"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              X
            </div>
            <span class="text-xl font-extrabold tracking-widest bg-clip-text text-transparent transition-all"
                  style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
              GAME
            </span>
          </a>

          <!-- Controls -->
          <div class="flex items-center space-x-4">
            <!-- Theme Switcher Dropdown -->
            <select (change)="onThemeChange($event)" [value]="theme.currentTheme()"
                    class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 border uppercase cursor-pointer outline-none"
                    style="background-color: var(--color-bg-main); border-color: var(--color-border-card); color: var(--color-accent-from)">
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
            </select>

            <!-- Language Switcher Dropdown -->
            <select (change)="onLangChange($event)" [value]="i18n.currentLang()"
                    class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 border cursor-pointer outline-none"
                    style="background-color: var(--color-bg-main); border-color: var(--color-border-card)">
              <option value="zh">🇨🇳 中文</option>
              <option value="en">🇬🇧 English</option>
            </select>
            
            <!-- Auth Info -->
            @if (authStore.isAuthenticated()) {
              <div class="flex items-center space-x-3 ml-4 border-l pl-4" style="border-color: var(--color-border-card)">
                <span class="font-bold tracking-wider" style="color: var(--color-accent-from)">
                  {{ authStore.currentUser()?.username }}
                </span>
                @if (authStore.isAdmin()) {
                  <a routerLink="/admin" class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 uppercase cursor-pointer">
                    Admin
                  </a>
                }
                <button (click)="logout()" 
                        class="px-3 py-1.5 text-sm font-bold rounded shadow transition-all hover:scale-105 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                  Logout
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-grow flex flex-col">
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
