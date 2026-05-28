import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameService, GameConfig, getLocalizedField } from '../../core/services/game.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex-grow flex flex-col items-center p-8 transition-colors duration-300">
      
      <!-- Welcome Header -->
      <div class="text-center mb-16 mt-8">
        <h1 class="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent"
            style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
          {{ i18n.t('lobby.title')() }}
        </h1>
        <p class="text-lg opacity-80 max-w-2xl mx-auto">
          {{ i18n.t('lobby.subtitle')() }}
        </p>
      </div>

      <!-- Games Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
        @for (game of games(); track game.id) {
          <!-- Dynamic Game Card -->
          <a [routerLink]="['/games', game.id]" class="group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
            <!-- Card Image Gradient Banner -->
            <div class="h-48 w-full opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-6xl"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              {{ getGameEmoji(game.id) }}
            </div>
            <!-- Card Content -->
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-2">{{ getLocalized(game.name) }}</h2>
              <p class="opacity-70 text-sm line-clamp-2">
                {{ getLocalized(game.overview) }}
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="px-2 py-1 text-xs font-semibold rounded bg-black/20 border border-emerald-500/50 text-emerald-400">{{ i18n.t('lobby.ready')() }}</span>
                @for (mode of getGameModes(game.id); track mode) {
                  <span class="px-2 py-1 text-xs font-semibold rounded bg-black/20 border border-indigo-500/50 text-indigo-400">{{ mode }}</span>
                }
              </div>
            </div>
          </a>
        }



      </div>
    </div>
  `
})
export class LobbyComponent implements OnInit {
  i18n = inject(I18nService);
  gameService = inject(GameService);
  
  games = signal<GameConfig[]>([]);

  ngOnInit() {
    this.gameService.getGames().subscribe({
      next: (data) => {
        this.games.set(data);
      },
      error: (err) => {
        console.error('Failed to load games', err);
      }
    });
  }

  getGameEmoji(id: string): string {
    switch (id) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      default: return '🎮';
    }
  }

  getGameModes(id: string): string[] {
    const isZh = this.i18n.currentLang() === 'zh';
    switch (id) {
      case 'minesweeper': return isZh ? ['⚡ 同盘抢雷', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sudoku': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'sliding': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      default: return [];
    }
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }
}
