import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { LeaderboardService, LeaderboardEntry, LeaderboardResponse } from '../../core/services/leaderboard.service';
import { FriendService } from '../../core/services/friend.service';
import { AuthStore } from '../../core/auth/auth.store';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';

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
        <div class="flex flex-wrap items-center gap-3">
          <!-- Game selector -->
          <div class="flex-1 min-w-[200px]">
            <select class="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-from)]/50"
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

          <!-- Period toggle -->
          <div class="flex rounded-xl border border-[var(--color-border-card)] overflow-hidden shadow-sm">
            <button (click)="setPeriod('all')"
                    class="px-4 py-2.5 text-sm font-bold transition-all"
                    [class]="selectedPeriod() === 'all'
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.all_time')() }}
            </button>
            <button (click)="setPeriod('weekly')"
                    class="px-4 py-2.5 text-sm font-bold transition-all"
                    [class]="selectedPeriod() === 'weekly'
                      ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
              {{ i18n.t('leaderboard.weekly')() }}
            </button>
          </div>
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
                  {{ isTimeType() ? i18n.t('leaderboard.best_time')() : i18n.t('leaderboard.best_score')() }}
                </div>
                <div class="col-span-3 text-right">
                  {{ i18n.t('leaderboard.plays')() }}
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
                    @if (isTimeType()) {
                      {{ formatTime(entry.best_time) }}
                    } @else {
                      {{ (entry.best_score || entry.rating || 0) | number }}
                    }
                  </div>
                  <div class="col-span-3 text-right text-sm text-[var(--color-text-muted)]">
                    @if (entry.win_count > 0 && entry.play_count > 0) {
                      <span>{{ entry.play_count }} <span class="text-xs opacity-75">({{ getWinRate(entry) }}%)</span></span>
                    } @else {
                      <span>{{ entry.play_count }}</span>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>

        <!-- Pagination Controls -->
        @if (data() && (data()!.total || 0) > 0) {
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-md">
            <!-- Total count badge -->
            <div class="text-xs sm:text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full bg-[var(--color-accent-from)]"></span>
              <span>{{ i18n.t('leaderboard.total_players', { total: data()?.total || 0 })() }}</span>
            </div>

            <!-- Page actions -->
            <div class="flex items-center gap-3">
              <button
                (click)="prevPage()"
                [disabled]="currentPage() <= 1 || isLoading()"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-all hover:bg-[var(--color-accent-from)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                ← {{ i18n.t('leaderboard.prev')() }}
              </button>

              <span class="text-xs font-mono font-bold text-[var(--color-text-main)] px-2">
                {{ i18n.t('leaderboard.page', { page: currentPage(), total: data()?.total_pages || 1 })() }}
              </span>

              <button
                (click)="nextPage()"
                [disabled]="currentPage() >= (data()?.total_pages || 1) || isLoading()"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-all hover:bg-[var(--color-accent-from)]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                {{ i18n.t('leaderboard.next')() }} →
              </button>
            </div>
          </div>
        }
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
  selectedPeriod = signal<string>('all');
  currentPage = signal<number>(1);

  isLoading = signal(false);
  data = signal<LeaderboardResponse | null>(null);

  selectedGame = computed(() => GAME_DEFINITIONS.find(g => g.id === this.selectedGameId()));

  isTimeType = computed(() => {
    const timeGames = ['minesweeper', 'sudoku', 'sliding', 'codebreaker', 'math24', 'watersort', 'sokoban', 'lightsout'];
    return timeGames.includes(this.selectedGameId());
  });

  ngOnInit(): void {
    this.load();
  }

  setPeriod(p: string): void {
    if (this.selectedPeriod() !== p) {
      this.selectedPeriod.set(p);
      this.currentPage.set(1);
      this.load();
    }
  }

  private load(): void {
    this.isLoading.set(true);
    this.leaderboardService.getLeaderboard(this.selectedGameId(), {
      period: this.selectedPeriod(),
      page: this.currentPage(),
      limit: 20,
    }).subscribe({
      next: r => { this.data.set(r); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); }
    });
  }

  onGameChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this.selectedGameId.set(val);
    this.currentPage.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    const totalPages = this.data()?.total_pages ?? 1;
    if (this.currentPage() < totalPages) {
      this.currentPage.update(p => p + 1);
      this.load();
    }
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
