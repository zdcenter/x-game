import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatsService, GameDifficultyRecord } from '../../../../core/services/game-stats.service';
import { GameRegistryService } from '../../../../core/services/game-registry.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { LevelBadgeComponent } from '../../../../shared/components/level-badge/level-badge.component';
import { GAME_DEFINITIONS } from '../../../../core/config/game-definitions';

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
    <div class="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col gap-3 sm:gap-3.5 h-full">
      
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

      <!-- Game Selector Pills (Horizontal Scrollbar with mouse wheel support) -->
      <div (wheel)="onWheelScroll($event)"
           class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
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

      <!-- Difficulty Milestone Records Tier Ladder -->
      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center gap-2 flex-grow">
          <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs text-[var(--color-text-muted)]">加载纪录中...</span>
        </div>
      } @else {
        <div class="flex flex-col gap-2.5 flex-grow">
          @for (rec of records(); track rec.difficulty) {
            <div class="group flex items-center justify-between gap-1.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/60 hover:bg-[var(--color-bg-main)] hover:border-amber-500/40 transition-all hover:shadow-xs">
              
              <!-- Tier Badge & Specification (Left Column) -->
              <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0 w-[60px] sm:w-[130px]">
                <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" [ngClass]="getDifficultyDotClass(rec.difficulty)"></span>
                <div class="flex flex-col min-w-0 leading-tight">
                  <span class="text-xs sm:text-sm font-black text-[var(--color-text-main)] tracking-wide truncate">
                    {{ getDifficultyName(selectedGameId(), rec.difficulty) }}
                  </span>
                  @if (getDifficultySpec(selectedGameId(), rec.difficulty)) {
                    <span class="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                      {{ getDifficultySpec(selectedGameId(), rec.difficulty) }}
                    </span>
                  }
                </div>
              </div>

              <!-- Champion & Record Stat (Center Column) -->
              @if (rec.user_id > 0) {
                <div class="flex items-center justify-between sm:justify-start gap-1 sm:gap-6 flex-1 min-w-0 px-1 sm:px-2">
                  <!-- User Info -->
                  <div class="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
                    <span class="text-sm sm:text-base shrink-0">👑</span>
                    <span class="text-xs sm:text-sm font-bold text-[var(--color-text-main)] truncate max-w-[70px] sm:max-w-[130px]">
                      {{ rec.username }}
                    </span>
                    <app-level-badge [level]="rec.level || 1" size="xs" />
                  </div>

                  <!-- Time / Score Stat -->
                  <div class="flex items-baseline gap-1.5 sm:gap-2 shrink-0">
                    @if (rec.rank_type === 'time') {
                      <div class="flex items-baseline gap-0.5 sm:gap-1">
                        <span class="text-xs text-emerald-500 font-bold">⚡</span>
                        <span class="text-xs sm:text-base font-black font-mono text-emerald-500 whitespace-nowrap">
                          {{ formatTime(rec.best_time) }}
                        </span>
                        <span class="text-[10px] text-[var(--color-text-muted)] hidden md:inline ml-0.5">全网极速</span>
                      </div>
                    } @else {
                      <div class="flex items-baseline gap-0.5 sm:gap-1">
                        <span class="text-xs text-amber-500 font-bold">🏆</span>
                        <span class="text-xs sm:text-base font-black font-mono text-amber-500 whitespace-nowrap">
                          {{ rec.best_score }}
                        </span>
                        <span class="text-[10px] text-[var(--color-text-muted)] hidden md:inline ml-0.5">最高分</span>
                      </div>
                    }
                    <span class="text-[10px] text-[var(--color-text-muted)] font-mono hidden sm:inline">
                      {{ formatAchievedDate(rec.achieved_at) }}
                    </span>
                  </div>
                </div>
              } @else {
                <!-- Unclaimed Milestone -->
                <div class="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 flex-1 min-w-0 px-1 sm:px-2">
                  <div class="flex items-center gap-1 sm:gap-1.5 text-xs text-[var(--color-text-muted)] min-w-0">
                    <span class="text-xs sm:text-sm opacity-50 shrink-0">🚩</span>
                    <span class="font-medium text-[11px] sm:text-xs truncate whitespace-nowrap">
                      <span class="sm:hidden">虚位以待</span>
                      <span class="hidden sm:inline">虚位以待 · 突破极限定格史册</span>
                    </span>
                  </div>
                  <span class="text-xs font-mono text-[var(--color-text-muted)] opacity-50 shrink-0 whitespace-nowrap">⚡ --:--</span>
                </div>
              }

              <!-- Challenge Action CTA (Right Column) -->
              <div class="shrink-0">
                @if (rec.user_id > 0) {
                  <button (click)="challengeRecord(rec.difficulty)"
                          class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/25 text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                    <span>⚔️</span>
                    <span class="hidden sm:inline">破纪录</span><span>挑战</span>
                  </button>
                } @else {
                  <button (click)="challengeRecord(rec.difficulty)"
                          class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] hover:brightness-110 text-white border border-transparent text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                    <span>🚀</span>
                    <span>抢首登</span>
                  </button>
                }
              </div>

            </div>
          }
        </div>
      }

      <!-- Hall of Fame Honour & Rules Footer Bar (Fills remaining height naturally & adds clear value) -->
      <div class="mt-auto pt-2.5 border-t border-[var(--color-border-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[var(--color-text-secondary)]">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-amber-500 font-bold shrink-0">💡 破榜规则:</span>
          <span class="truncate text-[var(--color-text-muted)]">
            超越全网纪录即可登顶殿堂，刷新纪录立赠 <b class="text-amber-500">+50</b> 脑力金币与全网快报！
          </span>
        </div>
        <a [routerLink]="['/', i18n.currentLang(), 'leaderboard']" 
           [queryParams]="{ game: selectedGameId() }"
           class="text-[var(--color-accent-from)] hover:underline font-bold whitespace-nowrap shrink-0 flex items-center gap-0.5">
          <span>查看该游戏排行榜</span>
          <span>→</span>
        </a>
      </div>

    </div>
  `
})
export class HallOfFameComponent implements OnInit {
  i18n = inject(I18nService);
  private statsService = inject(GameStatsService);
  private gameRegistry = inject(GameRegistryService);
  private wsService = inject(WebSocketService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const evt = this.wsService.globalRecordBrokenEvent();
      if (evt && evt.game_id === this.selectedGameId()) {
        this.fetchRecords(this.selectedGameId());
      }
    });
  }

  selectedGameId = signal<string>('nonogram');
  records = signal<GameDifficultyRecord[]>([]);
  loading = signal<boolean>(false);
  readonly currentTime = signal<number>(Date.now());

  readonly featuredGames: FeaturedGameTab[] = GAME_DEFINITIONS.map(g => {
    const emojis: Record<string, string> = {
      minesweeper: '💣', sudoku: '🔢', sliding: '🧩', hexa: '🔷',
      tetris: '🧱', gomoku: '⚪', codebreaker: '🔐', math24: '➕',
      drop2048: '🎲', block: '🟩', lightsout: '💡', watersort: '🧪',
      sokoban: '📦', nonogram: '🎨', idiom: '📚', classic2048: '2️⃣',
      connect: '🌈', hashi: '🌉', tilematch: '🐑', tents: '⛺',
    };
    return {
      id: g.id,
      nameKey: g.titleKey,
      emoji: emojis[g.id] || g.iconEmoji || '🎮',
      route: g.route
    };
  });

  onWheelScroll(event: WheelEvent): void {
    const el = event.currentTarget as HTMLElement;
    if (el && event.deltaY !== 0) {
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }

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

  getDifficultyName(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        return match.labelKey ? (this.i18n.t(match.labelKey)() || match.id) : match.id;
      }
    }
    const isZh = this.i18n.currentLang() === 'zh';
    const dict: Record<string, string> = {
      easy: isZh ? '简单' : 'Easy',
      medium: isZh ? '中等' : 'Medium',
      hard: isZh ? '困难' : 'Hard',
      expert: isZh ? '专家' : 'Expert',
      master: isZh ? '大师' : 'Master',
      '3x3': isZh ? '3×3 阶' : '3×3',
      '4x4': isZh ? '4×4 阶' : '4×4',
      '5x5': isZh ? '5×5 阶' : '5×5'
    };
    return dict[diffId] || diffId;
  }

  getDifficultySpec(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        return match.descKey ? (this.i18n.t(match.descKey)() || match.desc || '') : (match.desc || '');
      }
    }
    return '';
  }

  getDifficultyDotClass(diff: string): string {
    switch (diff.toLowerCase()) {
      case 'easy':
      case '3x3':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'medium':
      case '4x4':
        return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      case 'hard':
      case '5x5':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'expert':
        return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
      case 'master':
        return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      default:
        return 'bg-zinc-400';
    }
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
      const diffHours = (this.currentTime() - date.getTime()) / (1000 * 60 * 60);
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

