import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameConfig, getLocalizedField } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';

interface AdminGame extends GameConfig {
  parsedOverview: { en: string; zh: string };
  parsedRules: { en: string; zh: string };
  parsedConfig: { penaltySeconds: number };
  rawConfigText: string;
  activeRuleTab: 'en' | 'zh';
  activeOverviewTab: 'en' | 'zh';
}

@Component({
  selector: 'app-admin-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-6xl mx-auto flex flex-col transition-colors duration-300">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold">{{ i18n.t('admin.games.title')() }}</h2>
          <p class="opacity-70 text-sm mt-1">{{ i18n.t('admin.games.subtitle')() }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (game of games(); track game.id) {
          <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-6 shadow-inner flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">{{ getLocalized(game.name) }}</h3>
                <div class="flex items-center space-x-3">
                  <div class="flex items-center space-x-1">
                    <label class="text-xs font-bold opacity-70">Sort:</label>
                    <input type="number" min="1" [(ngModel)]="game.sortOrder" 
                           class="w-14 bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-center font-mono focus:outline-none focus:border-[var(--color-accent-to)] focus:ring-1 focus:ring-[var(--color-accent-to)] transition-all">
                  </div>
                  <span class="text-xs font-bold uppercase tracking-wider" [class.text-emerald-400]="game.isActive" [class.text-red-400]="!game.isActive">
                    {{ game.isActive ? i18n.t('admin.games.status.active')() : i18n.t('admin.games.status.offline')() }}
                  </span>
                  <button (click)="toggleGameStatus(game)"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                          [class.bg-[var(--color-accent-to)]]="game.isActive" [class.bg-[var(--color-bg-main)]]="!game.isActive"
                          [class.border]="!game.isActive" [class.border-[var(--color-border-card)]]="!game.isActive">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                          [class.translate-x-6]="game.isActive" [class.translate-x-1]="!game.isActive"></span>
                  </button>
                </div>
            </div>
            <div class="flex-grow flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold opacity-70 uppercase tracking-wider">{{ i18n.t('admin.games.rules.label')() }}</label>
                <div class="flex space-x-2">
                  <button (click)="game.activeRuleTab = 'en'" [class.text-[var(--color-accent-to)]]="game.activeRuleTab === 'en'" [class.opacity-50]="game.activeRuleTab !== 'en'" class="text-xs font-bold transition-colors">EN</button>
                  <button (click)="game.activeRuleTab = 'zh'" [class.text-[var(--color-accent-to)]]="game.activeRuleTab === 'zh'" [class.opacity-50]="game.activeRuleTab !== 'zh'" class="text-xs font-bold transition-colors">ZH</button>
                </div>
              </div>
              @if (game.activeRuleTab === 'en') {
                <textarea [(ngModel)]="game.parsedRules.en" rows="3" placeholder="English Rules (Markdown)"
                          class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors resize-y font-mono mb-4"></textarea>
              } @else {
                <textarea [(ngModel)]="game.parsedRules.zh" rows="3" placeholder="Chinese Rules (Markdown)"
                          class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors resize-y font-mono mb-4"></textarea>
              }

              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold opacity-70 uppercase tracking-wider">Overview</label>
                <div class="flex space-x-2">
                  <button (click)="game.activeOverviewTab = 'en'" [class.text-[var(--color-accent-to)]]="game.activeOverviewTab === 'en'" [class.opacity-50]="game.activeOverviewTab !== 'en'" class="text-xs font-bold transition-colors">EN</button>
                  <button (click)="game.activeOverviewTab = 'zh'" [class.text-[var(--color-accent-to)]]="game.activeOverviewTab === 'zh'" [class.opacity-50]="game.activeOverviewTab !== 'zh'" class="text-xs font-bold transition-colors">ZH</button>
                </div>
              </div>
              @if (game.activeOverviewTab === 'en') {
                <textarea [(ngModel)]="game.parsedOverview.en" rows="2" placeholder="English Overview"
                          class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors resize-y"></textarea>
              } @else {
                <textarea [(ngModel)]="game.parsedOverview.zh" rows="2" placeholder="Chinese Overview"
                          class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors resize-y"></textarea>
              }
            </div>
            <div class="mt-4 flex justify-between items-center">
              <button (click)="openSettings(game)"
                      class="px-4 py-2 rounded-xl font-bold text-sm bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:text-[var(--color-accent-to)] transition-colors">
                ⚙️ Settings
              </button>
              <button (click)="saveGameRules(game)" [disabled]="isUpdating()"
                      class="px-6 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] hover:shadow-lg transition-all disabled:opacity-50">
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

      <!-- Settings Modal -->
      @if (selectedGameForSettings()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity">
          <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-6 shadow-2xl w-full max-w-md m-4 transform transition-all flex flex-col">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-bold">{{ getLocalized(selectedGameForSettings()!.name) }} Settings</h3>
              <button (click)="closeSettings()" class="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <div class="flex-grow flex flex-col gap-4">
              @if (selectedGameForSettings()!.id === 'minesweeper' || selectedGameForSettings()!.id === 'sudoku') {
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-bold opacity-80 uppercase tracking-wider">Penalty Duration (Seconds)</label>
                  <p class="text-xs text-slate-400 mb-2">The duration players are frozen when they make a mistake in PK mode.</p>
                  <input type="number" [(ngModel)]="selectedGameForSettings()!.parsedConfig.penaltySeconds" 
                         class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors">
                </div>
              } @else {
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-bold opacity-80 uppercase tracking-wider">Advanced Config (JSON)</label>
                  <textarea [(ngModel)]="selectedGameForSettings()!.rawConfigText" rows="6" placeholder="{}"
                            class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl p-3 text-sm text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors resize-y font-mono"></textarea>
                </div>
              }
            </div>

            <div class="mt-8 flex justify-end gap-3">
              <button (click)="closeSettings()"
                      class="px-5 py-2 rounded-xl font-bold text-sm bg-[var(--color-bg-main)] border border-[var(--color-border-card)] hover:text-slate-300 transition-colors">
                Cancel
              </button>
              <button (click)="saveGameSettings(selectedGameForSettings()!)" [disabled]="isUpdating()"
                      class="px-6 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] hover:shadow-lg transition-all disabled:opacity-50">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminGamesComponent implements OnInit {
  private adminService = inject(AdminService);
  i18n = inject(I18nService);
  private toastService = inject(ToastService);
  
  games = signal<AdminGame[]>([]);
  isUpdating = signal(false);
  selectedGameForSettings = signal<AdminGame | null>(null);

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

          let parsedOverview = { en: g.overview || '', zh: '' };
          try {
            const p = JSON.parse(g.overview);
            if (p && typeof p === 'object') {
              parsedOverview = { en: p.en || g.overview || '', zh: p.zh || '' };
            }
          } catch(e) {}
          
          let parsedConfig = { penaltySeconds: 3 };
          let rawConfigText = '{}';
          try {
            if (g.config) {
              rawConfigText = g.config;
              const c = JSON.parse(g.config);
              if (c && typeof c === 'object') {
                parsedConfig = { penaltySeconds: c.penaltySeconds || 3 };
              }
            }
          } catch(e) {}

          return { ...g, parsedRules, parsedOverview, parsedConfig, rawConfigText, activeRuleTab: 'en' as const, activeOverviewTab: 'en' as const };
        }));
      },
      error: (err) => {
        this.toastService.show('Failed to load games: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  toggleGameStatus(game: AdminGame) {
    this.isUpdating.set(true);
    const newStatus = !game.isActive;
    const sortVal = game.sortOrder !== undefined && game.sortOrder !== null ? Number(game.sortOrder) : 0;
    this.adminService.updateGame(game.id, game.overview, game.rules, game.config, newStatus, sortVal).subscribe({
      next: (res) => {
        const updated = this.games().map(g => g.id === game.id ? { ...g, isActive: newStatus, rules: game.rules } : g);
        this.games.set(updated);
        this.isUpdating.set(false);
        this.toastService.show(`Game ${newStatus ? 'activated' : 'deactivated'}`, 'success');
      },
      error: (err) => {
        this.toastService.show('Update failed: ' + (err.error?.error || err.message), 'error');
        this.isUpdating.set(false);
      }
    });
  }

  saveGameRules(game: AdminGame) {
    this.isUpdating.set(true);
    const rulesJson = JSON.stringify(game.parsedRules);
    const overviewJson = JSON.stringify(game.parsedOverview);
    const sortVal = game.sortOrder !== undefined && game.sortOrder !== null ? Number(game.sortOrder) : 0;
    this.adminService.updateGame(game.id, overviewJson, rulesJson, game.config, game.isActive, sortVal).subscribe({
      next: (res) => {
        this.toastService.show('Rules saved successfully!', 'success');
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.toastService.show('Update failed: ' + (err.error?.error || err.message), 'error');
        this.isUpdating.set(false);
      }
    });
  }

  openSettings(game: AdminGame) {
    this.selectedGameForSettings.set(game);
  }

  closeSettings() {
    this.selectedGameForSettings.set(null);
  }

  saveGameSettings(game: AdminGame) {
    this.isUpdating.set(true);
    let configJson = game.rawConfigText;
    if (game.id === 'minesweeper' || game.id === 'sudoku') {
      configJson = JSON.stringify(game.parsedConfig);
    }
    
    // Update local config reference so next saveGameRules doesn't overwrite it with old one
    game.config = configJson;
    const sortVal = game.sortOrder !== undefined && game.sortOrder !== null ? Number(game.sortOrder) : 0;
    
    this.adminService.updateGame(game.id, game.overview, game.rules, configJson, game.isActive, sortVal).subscribe({
      next: (res) => {
        this.toastService.show('Settings saved successfully!', 'success');
        this.isUpdating.set(false);
        this.closeSettings();
      },
      error: (err) => {
        this.toastService.show('Update failed: ' + (err.error?.error || err.message), 'error');
        this.isUpdating.set(false);
      }
    });
  }

  getLocalized(field: string): string {
    return getLocalizedField(field, this.i18n.currentLang());
  }
}
