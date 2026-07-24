import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { LeaderboardService, LeaderboardEntry, LeaderboardResponse } from '../../core/services/leaderboard.service';
import { FriendService } from '../../core/services/friend.service';
import { AuthStore } from '../../core/auth/auth.store';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';
import { GameMode } from '../../core/models/game.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] p-4 md:p-8">
      <div class="max-w-5xl mx-auto flex flex-col gap-6">

        <!-- Header -->
        <div class="flex items-center gap-3 border-b border-[var(--color-border-card)] pb-5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-2xl shadow-lg">
            🏆
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]">
              {{ i18n.t('leaderboard.title')() }}
            </h1>
            <p class="text-sm text-[var(--color-text-muted)]">{{ selectedGameId() === 'global' ? i18n.t('leaderboard.global_desc')() : (selectedGame()?.titleKey ? i18n.t(selectedGame()!.titleKey)() : '') }}</p>
          </div>
        </div>

        <!-- Filter Row -->
        <div class="flex flex-wrap gap-3">
          <!-- Game selector -->
          <div class="flex-1 min-w-[160px]">
            <select class="w-full px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                    (change)="onGameChange($event)">
                <option value="global" [selected]="selectedGameId() === 'global'">
                  🌍 {{ i18n.t('leaderboard.global')() }}
                </option>
              @for (g of games; track g.id) {
                <option [value]="g.id" [selected]="g.id === selectedGameId()">
                  {{ g.iconEmoji }} {{ i18n.t(g.titleKey)() || g.id }}
                </option>
              }
            </select>
          </div>

          <!-- Mode selector -->
          @if (selectedGameId() !== 'global') {
            <select class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                    (change)="onModeChange($event)">
            @for (m of availableModes(); track m) {
              <option [value]="m" [selected]="m === selectedMode()">{{ m }}</option>
            }
          </select>

          <!-- Difficulty selector -->
          <select class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm"
                  (change)="onDifficultyChange($event)">
            @for (d of availableDiffs(); track d) {
              <option [value]="d" [selected]="d === selectedDiff()">{{ d }}</option>
            }
          </select>

          <!-- Period toggle -->
          <div class="flex rounded-xl border border-[var(--color-border-card)] overflow-hidden">
            <button (click)="selectedPeriod.set('all')"
                    class="px-4 py-2 text-sm font-bold transition-all"
                    [class]="selectedPeriod() === 'all'
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.all_time')() }}
            </button>
            <button (click)="selectedPeriod.set('weekly')"
                    class="px-4 py-2 text-sm font-bold transition-all"
                    [class]="selectedPeriod() === 'weekly'
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.weekly')() }}
            </button>
          </div>
          }
        </div>

        <!-- My rank -->
        @if (authStore.isAuthenticated() && data()?.my_rank) {
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-accent-from)]/30 bg-[var(--color-accent-from)]/10">
            <span class="text-2xl font-black text-[var(--color-accent-from)]">#{{ data()!.my_rank }}</span>
            <div>
              <p class="text-sm font-bold text-[var(--color-text-main)]">{{ i18n.t('leaderboard.my_rank')() }}</p>
              <p class="text-xs text-[var(--color-text-muted)]">{{ authStore.currentUser()?.username }}</p>
            </div>
          </div>
        }

        <!-- Table -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden shadow-xl">
          @if (isLoading()) {
            <div class="flex items-center justify-center h-48">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
            </div>
          } @else if (!data()?.entries?.length) {
            <div class="flex flex-col items-center justify-center h-48 text-[var(--color-text-muted)]">
              <span class="text-4xl mb-3">🏆</span>
              <p class="font-bold">{{ i18n.t('leaderboard.no_data')() }}</p>
            </div>
          } @else {
            <!-- Header row -->
            <div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-card)]">
              <div class="col-span-1 text-center">#</div>
              <div class="col-span-5">{{ i18n.t('leaderboard.player')() }}</div>
              @if (selectedGameId() === 'global') {
                <div class="col-span-3 text-right">{{ i18n.t('leaderboard.level')() }}</div>
                <div class="col-span-3 text-right">{{ i18n.t('leaderboard.xp')() }}</div>
              } @else {
                <div class="col-span-3 text-right">
                  {{ isPKMode() ? i18n.t('leaderboard.rating')() : (isTimeType() ? i18n.t('leaderboard.best_time')() : i18n.t('leaderboard.best_score')()) }}
                </div>
                <div class="col-span-3 text-right">
                  {{ isPKMode() ? i18n.t('leaderboard.win_rate')() : i18n.t('leaderboard.plays')() }}
                </div>
              }
            </div>

            @for (entry of data()!.entries; track entry.user_id) {
              <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--color-border-card)]/50 last:border-0 transition-colors hover:bg-[var(--color-bg-main)]/50"
                   [class.bg-[var(--color-accent-from)]/5]="entry.is_current_user">
                <!-- Rank -->
                <div class="col-span-1 text-center font-mono font-black"
                     [ngClass]="rankColor(entry.rank)">
                  @if (entry.rank <= 3) {
                    <span>{{ rankMedal(entry.rank) }}</span>
                  } @else {
                    {{ entry.rank }}
                  }
                </div>
                <!-- Player -->
                <div class="col-span-5 flex items-center gap-2 min-w-0">
                  <span class="font-bold text-sm truncate" [class.text-[var(--color-accent-from)]]="entry.is_current_user">
                    {{ entry.username }}
                    @if (entry.is_current_user) {
                      <span class="text-xs ml-1 opacity-60">({{ i18n.t('leaderboard.you')() }})</span>
                    }
                  </span>
                  @if (!entry.is_current_user && authStore.isAuthenticated()) {
                    <button (click)="addFriend(entry.user_id)" class="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-500/10 rounded-full transition-all" [title]="i18n.t('game.add_friend')() || 'Add Friend'">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </button>
                  }
                </div>
                <!-- Score/Time / Level/XP -->
                @if (selectedGameId() === 'global') {
                  <div class="col-span-3 text-right font-mono font-bold text-[var(--color-accent-from)]">
                    Lv.{{ entry.level }}
                  </div>
                  <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                    {{ entry.xp | number }} XP
                  </div>
                } @else {
                  <div class="col-span-3 text-right font-mono font-bold text-[var(--color-accent-to)]">
                    @if (isPKMode()) {
                      {{ entry.rating | number }}
                    } @else if (isTimeType()) {
                      {{ formatTime(entry.best_time) }}
                    } @else {
                      {{ entry.best_score | number }}
                    }
                  </div>
                  <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                    @if (isPKMode()) {
                      {{ getWinRate(entry) }}% ({{ entry.win_count }}/{{ entry.play_count }})
                    } @else {
                      {{ entry.play_count }}
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class LeaderboardComponent implements OnInit {
  i18n = inject(I18nService);
  private friendService = inject(FriendService);
  authStore = inject(AuthStore);
  private leaderboardService = inject(LeaderboardService);

  games = GAME_DEFINITIONS;

  selectedGameId = signal<string>('global');
  selectedMode = signal<string>('single');
  selectedDiff = signal<string>('medium');
  selectedPeriod = signal<string>('all');

  isLoading = signal(false);
  data = signal<LeaderboardResponse | null>(null);

  selectedGame = computed(() => GAME_DEFINITIONS.find(g => g.id === this.selectedGameId()));

  availableModes = computed(() => {
    const g = this.selectedGame();
    if (!g) return ['single'];
    return g.modes.map(m => m.id as string);
  });

  availableDiffs = computed(() => {
    const g = this.selectedGame();
    if (!g) return ['medium'];
    return g.difficulties.map(d => d.id as string);
  });

  isTimeType = computed(() => {
    const timeGames = ['minesweeper','sudoku','sliding','codebreaker','math24','watersort','sokoban','lightsout'];
    return timeGames.includes(this.selectedGameId()) && this.selectedMode() === GameMode.Single;
  });

  isPKMode = computed(() => {
    return this.selectedMode() !== GameMode.Single;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.leaderboardService.getLeaderboard(this.selectedGameId(), {
      mode: this.selectedMode(),
      difficulty: this.selectedDiff(),
      type: this.isPKMode() ? 'rating' : (this.isTimeType() ? 'time' : 'score'),
      period: this.selectedPeriod(),
    }).subscribe({
      next: r => { this.data.set(r); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); }
    });
  }

  onGameChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this.selectedGameId.set(val);
    const g = GAME_DEFINITIONS.find(g => g.id === val);
    if (g) {
      this.selectedMode.set(g.modes[0]?.id as string ?? 'single');
      this.selectedDiff.set(g.difficulties[0]?.id as string ?? 'medium');
    }
    this.load();
  }

  onModeChange(e: Event): void {
    this.selectedMode.set((e.target as HTMLSelectElement).value);
    this.load();
  }

  onDifficultyChange(e: Event): void {
    this.selectedDiff.set((e.target as HTMLSelectElement).value);
    this.load();
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

  formatTime(s: number): string {
    if (s <= 0) return '--:--';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  getWinRate(entry: LeaderboardEntry): string {
    if (entry.play_count === 0) return '0.0';
    return ((entry.win_count / entry.play_count) * 100).toFixed(1);
  }

  addFriend(userId: number) {
    this.friendService.sendRequest(userId).subscribe(() => {
      alert(this.i18n.t('game.friend_request_sent')() || 'Friend request sent!');
    });
  }
}
