import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameStatsService, UserGameStat } from '../../core/services/game-stats.service';
import { GameService, getLocalizedField } from '../../core/services/game.service';
import { AuthStore } from '../../core/auth/auth.store';
import { XpService } from '../../core/services/xp.service';
import { AchievementService, AchievementWithStatus } from '../../core/services/achievement.service';
import { LeaderboardService, RankEntry } from '../../core/services/leaderboard.service';
import { LevelBadgeComponent } from '../../shared/components/level-badge/level-badge.component';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
import { ShareService } from '../../core/services/share.service';
import { ShareImageService, ProfileCardData } from '../../core/services/share-image.service';
import { getOrigin, isBrowser } from '../../core/utils/browser.util';

type Tab = 'overview' | 'achievements' | 'rankings' | 'history';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, LevelBadgeComponent],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-5xl mx-auto flex flex-col gap-6">

        <!-- Header -->
        <div class="flex items-center gap-4 border-b border-[var(--color-border-card)] pb-5">
          <div class="w-16 h-16 bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full flex items-center justify-center text-white text-3xl shadow-lg border-2 border-white/20">
            👤
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]">
                {{ authStore.currentUser()?.username || 'Player' }}
              </h1>
              <app-level-badge [level]="authStore.currentUser()?.level ?? 1" />
            </div>

            <!-- XP Bar -->
            @if (authStore.currentUser()) {
              <div class="mt-2 flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full bg-[var(--color-border-card)] overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full transition-all duration-700"
                       [style.width.%]="xpProgress().pct">
                  </div>
                </div>
                <span class="text-xs font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                  {{ xpProgress().current }}/{{ xpProgress().total }} XP
                </span>
              </div>
              <p class="text-xs text-[var(--color-text-muted)] mt-1">
                {{ i18n.t('xp.login_streak')() }}: {{ authStore.currentUser()!.login_streak }} {{ i18n.t('xp.days')() }}
              </p>
              <button (click)="shareProfile()"
                class="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] font-bold text-xs transition-all active:scale-95 self-start">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {{ i18n.t('share.profile_card')() }}
              </button>
            }
          </div>
        </div>

        <!-- Tab selector -->
        <div class="flex rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-1 gap-1">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all"
                    [class]="activeTab() === tab.id
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ tab.icon }} {{ i18n.t(tab.labelKey)() }}
            </button>
          }
        </div>

        <!-- ── Overview Tab ── -->
        @if (activeTab() === 'overview') {
          @if (isLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (gamesWithStats().length === 0) {
            <div class="flex flex-col items-center gap-4 py-16 text-[var(--color-text-muted)]">
              <span class="text-5xl opacity-40">🎮</span>
              <p class="font-bold">{{ i18n.t('profile.no_stats')() }}</p>
              <a routerLink="/lobby" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm">
                {{ i18n.t('lobby.title')() }}
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              @for (game of gamesWithStats(); track game.id) {
                <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5 shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div class="absolute -right-6 -top-6 text-8xl opacity-[0.03] pointer-events-none">{{ getGameEmoji(game.id) }}</div>
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-xl shadow-inner">
                      {{ getGameEmoji(game.id) }}
                    </div>
                    <h3 class="font-bold text-[var(--color-text-main)]">{{ getLocalized(game.name) }}</h3>
                  </div>
                  @for (stat of game.stats; track stat.ID) {
                    <div class="bg-[var(--color-bg-main)] rounded-xl p-3 border border-[var(--color-border-card)] mb-2 last:mb-0">
                      <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-accent-from)]/10 text-[var(--color-text-muted)] border border-[var(--color-accent-from)]/20">
                          {{ formatModeAndDiff(stat) }}
                        </span>
                        <span class="text-[10px] text-[var(--color-text-muted)]">🎮 {{ stat.PlayCount }}</span>
                      </div>
                      @if (isTimeGame(game.id)) {
                        <p class="font-mono text-xl font-black text-[var(--color-accent-to)]">
                          {{ stat.BestTime > 0 ? formatTime(stat.BestTime) : '--:--' }}
                        </p>
                      } @else {
                        <p class="font-mono text-xl font-black text-amber-400">{{ stat.BestScore }}</p>
                      }
                    </div>
                  }
                  <a [routerLink]="['/', i18n.currentLang(), 'games', game.id]" class="mt-3 text-xs font-bold text-[var(--color-accent-to)] flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    {{ i18n.t('game.play_now')() }} →
                  </a>
                </div>
              }
            </div>
          }
        }

        <!-- ── Achievements Tab ── -->
        @if (activeTab() === 'achievements') {
          @if (achievementsLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else {
            <div class="flex items-center gap-4 mb-2">
              <p class="text-sm text-[var(--color-text-muted)]">
                {{ unlockedCount() }}/{{ achievements().length }} {{ i18n.t('achievement.unlocked')() }}
              </p>
              <!-- Progress bar -->
              <div class="flex-1 h-1.5 rounded-full bg-[var(--color-border-card)] overflow-hidden">
                <div class="h-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full transition-all"
                     [style.width.%]="achievements().length ? (unlockedCount() / achievements().length) * 100 : 0">
                </div>
              </div>
            </div>

            @for (cat of achievementCategories(); track cat) {
              <div class="mb-6">
                <h3 class="font-black text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  {{ i18n.t('achievement.category.' + cat)() || cat }}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (a of achievementsByCategory(cat); track a.id) {
                    <div class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                         [class]="a.unlocked_at
                           ? achievementService.rarityColor(a.rarity) + ' shadow-md'
                           : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] opacity-50'">
                      <span class="text-2xl flex-shrink-0" [class.grayscale]="!a.unlocked_at">{{ a.icon_emoji }}</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm truncate">{{ i18n.t(a.title_key)() || a.title_key }}</p>
                        <p class="text-[11px] opacity-60 truncate">{{ i18n.t(a.desc_key)() || a.desc_key }}</p>
                      </div>
                      <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                              [class]="a.rarity === 'legendary' ? 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10'
                                     : a.rarity === 'epic' ? 'text-purple-300 border-purple-400/40 bg-purple-400/10'
                                     : a.rarity === 'rare' ? 'text-blue-300 border-blue-400/40 bg-blue-400/10'
                                     : 'text-green-300 border-green-400/40 bg-green-400/10'">
                          {{ i18n.t('achievement.rarity.' + a.rarity)() }}
                        </span>
                        <span class="text-[10px] font-bold text-[var(--color-accent-to)]">+{{ a.xp_reward }} XP</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }

        <!-- ── Rankings Tab ── -->
        @if (activeTab() === 'rankings') {
          @if (ranksLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (!myRanks().length) {
            <div class="flex flex-col items-center gap-3 py-16 text-[var(--color-text-muted)]">
              <span class="text-5xl opacity-40">🏆</span>
              <p class="font-bold">{{ i18n.t('leaderboard.not_ranked')() }}</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (r of myRanks(); track r.game_id + r.mode + r.difficulty) {
                <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                  <span class="text-2xl font-black" [class]="rankColor(r.rank)">
                    {{ r.rank <= 3 ? rankMedal(r.rank) : '#' + r.rank }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm">{{ getGameEmoji(r.game_id) }} {{ getGameNameById(r.game_id) }}</p>
                    <p class="text-[11px] text-[var(--color-text-muted)]">{{ r.mode }} · {{ r.difficulty }}</p>
                  </div>
                  <div class="text-right">
                    @if (r.best_time > 0) {
                      <p class="font-mono font-bold text-sm text-[var(--color-accent-to)]">{{ formatTime(r.best_time) }}</p>
                    } @else {
                      <p class="font-mono font-bold text-sm text-amber-400">{{ r.best_score }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- ── History Tab ── -->
        @if (activeTab() === 'history') {
          <p class="text-sm text-[var(--color-text-muted)] mb-2">{{ i18n.t('history.title')() }}</p>
          @if (historyLoading()) {
            <div class="flex justify-center py-16">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (!matchHistory().length) {
            <div class="flex flex-col items-center gap-3 py-16 text-[var(--color-text-muted)]">
              <span class="text-5xl opacity-40">📋</span>
              <p class="font-bold">{{ i18n.t('history.no_history')() }}</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (h of matchHistory(); track h.id) {
                <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                  <span class="text-2xl flex-shrink-0">{{ getGameEmoji(h.game_id) }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm">{{ getGameNameById(h.game_id) }}</p>
                    <p class="text-[11px] text-[var(--color-text-muted)]">{{ h.mode }} · {{ h.difficulty }} · {{ formatDate(h.played_at) }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-0.5">
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full border"
                          [class]="h.result === 'win' || h.result === 'completed'
                            ? 'text-green-300 border-green-400/40 bg-green-400/10'
                            : 'text-red-300 border-red-400/40 bg-red-400/10'">
                      {{ i18n.t('history.result.' + h.result)() || h.result }}
                    </span>
                    <span class="text-[11px] font-bold text-[var(--color-accent-to)]">+{{ h.xp_earned }} XP</span>
                  </div>
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  GameMode = GameMode;
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  xpService = inject(XpService);
  achievementService = inject(AchievementService);
  private statsService = inject(GameStatsService);
  private gameService = inject(GameService);
  private leaderboardService = inject(LeaderboardService);
  private shareService = inject(ShareService);
  private shareImageService = inject(ShareImageService);

  activeTab = signal<Tab>('overview');

  tabs = [
    { id: 'overview' as Tab,      icon: '📊', labelKey: 'profile.tab.overview' },
    { id: 'achievements' as Tab,  icon: '🏅', labelKey: 'profile.tab.achievements' },
    { id: 'rankings' as Tab,      icon: '🏆', labelKey: 'profile.tab.rankings' },
    { id: 'history' as Tab,       icon: '📋', labelKey: 'profile.tab.history' },
  ];

  // Overview
  isLoading = signal(true);
  gamesWithStats = signal<any[]>([]);

  // Achievements
  achievementsLoading = signal(false);
  achievements = signal<AchievementWithStatus[]>([]);

  unlockedCount = computed(() => this.achievements().filter(a => !!a.unlocked_at).length);
  achievementCategories = computed(() => [...new Set(this.achievements().map(a => a.category))]);

  achievementsByCategory(cat: string): AchievementWithStatus[] {
    return this.achievements().filter(a => a.category === cat);
  }

  // Rankings
  ranksLoading = signal(false);
  myRanks = signal<RankEntry[]>([]);

  // History
  historyLoading = signal(false);
  matchHistory = signal<any[]>([]);

  xpProgress = computed(() => {
    const u = this.authStore.currentUser();
    return u ? this.xpService.levelProgress(u.xp) : { level: 1, xp: 0, current: 0, total: 100, pct: 0 };
  });

  ngOnInit() {
    if (!this.authStore.isAuthenticated()) {
      this.isLoading.set(false);
      return;
    }
    this.loadStats();
    this.loadAchievements();
    this.loadRanks();
    this.loadHistory();
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.gameService.getAllGames().subscribe(allGames => {
      this.statsService.getAllStats().subscribe(stats => {
        const grouped = stats.reduce((acc, stat) => {
          if (!acc[stat.GameID]) acc[stat.GameID] = [];
          acc[stat.GameID].push(stat);
          return acc;
        }, {} as Record<string, UserGameStat[]>);

        const games = allGames.filter(g => grouped[g.id]).map(g => ({
          ...g,
          stats: grouped[g.id].sort((a, b) => {
            if (a.Mode !== b.Mode) return a.Mode.localeCompare(b.Mode);
            return a.Difficulty.localeCompare(b.Difficulty);
          })
        }));
        this.gamesWithStats.set(games);
        this.isLoading.set(false);
      });
    });
  }

  private loadAchievements(): void {
    this.achievementsLoading.set(true);
    this.achievementService.getAchievements().subscribe({
      next: a => { this.achievements.set(a); this.achievementsLoading.set(false); },
      error: () => this.achievementsLoading.set(false),
    });
  }

  private loadRanks(): void {
    this.ranksLoading.set(true);
    this.leaderboardService.getMyRanks().subscribe({
      next: r => { this.myRanks.set(r); this.ranksLoading.set(false); },
      error: () => this.ranksLoading.set(false),
    });
  }

  private loadHistory(): void {
    this.historyLoading.set(true);
    this.statsService.getMatchHistory().subscribe({
      next: h => { this.matchHistory.set(h); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false),
    });
  }

  getGameEmoji(id: string): string {
    return GAME_DEFINITIONS.find(g => g.id === id)?.iconEmoji ?? '🎮';
  }

  getGameNameById(id: string): string {
    const g = GAME_DEFINITIONS.find(g => g.id === id);
    return g ? (this.i18n.t(g.titleKey)() || id) : id;
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }

  isTimeGame(gameId: string): boolean {
    const timeGames = ['minesweeper','sudoku','sliding','codebreaker','math24','watersort','sokoban','lightsout'];
    return timeGames.includes(gameId);
  }

  formatTime(seconds: number): string {
    if (seconds <= 0) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  formatModeAndDiff(stat: UserGameStat): string {
    let modeStr = stat.Mode === GameMode.Single ? (this.i18n.t('game.single_mode')() || 'Single') : stat.Mode;
    const zhMap: Record<string, string> = {
      'easy': '简单', 'medium': '中等', 'hard': '困难', 'expert': '专家',
      'beginner': '初级', 'intermediate': '中级',
    };
    let diffStr = this.i18n.currentLang() === 'zh' ? (zhMap[stat.Difficulty] || stat.Difficulty) : stat.Difficulty;
    if (!diffStr) return modeStr;
    return `${modeStr} · ${diffStr}`;
  }

  rankColor(rank: number): string {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-[var(--color-text-muted)]';
  }

  rankMedal(rank: number): string {
    return ['🥇','🥈','🥉'][rank - 1] ?? String(rank);
  }

  async shareProfile() {
    const user = this.authStore.currentUser();
    if (!user) return;
    const topStats = this.gamesWithStats().slice(0, 3).map(g => ({
      gameEmoji: this.getGameEmoji(g.id),
      gameName: this.getLocalized(g.name),
      value: g.stats[0] ? (this.isTimeGame(g.id) ? this.formatTime(g.stats[0].BestTime) : String(g.stats[0].BestScore)) : '--'
    }));
    const totalGames = this.gamesWithStats().reduce((s, g) => s + g.stats.reduce((a: number, st: UserGameStat) => a + st.PlayCount, 0), 0);
    const blob = await this.shareImageService.generateProfileCard({
      username: user.username,
      level: user.level ?? 1,
      totalGames,
      topStats,
      siteDomain: getOrigin().replace('https://', '').replace('http://', ''),
    } as ProfileCardData);
    const url = `${getOrigin()}/profile`;
    const text = this.i18n.t('share.profile_text')();
    if (blob && isBrowser()) {
      const file = new File([blob], 'profile-card.png', { type: 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        try { await navigator.share({ title: 'Puzzle PK Profile', text, url, files: [file] } as any); return; } catch {}
      }
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = 'profile-card.png'; a.click();
      URL.revokeObjectURL(objUrl);
    } else {
      this.shareService.share({ title: 'Puzzle PK Profile', text, url });
    }
  }
}
