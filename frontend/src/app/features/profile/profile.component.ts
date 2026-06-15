import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameStatsService, UserGameStat } from '../../core/services/game-stats.service';
import { GameService, getLocalizedField } from '../../core/services/game.service';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-6xl mx-auto flex flex-col gap-8">
        
        <!-- Header -->
        <div class="flex items-center gap-4 border-b border-[var(--color-border-card)] pb-6 mb-4">
          <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full flex items-center justify-center text-white text-3xl shadow-lg border-2 border-white/20">
            👤
          </div>
          <div class="flex flex-col">
            <h1 class="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] tracking-tight">
              {{ authStore.currentUser()?.username || 'Player' }}
            </h1>
            <p class="text-sm md:text-base font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
              🏆 <ng-container i18n="@@profile.title">Global Achievements</ng-container>
            </p>
          </div>
        </div>

        <!-- Stats Grid -->
        @if (isLoading()) {
          <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        } @else if (gamesWithStats().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-card)] p-8 text-center shadow-lg">
            <span class="text-6xl mb-4 opacity-50">🎮</span>
            <h2 class="text-2xl font-bold mb-2"><ng-container i18n="@@profile.no_stats">No records found</ng-container></h2>
            <p class="text-[var(--color-text-muted)] mb-6"><ng-container i18n="@@profile.no_stats_desc">Play some games to build up your profile!</ng-container></p>
            <a routerLink="/" class="px-6 py-3 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
              <ng-container i18n="@@lobby.title">Go to Lobby</ng-container>
            </a>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (game of gamesWithStats(); track game.id) {
              <div class="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-card)] p-6 shadow-xl relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                
                <!-- Background decoration -->
                <div class="absolute -right-8 -top-8 text-9xl opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12 pointer-events-none">
                  {{ getGameEmoji(game.id) }}
                </div>

                <div class="flex items-center gap-3 mb-6 relative z-10">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-2xl shadow-inner">
                    {{ getGameEmoji(game.id) }}
                  </div>
                  <div>
                    <h3 class="text-xl font-bold">{{ getLocalized(game.name) }}</h3>
                  </div>
                </div>

                <div class="flex flex-col gap-4 relative z-10">
                  @for (stat of game.stats; track stat.ID) {
                    <div class="bg-[var(--color-bg-main)] rounded-2xl p-4 border border-[var(--color-border-card)] flex flex-col gap-3">
                      
                      <!-- Difficulty/Mode Header -->
                      <div class="flex justify-between items-center border-b border-[var(--color-border-card)] pb-2">
                        <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-accent-from)]/10 text-[var(--color-text-muted)] border border-[var(--color-accent-from)]/20">
                          {{ formatModeAndDiff(stat) }}
                        </span>
                        <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                          <span title="Plays">🎮 {{ stat.PlayCount }}</span>
                          @if (game.id === 'minesweeper' || game.id === 'sudoku' || game.id === 'sliding') {
                            <span title="Wins" class="text-green-500/80">🏆 {{ stat.WinCount }}</span>
                          }
                        </div>
                      </div>

                      <!-- Records -->
                      <div class="flex justify-around items-center pt-1">
                        @if (isTimeGame(game.id)) {
                          <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1"><ng-container i18n="@@profile.best_time">profile.best_time</ng-container></span>
                            <span class="font-mono text-xl md:text-2xl font-black text-[var(--color-accent-to)] drop-shadow-sm">
                              {{ stat.BestTime > 0 ? formatTime(stat.BestTime) : '--:--' }}
                            </span>
                          </div>
                        } @else {
                          <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1"><ng-container i18n="@@profile.best_score">profile.best_score</ng-container></span>
                            <span class="font-mono text-xl md:text-2xl font-black text-amber-500 drop-shadow-sm">
                              {{ stat.BestScore > 0 ? stat.BestScore : '0' }}
                            </span>
                          </div>
                        }
                      </div>

                    </div>
                  }
                </div>

                <div class="mt-6 flex justify-end relative z-10">
                  <a [routerLink]="['/games', game.id]" class="text-sm font-bold text-[var(--color-accent-to)] hover:text-[var(--color-accent-from)] transition-colors flex items-center gap-1 group/btn">
                    <ng-container i18n="@@game.play_now">game.play_now</ng-container>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>

              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  GameMode = GameMode;
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private statsService = inject(GameStatsService);
  private gameService = inject(GameService);

  isLoading = signal(true);
  gamesWithStats = signal<any[]>([]);

  ngOnInit() {
    if (!this.authStore.isAuthenticated()) {
      this.isLoading.set(false);
      return;
    }

    this.gameService.getGames().subscribe(allGames => {
      this.statsService.getAllStats().subscribe(stats => {
        // Group stats by game
        const grouped = stats.reduce((acc, stat) => {
          if (!acc[stat.GameID]) {
            acc[stat.GameID] = [];
          }
          acc[stat.GameID].push(stat);
          return acc;
        }, {} as Record<string, UserGameStat[]>);

        const games = allGames.filter(g => grouped[g.id]).map(g => ({
          ...g,
          stats: grouped[g.id].sort((a, b) => {
            // Sort by mode then difficulty
            if (a.Mode !== b.Mode) return a.Mode.localeCompare(b.Mode);
            return a.Difficulty.localeCompare(b.Difficulty);
          })
        }));

        this.gamesWithStats.set(games);
        this.isLoading.set(false);
      });
    });
  }

  getGameEmoji(id: string): string {
    switch (id) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      case 'hexa': return '🔶';
      case 'tetris': return '🧱';
      case 'gomoku': return '⚫⚪';
      default: return '🎮';
    }
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }

  isTimeGame(gameId: string): boolean {
    return ['minesweeper', 'sudoku', 'sliding'].includes(gameId);
  }

  formatTime(seconds: number): string {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatModeAndDiff(stat: UserGameStat): string {
    let modeStr = stat.Mode === GameMode.Single ? (this.i18n.t('game.single_mode')() || 'Single') : stat.Mode;
    let diffStr = stat.Difficulty;
    if (!diffStr) return modeStr;

    const possibleKey = 'game.diff_' + diffStr.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const translatedDiff = this.i18n.t(possibleKey)();
    
    // if translation exists, use it, else fallback to diffStr but we also check common map
    if (translatedDiff && translatedDiff !== possibleKey) {
        diffStr = translatedDiff;
    } else if (this.i18n.currentLang() === 'zh') {
        const zhMap: Record<string, string> = {
            'easy': '简单', 'medium': '中等', 'hard': '困难', 'expert': '专家',
            'beginner': '初级', 'intermediate': '中级',
            '3x3': '3x3', '4x4': '4x4', '5x5': '5x5', '6x6': '6x6'
        };
        diffStr = zhMap[diffStr] || diffStr;
    }
    return `${modeStr} - ${diffStr}`;
  }
}
