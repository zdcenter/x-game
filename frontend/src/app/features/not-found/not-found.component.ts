import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

interface RecommendedGame {
  id: string;
  nameKey: string;
  icon: string;
  colorClass: string;
  descKey: string;
}

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        
        <!-- 404 Puzzle Graphic -->
        <div class="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-6">
          <div class="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[var(--color-accent-from)] to-[var(--color-accent-to)] opacity-20 blur-xl animate-pulse"></div>
          <div class="relative z-10 w-full h-full flex items-center justify-center rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl p-6">
            <svg class="w-full h-full text-[var(--color-accent-from)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <!-- Puzzle piece with missing slot -->
              <path d="M19.439 7.85c0-1.571-1.28-2.85-2.85-2.85h-2.14a2.85 2.85 0 0 0-5.7 0H6.609C5.038 5 3.758 6.279 3.758 7.85v2.14a2.85 2.85 0 0 1 0 5.7v2.16c0 1.571 1.28 2.85 2.85 2.85h2.14a2.85 2.85 0 0 1 5.7 0h2.14c1.57 0 2.85-1.279 2.85-2.85v-2.16a2.85 2.85 0 0 0 0-5.7v-2.14z"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <!-- Floating mini question mark badge -->
          <div class="absolute -top-2 -right-2 bg-rose-500 text-white font-black text-xs sm:text-sm px-2.5 py-1 rounded-full shadow-lg border-2 border-[var(--color-bg-card)] animate-bounce">
            ?
          </div>
        </div>

        <!-- 404 Status Pill -->
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] text-xs sm:text-sm font-semibold text-[var(--color-accent-from)] mb-3">
          <span class="w-2 h-2 rounded-full bg-[var(--color-accent-from)] animate-ping"></span>
          <span>{{ i18n.t('not_found.badge')() }}</span>
        </div>

        <!-- Title & Subtitle -->
        <h1 class="text-3xl sm:text-5xl font-black tracking-tight mb-3 text-transparent bg-clip-text"
            style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
          {{ i18n.t('not_found.title')() }}
        </h1>
        <p class="max-w-xl text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed mb-8">
          {{ i18n.t('not_found.subtitle')() }}
        </p>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-14">
          <a [routerLink]="['/', i18n.currentLang(), 'lobby']"
             class="px-6 py-3 rounded-2xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer text-white"
             style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            {{ i18n.t('not_found.back_home')() }}
          </a>

          <button (click)="goBack()"
                  class="px-6 py-3 rounded-2xl font-bold text-sm sm:text-base bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-sub)] text-[var(--color-text-main)] border border-[var(--color-border-card)] shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer">
            <svg class="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            {{ i18n.t('not_found.go_back')() }}
          </button>
        </div>

        <!-- Warm Up Games Section -->
        <div class="w-full max-w-3xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl p-6 sm:p-8 shadow-xl text-left">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[var(--color-border-card)]">
            <div>
              <h2 class="text-lg sm:text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
                <span>🧩</span>
                <span>{{ i18n.t('not_found.warm_up_title')() }}</span>
              </h2>
              <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
                {{ i18n.t('not_found.warm_up_subtitle')() }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            @for (game of recommendedGames; track game.id) {
              <a [routerLink]="['/', i18n.currentLang(), 'games', game.id]"
                 class="group p-4 rounded-2xl bg-[var(--color-bg-sub)] hover:bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/40 transition-all duration-200 flex flex-col items-start cursor-pointer hover:shadow-md">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 shadow-inner bg-[var(--color-bg-card)] border border-[var(--color-border-card)] group-hover:scale-110 transition-transform">
                  {{ game.icon }}
                </div>
                <div class="font-bold text-sm sm:text-base text-[var(--color-text-main)] group-hover:text-[var(--color-accent-from)] transition-colors">
                  {{ i18n.t(game.nameKey)() }}
                </div>
                <div class="text-[11px] sm:text-xs text-[var(--color-text-muted)] line-clamp-1 mt-1">
                  {{ i18n.t(game.descKey)() }}
                </div>
              </a>
            }
          </div>
        </div>

      </div>
    </div>
  `
})
export class NotFoundComponent {
  i18n = inject(I18nService);
  private location = inject(Location);

  recommendedGames: RecommendedGame[] = [
    {
      id: 'minesweeper',
      nameKey: 'not_found.game_minesweeper',
      icon: '💣',
      colorClass: 'from-amber-400 to-red-500',
      descKey: 'lobby.minesweeper.desc'
    },
    {
      id: 'gomoku',
      nameKey: 'not_found.game_gomoku',
      icon: '♟️',
      colorClass: 'from-slate-600 to-zinc-900',
      descKey: 'lobby.gomoku.desc'
    },
    {
      id: 'sudoku',
      nameKey: 'not_found.game_sudoku',
      icon: '🔢',
      colorClass: 'from-blue-500 to-indigo-600',
      descKey: 'lobby.sudoku.desc'
    },
    {
      id: 'tents',
      nameKey: 'not_found.game_tents',
      icon: '⛺',
      colorClass: 'from-emerald-500 to-teal-600',
      descKey: 'lobby.tents.desc'
    },
    {
      id: 'sokoban',
      nameKey: 'not_found.game_sokoban',
      icon: '📦',
      colorClass: 'from-amber-500 to-orange-600',
      descKey: 'lobby.sokoban.desc'
    },
    {
      id: 'drop2048',
      nameKey: 'not_found.game_drop2048',
      icon: '🎮',
      colorClass: 'from-purple-500 to-pink-600',
      descKey: 'lobby.drop2048.desc'
    }
  ];

  goBack() {
    this.location.back();
  }
}
