import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatsService, GameDifficultyRecord } from '../../../../core/services/game-stats.service';
import { GameRegistryService } from '../../../../core/services/game-registry.service';
import { LevelBadgeComponent } from '../../../../shared/components/level-badge/level-badge.component';

export interface FeaturedGameTab {
  id: string;
  nameKey: string;
  emoji: string;
  route: string;
}

@Component({
  selector: 'app-hall-of-fame',
  standalone: true,
  imports: [CommonModule, RouterLink, LevelBadgeComponent],
  template: `
    <div class="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 h-full">
      
      <!-- Card Top Header -->
      <div class="flex items-center justify-between gap-2 border-b border-[var(--color-border-card)] pb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl sm:text-2xl drop-shadow-sm">👑</span>
          <div>
            <h2 class="text-sm sm:text-base font-black tracking-tight text-[var(--color-text-main)] flex items-center gap-1.5">
              <span>{{ i18n.t('lobby.hall_of_fame_title')() || '游戏极限纪录殿堂' }}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">All-Time</span>
            </h2>
            <p class="text-[11px] text-[var(--color-text-secondary)] line-clamp-1">
              {{ i18n.t('lobby.hall_of_fame_desc')() || '全网会员在各难度的巅峰纪录，随时发起破纪录挑战' }}
            </p>
          </div>
        </div>

        <a [routerLink]="['/', i18n.currentLang(), 'leaderboard']" 
           class="text-[11px] font-bold text-[var(--color-accent-from)] hover:underline flex items-center gap-0.5 shrink-0">
          <span>{{ i18n.t('lobby.view_full_rank')() || '完整天梯' }}</span>
          <span>→</span>
        </a>
      </div>

      <!-- Game Selector Pills (Horizontal Scrollbar) -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        @for (g of featuredGames; track g.id) {
          <button (click)="selectGame(g.id)"
                  class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 border"
                  [class.bg-[var(--color-accent-from)]]="selectedGameId() === g.id"
                  [class.text-white]="selectedGameId() === g.id"
                  [class.border-transparent]="selectedGameId() === g.id"
                  [class.shadow-xs]="selectedGameId() === g.id"
                  [class.bg-[var(--color-bg-main)]]="selectedGameId() !== g.id"
                  [class.text-[var(--color-text-secondary)]]="selectedGameId() !== g.id"
                  [class.border-[var(--color-border-card)]]="selectedGameId() !== g.id">
            <span>{{ g.emoji }}</span>
            <span>{{ i18n.t(g.nameKey)() || g.id }}</span>
          </button>
        }
      </div>

      <!-- Difficulty Milestone Records Grid -->
      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center gap-2">
          <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs text-[var(--color-text-muted)]">加载纪录中...</span>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          @for (rec of records(); track rec.difficulty) {
            <div class="group relative rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-amber-500/40 p-3 flex flex-col justify-between gap-2.5 transition-all hover:shadow-sm">
              
              <!-- Tier Title & Specification -->
              <div class="flex items-center justify-between gap-1">
                <span class="px-2 py-0.5 rounded-lg text-xs font-black tracking-wide"
                      [ngClass]="getDifficultyBadgeClass(rec.difficulty)">
                  {{ getDifficultyLabel(selectedGameId(), rec.difficulty) }}
                </span>
                
                @if (rec.user_id > 0) {
                  <span class="text-[10px] text-[var(--color-text-muted)] font-mono">
                    {{ formatAchievedDate(rec.achieved_at) }}
                  </span>
                }
              </div>

              <!-- Champion Info & Record Stat -->
              @if (rec.user_id > 0) {
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-lg">👑</span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[90px] sm:max-w-[110px]">
                          {{ rec.username }}
                        </span>
                        <app-level-badge [level]="rec.level || 1" size="xs" />
                      </div>
                      <span class="text-[10px] text-[var(--color-text-muted)]">纪录保持者</span>
                    </div>
                  </div>

                  <!-- High Score / Fastest Time Highlight -->
                  <div class="text-right">
                    @if (rec.rank_type === 'time') {
                      <div class="text-sm sm:text-base font-black font-mono text-emerald-500">
                        ⚡ {{ formatTime(rec.best_time) }}
                      </div>
                      <span class="text-[9px] text-[var(--color-text-muted)] font-medium">最短用时</span>
                    } @else {
                      <div class="text-sm sm:text-base font-black font-mono text-amber-500">
                        🏆 {{ rec.best_score }}
                      </div>
                      <span class="text-[9px] text-[var(--color-text-muted)] font-medium">最高得分</span>
                    }
                  </div>
                </div>

                <!-- Action CTA -->
                <button (click)="challengeRecord(rec.difficulty)"
                        class="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                  <span>⚔️</span>
                  <span>{{ i18n.t('lobby.challenge_record_btn')() || '破纪录挑战' }}</span>
                </button>
              } @else {
                <!-- Unclaimed Milestone -->
                <div class="py-2.5 flex flex-col items-center justify-center text-center gap-1">
                  <span class="text-xl opacity-40">🚩</span>
                  <span class="text-xs font-bold text-[var(--color-text-muted)]">
                    {{ i18n.t('lobby.unclaimed_record')() || '虚位以待，等你登顶' }}
                  </span>
                </div>

                <button (click)="challengeRecord(rec.difficulty)"
                        class="w-full py-1.5 px-3 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-border-card)] text-[var(--color-text-main)] border border-[var(--color-border-card)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                  <span>🚀</span>
                  <span>{{ i18n.t('lobby.claim_first_record')() || '抢占首纪录' }}</span>
                </button>
              }

            </div>
          }
        </div>
      }

    </div>
  `
})
export class HallOfFameComponent implements OnInit {
  i18n = inject(I18nService);
  private statsService = inject(GameStatsService);
  private gameRegistry = inject(GameRegistryService);
  private router = inject(Router);

  selectedGameId = signal<string>('nonogram');
  records = signal<GameDifficultyRecord[]>([]);
  loading = signal<boolean>(false);

  readonly featuredGames: FeaturedGameTab[] = [
    { id: 'nonogram',    nameKey: 'lobby.nonogram',    emoji: '🎨', route: '/games/nonogram' },
    { id: 'minesweeper', nameKey: 'lobby.minesweeper', emoji: '💣', route: '/games/minesweeper' },
    { id: 'sudoku',      nameKey: 'lobby.sudoku',      emoji: '🔢', route: '/games/sudoku' },
    { id: 'sliding',     nameKey: 'lobby.sliding',     emoji: '🧩', route: '/games/sliding' },
    { id: 'sokoban',     nameKey: 'lobby.sokoban',     emoji: '📦', route: '/games/sokoban' },
    { id: 'math24',      nameKey: 'lobby.math24',      emoji: '➕', route: '/games/math24' },
    { id: 'lightsout',   nameKey: 'lobby.lightsout',   emoji: '💡', route: '/games/lightsout' },
    { id: 'tetris',      nameKey: 'lobby.tetris',      emoji: '🧱', route: '/games/tetris' },
  ];

  ngOnInit(): void {
    this.fetchRecords(this.selectedGameId());
  }

  selectGame(gameId: string): void {
    if (this.selectedGameId() === gameId) return;
    this.selectedGameId.set(gameId);
    this.fetchRecords(gameId);
  }

  private fetchRecords(gameId: string): void {
    this.loading.set(true);
    this.statsService.getGameDifficultyRecords(gameId).subscribe({
      next: res => {
        this.records.set(res.records || []);
        this.loading.set(false);
      },
      error: () => {
        this.records.set([]);
        this.loading.set(false);
      }
    });
  }

  getDifficultyLabel(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        const name = match.labelKey ? (this.i18n.t(match.labelKey)() || match.id) : match.id;
        const spec = match.descKey ? (this.i18n.t(match.descKey)() || match.desc) : match.desc;
        return spec ? `${name} (${spec})` : name;
      }
    }
    // Fallback dictionary
    const dict: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      master: '大师'
    };
    return dict[diffId] || diffId;
  }

  getDifficultyBadgeClass(diff: string): string {
    switch (diff) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'hard':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'expert':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'master':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatAchievedDate(dateStr: string): string {
    if (!dateStr || dateStr.startsWith('0001')) return '';
    try {
      const date = new Date(dateStr);
      const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) return '刚刚';
      if (diffHours < 24) return `${Math.floor(diffHours)}小时前`;
      if (diffHours < 48) return '昨天';
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '';
    }
  }

  challengeRecord(difficulty: string): void {
    const lang = this.i18n.currentLang();
    this.router.navigate([`/${lang}/games/${this.selectedGameId()}`], {
      queryParams: { difficulty }
    });
  }
}

