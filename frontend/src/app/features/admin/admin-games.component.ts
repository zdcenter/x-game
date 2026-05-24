import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameConfig, getLocalizedField } from '../../core/services/game.service';

interface AdminGame extends GameConfig {
  parsedRules: { en: string; zh: string };
  activeRuleTab: 'en' | 'zh';
}

@Component({
  selector: 'app-admin-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-6xl mx-auto flex flex-col transition-colors duration-300">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">{{ i18n.t('admin.games.title')() }}</h2>
          <p class="text-slate-400 text-sm mt-1">{{ i18n.t('admin.games.subtitle')() }}</p>
        </div>
      </div>

      @if (errorMsg()) {
        <div class="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between">
          <span>{{ errorMsg() }}</span>
          <button (click)="errorMsg.set('')" class="hover:text-white">✕</button>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (game of games(); track game.id) {
          <div class="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 shadow-inner flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-white">{{ getLocalized(game.name) }}</h3>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold uppercase tracking-wider" [class.text-emerald-400]="game.isActive" [class.text-red-400]="!game.isActive">
                  {{ game.isActive ? i18n.t('admin.games.status.active')() : i18n.t('admin.games.status.offline')() }}
                </span>
                <button (click)="toggleGameStatus(game)"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                        [class.bg-emerald-500]="game.isActive" [class.bg-slate-600]="!game.isActive">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        [class.translate-x-6]="game.isActive" [class.translate-x-1]="!game.isActive"></span>
                </button>
              </div>
            </div>
            <div class="flex-grow flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ i18n.t('admin.games.rules.label')() }}</label>
                <div class="flex space-x-2">
                  <button (click)="game.activeRuleTab = 'en'" [class.text-emerald-400]="game.activeRuleTab === 'en'" [class.text-slate-500]="game.activeRuleTab !== 'en'" class="text-xs font-bold transition-colors">EN</button>
                  <button (click)="game.activeRuleTab = 'zh'" [class.text-emerald-400]="game.activeRuleTab === 'zh'" [class.text-slate-500]="game.activeRuleTab !== 'zh'" class="text-xs font-bold transition-colors">ZH</button>
                </div>
              </div>
              @if (game.activeRuleTab === 'en') {
                <textarea [(ngModel)]="game.parsedRules.en" rows="6" placeholder="English Rules (Markdown)"
                          class="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors resize-y font-mono"></textarea>
              } @else {
                <textarea [(ngModel)]="game.parsedRules.zh" rows="6" placeholder="Chinese Rules (Markdown)"
                          class="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors resize-y font-mono"></textarea>
              }
            </div>
            <div class="mt-4 flex justify-end">
              <button (click)="saveGameRules(game)" [disabled]="isUpdating()"
                      class="px-6 py-2 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {{ i18n.t('admin.games.save')() }}
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-full text-center py-12 text-slate-500 border border-slate-700 border-dashed rounded-2xl">
            {{ i18n.t('admin.games.no_games')() }}
          </div>
        }
      </div>
    </div>
  `
})
export class AdminGamesComponent implements OnInit {
  adminService = inject(AdminService);
  i18n = inject(I18nService);
  
  games = signal<AdminGame[]>([]);
  isUpdating = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    this.fetchGames();
  }

  fetchGames() {
    this.adminService.getGames().subscribe({
      next: (res) => {
        this.games.set(res.map(g => {
          let parsedRules = { en: g.rules, zh: '' };
          try {
            const p = JSON.parse(g.rules);
            if (p && typeof p === 'object') {
              parsedRules = { en: p.en || g.rules, zh: p.zh || '' };
            }
          } catch(e) {}
          return { ...g, parsedRules, activeRuleTab: 'en' as const };
        }));
      },
      error: (err) => {
        this.errorMsg.set('Failed to load games: ' + (err.error?.error || err.message));
      }
    });
  }

  toggleGameStatus(game: AdminGame) {
    this.isUpdating.set(true);
    const newStatus = !game.isActive;
    this.adminService.updateGame(game.id, game.rules, newStatus).subscribe({
      next: (res) => {
        const updated = this.games().map(g => g.id === game.id ? { ...g, isActive: newStatus, rules: game.rules } : g);
        this.games.set(updated);
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Update failed: ' + (err.error?.error || err.message));
        this.isUpdating.set(false);
      }
    });
  }

  saveGameRules(game: AdminGame) {
    this.isUpdating.set(true);
    const rulesJson = JSON.stringify(game.parsedRules);
    this.adminService.updateGame(game.id, rulesJson, game.isActive).subscribe({
      next: (res) => {
        this.errorMsg.set('Saved successfully!');
        setTimeout(() => this.errorMsg.set(''), 3000);
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Update failed: ' + (err.error?.error || err.message));
        this.isUpdating.set(false);
      }
    });
  }
  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }
}
