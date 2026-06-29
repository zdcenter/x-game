import { GameDifficulty, GameMode, GameStatus } from '../../core/models/game.model';
import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Subscription } from 'rxjs';

import { GameConfig, getLocalizedField } from '../../core/services/game.service';

interface OnlinePlayer {
  id: string;
  username: string;
  ip: string;
  connectedAt: number;
  status: string;
}

interface ActiveRoom {
  id: string;
  game: string;
  host: string;
  players: number;
  mode: string;
  status: string;
  createdAt: number;
}

@Component({
  selector: 'app-admin-realtime',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="w-full max-w-6xl mx-auto flex flex-col transition-colors duration-300 space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            {{ i18n.t('admin.realtime.title')() }}
          </h2>
          <p class="opacity-70 text-sm mt-1">{{ i18n.t('admin.realtime.subtitle')() }}</p>
        </div>
        <div class="flex gap-4">
          <div class="bg-[var(--color-bg-card)] px-4 py-2 rounded-xl border border-[var(--color-border-card)] shadow-inner flex flex-col items-center">
            <span class="text-xs opacity-70 font-bold uppercase">{{ i18n.t('admin.realtime.players')() }}</span>
            <span class="text-xl font-mono font-bold text-emerald-400">{{ players().length }}</span>
          </div>
          <div class="bg-[var(--color-bg-card)] px-4 py-2 rounded-xl border border-[var(--color-border-card)] shadow-inner flex flex-col items-center">
            <span class="text-xs opacity-70 font-bold uppercase">{{ i18n.t('admin.realtime.rooms')() }}</span>
            <span class="text-xl font-mono font-bold text-blue-400">{{ rooms().length }}</span>
          </div>
        </div>
      </div>

      <!-- Online Players Section -->
      <div>
        <h3 class="text-lg font-bold mb-4 opacity-90">{{ i18n.t('admin.realtime.players')() }}</h3>
        <div class="overflow-x-auto rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-inner">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--color-bg-main)] opacity-90 text-sm uppercase tracking-wider border-b border-[var(--color-border-card)]">
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.realtime.col.username')() }}</th>
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.realtime.col.ip')() }}</th>
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.realtime.col.status')() }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ i18n.t('admin.realtime.col.connectedAt')() }}</th>
              </tr>
            </thead>
            <tbody>
              @if (players().length === 0) {
                <tr>
                  <td colspan="4" class="px-6 py-8 text-center opacity-50">{{ i18n.t('admin.realtime.players.empty')() }}</td>
                </tr>
              } @else {
                @for (p of players(); track p.id) {
                  <tr class="border-b border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors">
                    <td class="px-6 py-4 font-bold">{{ p.username }}</td>
                    <td class="px-6 py-4 font-mono text-sm opacity-80">{{ p.ip }}</td>
                    <td class="px-6 py-4">
                      <span class="px-2 py-1 rounded text-xs font-bold uppercase"
                            [ngClass]="{'bg-blue-500/20 text-blue-400 border border-blue-500/30': p.status === GameStatus.Playing, 'bg-[var(--color-bg-card)] opacity-70': p.status !== GameStatus.Playing}">
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right text-sm opacity-70 font-mono">{{ p.connectedAt * 1000 | date:'MM-dd HH:mm:ss' }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Active Rooms Section -->
      <div>
        <h3 class="text-lg font-bold mb-4 opacity-90">{{ i18n.t('admin.realtime.rooms')() }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @if (rooms().length === 0) {
            <div class="col-span-full py-8 text-center opacity-50 border border-dashed border-[var(--color-border-card)] rounded-xl">
              {{ i18n.t('admin.realtime.rooms.empty')() }}
            </div>
          } @else {
            @for (r of rooms(); track r.id) {
              <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                  <div class="font-bold text-lg capitalize text-[var(--color-accent-from)]">{{ r.game }}</div>
                  <span class="px-2 py-1 text-xs font-bold rounded-full border"
                        [ngClass]="{'bg-emerald-500/10 text-emerald-500 border-emerald-500/30': r.status === GameStatus.Playing, 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30': r.status === GameStatus.Waiting}">
                    {{ r.status }}
                  </span>
                </div>
                <div class="space-y-1 text-sm opacity-80 mb-4 font-mono">
                  <div><span class="opacity-50 inline-block w-16">ID:</span> {{ r.id }}</div>
                  <div><span class="opacity-50 inline-block w-16">Host:</span> {{ r.host }}</div>
                  <div><span class="opacity-50 inline-block w-16">Mode:</span> <span class="uppercase text-xs font-bold">{{ r.mode }}</span></div>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-[var(--color-border-card)]">
                  <div class="text-xs opacity-50">{{ r.createdAt * 1000 | date:'HH:mm:ss' }}</div>
                  <div class="flex items-center gap-1 font-bold">
                    <span>👥</span> {{ r.players }}
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Game Popularity & Analytics Section -->
      <div>
        <h3 class="text-lg font-bold mb-4 opacity-90">{{ i18n.t('admin.realtime.popularity')() }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          @for (g of games(); track g.id) {
            <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <span class="text-sm font-bold uppercase mb-2 text-[var(--color-accent-from)]">{{ g.id }}</span>
              <div class="text-3xl font-mono font-bold">{{ g.visitCount || 0 }}</div>
              <span class="text-xs opacity-50 mt-1 uppercase tracking-widest">{{ i18n.t('admin.realtime.col.visits')() }}</span>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class AdminRealtimeComponent implements OnInit, OnDestroy {
  GameStatus = GameStatus;
  adminService = inject(AdminService);
  i18n = inject(I18nService);
  
  players = signal<OnlinePlayer[]>([]);
  rooms = signal<ActiveRoom[]>([]);
  games = signal<GameConfig[]>([]);
  private wsSub?: Subscription;

  ngOnInit() {
    this.fetchGames();
    this.wsSub = this.adminService.connectRealtimeWS().subscribe({
      next: (data) => {
        if (data && data.type === 'admin_realtime_update') {
          // Update signals immediately without forcing digest manually, Angular handles it
          this.players.set(data.players || []);
          this.rooms.set(data.rooms || []);
        }
      },
      error: (err) => console.error('Admin WS Error:', err)
    });
  }

  fetchGames() {
    this.adminService.getGames().subscribe({
      next: (games) => {
        // Sort by visit count descending
        this.games.set(games.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)));
      },
      error: (err) => console.error('Failed to load games popularity:', err)
    });
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }

  ngOnDestroy() {
    if (this.wsSub) {
      this.wsSub.unsubscribe(); // This completes the subject but we might want to actually close the WS. 
      // The current connectRealtimeWS implementation doesn't return the raw WS object to close it cleanly on unsubscribe, 
      // but the browser garbage collects or the connection drops when destroyed if managed well.
    }
  }
}
