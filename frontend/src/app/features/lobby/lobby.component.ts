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
            <div class="h-48 w-full opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-6xl relative"
                 style="background: linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))">
              
              @if (game.id === 'minesweeper') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <rect x="10" y="10" width="80" height="80" rx="12" fill="#94a3b8" />
                  <path d="M10 10 h 40 v 40 h -40 Z" fill="#cbd5e1" rx="12" />
                  <g fill="rgba(255,255,255,0.6)">
                    <rect x="52" y="12" width="17" height="17" rx="3" />
                    <rect x="71" y="12" width="17" height="17" rx="3" />
                    <rect x="52" y="31" width="17" height="17" rx="3" />
                    <rect x="71" y="31" width="17" height="17" rx="3" />
                    <rect x="12" y="52" width="17" height="17" rx="3" />
                    <rect x="31" y="52" width="17" height="17" rx="3" />
                    <rect x="52" y="52" width="17" height="17" rx="3" />
                    <rect x="71" y="52" width="17" height="17" rx="3" />
                    <rect x="12" y="71" width="17" height="17" rx="3" />
                    <rect x="31" y="71" width="17" height="17" rx="3" />
                    <rect x="52" y="71" width="17" height="17" rx="3" />
                    <rect x="71" y="71" width="17" height="17" rx="3" />
                  </g>
                  <g transform="translate(60.5, 60.5)">
                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
                    <polygon points="0,-8 -10,-3 0,2" fill="#ef4444" />
                    <line x1="-4" y1="8" x2="4" y2="8" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
                  </g>
                  <g transform="translate(30, 30)">
                    <circle cx="0" cy="0" r="9" fill="#1e293b" />
                    <circle cx="-2.5" cy="-2.5" r="2.5" fill="white" opacity="0.4" />
                    <path d="M0 -9 l0 -4 M0 9 l0 4 M-9 0 l-4 0 M9 0 l4 0 M-7 -7 l-3 -3 M7 7 l3 3 M-7 7 l-3 -3 M7 -7 l-3 -3" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" />
                  </g>
                </svg>
              } @else if (game.id === 'sudoku') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <rect x="10" y="10" width="80" height="80" rx="8" fill="rgba(255,255,255,0.95)" />
                  <g stroke="rgba(0,0,0,0.8)" stroke-width="3" stroke-linecap="round">
                    <line x1="10" y1="36.6" x2="90" y2="36.6" />
                    <line x1="10" y1="63.3" x2="90" y2="63.3" />
                    <line x1="36.6" y1="10" x2="36.6" y2="90" />
                    <line x1="63.3" y1="10" x2="63.3" y2="90" />
                  </g>
                  <g stroke="rgba(0,0,0,0.25)" stroke-width="1.5">
                    <line x1="10" y1="18.8" x2="90" y2="18.8" />
                    <line x1="10" y1="27.7" x2="90" y2="27.7" />
                    <line x1="10" y1="45.5" x2="90" y2="45.5" />
                    <line x1="10" y1="54.4" x2="90" y2="54.4" />
                    <line x1="10" y1="72.2" x2="90" y2="72.2" />
                    <line x1="10" y1="81.1" x2="90" y2="81.1" />
                    <line x1="18.8" y1="10" x2="18.8" y2="90" />
                    <line x1="27.7" y1="10" x2="27.7" y2="90" />
                    <line x1="45.5" y1="10" x2="45.5" y2="90" />
                    <line x1="54.4" y1="10" x2="54.4" y2="90" />
                    <line x1="72.2" y1="10" x2="72.2" y2="90" />
                    <line x1="81.1" y1="10" x2="81.1" y2="90" />
                  </g>
                  <rect x="10" y="10" width="26.6" height="26.6" fill="#34d399" opacity="0.6" rx="6" />
                  <rect x="63.3" y="36.6" width="26.6" height="26.6" fill="#60a5fa" opacity="0.6" />
                  <text x="23.3" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#064e3b" text-anchor="middle">5</text>
                  <text x="76.6" y="53.6" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e3a8a" text-anchor="middle">9</text>
                </svg>
              } @else if (game.id === 'sliding') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <g fill="rgba(255,255,255,0.95)" stroke="rgba(0,0,0,0.15)" stroke-width="2">
                    <rect x="10" y="10" width="24" height="24" rx="6" />
                    <rect x="38" y="10" width="24" height="24" rx="6" />
                    <rect x="66" y="10" width="24" height="24" rx="6" />
                    <rect x="10" y="38" width="24" height="24" rx="6" />
                    <rect x="38" y="38" width="24" height="24" rx="6" />
                    <rect x="10" y="66" width="24" height="24" rx="6" />
                    <rect x="38" y="66" width="24" height="24" rx="6" />
                  </g>
                  <rect x="66" y="66" width="24" height="24" rx="6" fill="rgba(0,0,0,0.15)" />
                  <rect x="66" y="38" width="24" height="24" rx="6" fill="rgba(0,0,0,0.15)" />
                  <rect x="66" y="47" width="24" height="24" rx="6" fill="#60a5fa" />
                  <text x="22" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">1</text>
                  <text x="50" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">2</text>
                  <text x="78" y="27" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">3</text>
                  <text x="22" y="55" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">4</text>
                  <text x="50" y="55" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">5</text>
                  <text x="78" y="64" font-family="sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">6</text>
                  <text x="22" y="83" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">7</text>
                  <text x="50" y="83" font-family="sans-serif" font-size="16" font-weight="900" fill="#1e293b" text-anchor="middle">8</text>
                </svg>
              } @else if (game.id === 'hexa') {
                <svg width="110" height="110" viewBox="0 0 100 100" class="drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                  <defs>
                    <polygon id="hx" points="0,-7 6.1,-3.5 6.1,3.5 0,7 -6.1,3.5 -6.1,-3.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
                  </defs>
                  <g fill="rgba(255,255,255,0.25)">
                    <use href="#hx" x="37.9" y="29.0" />
                    <use href="#hx" x="50.0" y="29.0" />
                    <use href="#hx" x="62.1" y="29.0" />
                    <use href="#hx" x="31.8" y="39.5" />
                    <use href="#hx" x="43.9" y="39.5" />
                    <use href="#hx" x="56.1" y="39.5" />
                    <use href="#hx" x="68.2" y="39.5" />
                    <use href="#hx" x="25.8" y="50.0" />
                    <use href="#hx" x="37.9" y="50.0" />
                    <use href="#hx" x="50.0" y="50.0" />
                    <use href="#hx" x="62.1" y="50.0" />
                    <use href="#hx" x="74.2" y="50.0" />
                    <use href="#hx" x="31.8" y="60.5" />
                    <use href="#hx" x="43.9" y="60.5" />
                    <use href="#hx" x="56.1" y="60.5" />
                    <use href="#hx" x="68.2" y="60.5" />
                    <use href="#hx" x="37.9" y="71.0" />
                    <use href="#hx" x="50.0" y="71.0" />
                    <use href="#hx" x="62.1" y="71.0" />
                  </g>
                  <g fill="#fde047" stroke="rgba(250,204,21,0.5)">
                    <use href="#hx" x="43.9" y="60.5" />
                    <use href="#hx" x="56.1" y="60.5" />
                    <use href="#hx" x="62.1" y="71.0" />
                  </g>
                  <g fill="#34d399" stroke="rgba(52,211,153,0.5)">
                    <use href="#hx" x="31.8" y="39.5" />
                    <use href="#hx" x="43.9" y="39.5" />
                    <use href="#hx" x="56.1" y="39.5" />
                  </g>
                </svg>
              } @else {
                <span class="text-6xl">{{ getGameEmoji(game.id) }}</span>
              }
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
      case 'hexa': return '🔶';
      default: return '🎮';
    }
  }

  getGameModes(id: string): string[] {
    const isZh = this.i18n.currentLang() === 'zh';
    switch (id) {
      case 'minesweeper': return isZh ? ['⚡ 同盘抢雷', '⏱️ 异盘竞速'] : ['⚡ PK Steal', '⏱️ PK Speed'];
      case 'sudoku': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'sliding': return isZh ? ['⏱️ 异盘竞速'] : ['⏱️ PK Speed'];
      case 'hexa': return isZh ? ['⏱️ 异盘竞分'] : ['⏱️ PK Score'];
      default: return [];
    }
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }
}
