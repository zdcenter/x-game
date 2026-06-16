import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { environment } from '../../../environments/environment';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';

@Component({
  selector: 'app-admin-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-black text-[var(--color-text-main)]">🏆 {{ i18n.t('admin.leaderboard.title')() }}</h1>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <select [(ngModel)]="selectedGame" (ngModelChange)="load()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm">
          @for (g of games; track g.id) {
            <option [value]="g.id">{{ g.iconEmoji }} {{ g.id }}</option>
          }
        </select>
        <select [(ngModel)]="selectedMode" (ngModelChange)="load()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm">
          <option value="single">Single</option>
          <option value="speed">Speed PK</option>
          <option value="battle">Battle</option>
        </select>
        <select [(ngModel)]="selectedDiff" (ngModelChange)="load()" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-sm">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
        <div class="flex rounded-xl border border-[var(--color-border-card)] overflow-hidden">
          <button (click)="selectedPeriod = 'all'; load()"
                  class="px-4 py-2 text-sm font-bold transition-all"
                  [class]="selectedPeriod === 'all' ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'">
            All Time
          </button>
          <button (click)="selectedPeriod = 'weekly'; load()"
                  class="px-4 py-2 text-sm font-bold transition-all"
                  [class]="selectedPeriod === 'weekly' ? 'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'">
            Weekly
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        @if (isLoading()) {
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        } @else if (!entries().length) {
          <div class="text-center py-12 text-[var(--color-text-muted)]">
            <p class="text-3xl mb-2">🏆</p>
            <p class="font-bold">No entries found</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--color-border-card)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th class="text-left px-4 py-3">#</th>
                  <th class="text-left px-4 py-3">Player</th>
                  <th class="text-right px-4 py-3">Best Time</th>
                  <th class="text-right px-4 py-3">Best Score</th>
                  <th class="text-right px-4 py-3">Plays</th>
                  <th class="text-right px-4 py-3">Wins</th>
                  <th class="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (e of entries(); track e.stat_id) {
                  <tr class="border-b border-[var(--color-border-card)]/50 last:border-0 hover:bg-[var(--color-bg-main)]/40 transition-colors">
                    <td class="px-4 py-3 font-black" [class]="rankColor(e.rank)">
                      {{ e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank - 1] : '#' + e.rank }}
                    </td>
                    <td class="px-4 py-3 font-bold">{{ e.username }}</td>
                    <td class="px-4 py-3 text-right font-mono text-[var(--color-accent-to)]">{{ e.best_time > 0 ? formatTime(e.best_time) : '—' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-amber-400">{{ e.best_score || '—' }}</td>
                    <td class="px-4 py-3 text-right text-[var(--color-text-muted)]">{{ e.play_count }}</td>
                    <td class="px-4 py-3 text-right text-[var(--color-text-muted)]">{{ e.win_count }}</td>
                    <td class="px-4 py-3">
                      <button (click)="confirmDelete(e.stat_id)" class="text-xs px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                        Remove
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminLeaderboardComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  games = GAME_DEFINITIONS;

  isLoading = signal(false);
  entries = signal<any[]>([]);

  selectedGame = GAME_DEFINITIONS[0]?.id ?? 'minesweeper';
  selectedMode = 'single';
  selectedDiff = 'medium';
  selectedPeriod = 'all';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    const params = `mode=${this.selectedMode}&difficulty=${this.selectedDiff}&period=${this.selectedPeriod}&limit=100`;
    this.http.get<any>(`${this.apiUrl}/admin/leaderboard/${this.selectedGame}?${params}`).subscribe({
      next: r => { this.entries.set(r.entries ?? []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  confirmDelete(statId: number): void {
    if (!confirm('Remove this entry from leaderboard?')) return;
    this.http.delete(`${this.apiUrl}/admin/leaderboard/stat/${statId}`).subscribe(() => this.load());
  }

  rankColor(rank: number): string {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-[var(--color-text-muted)]';
  }

  formatTime(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
}
