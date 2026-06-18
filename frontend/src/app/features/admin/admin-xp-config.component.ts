import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { environment } from '../../../environments/environment';

interface XpSetting {
  key: string;
  value: string;
  label: string;
  description: string;
}

const DEFAULT_SETTINGS: XpSetting[] = [
  { key: 'xp.single_play',   value: '2',  label: 'Single Play',   description: 'XP awarded for completing any single-player game' },
  { key: 'xp.single_win',    value: '5',  label: 'Single Win',    description: 'XP awarded for winning a single-player game' },
  { key: 'xp.pk_play',       value: '5',  label: 'PK Play',       description: 'XP awarded for participating in any PK match' },
  { key: 'xp.pk_win',        value: '15', label: 'PK Win',        description: 'XP awarded for winning a PK match' },
  { key: 'xp.daily_complete',value: '30', label: 'Daily Challenge','description': 'XP awarded for completing the daily challenge' },
  { key: 'xp.streak_day1',   value: '3',  label: 'Login Streak D1','description': 'Login streak bonus — Day 1' },
  { key: 'xp.streak_day3',   value: '5',  label: 'Login Streak D3','description': 'Login streak bonus — Day 3' },
  { key: 'xp.streak_day7',   value: '10', label: 'Login Streak D7','description': 'Login streak bonus — Day 7' },
  { key: 'xp.streak_day14',  value: '20', label: 'Login Streak D14','description': 'Login streak bonus — Day 14' },
  { key: 'xp.streak_day30',  value: '50', label: 'Login Streak D30','description': 'Login streak bonus — Day 30+' },
];

@Component({
  selector: 'app-admin-xp-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-black text-[var(--color-text-main)]">✨ {{ i18n.t('admin.xp.title')() }}</h1>
        <button (click)="saveAll()" [disabled]="isSaving()"
                class="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow hover:shadow-lg transition-all disabled:opacity-50">
          {{ isSaving() ? i18n.t('admin.xp.saving')() : i18n.t('admin.xp.save_all')() }}
        </button>
      </div>

      @if (savedMsg()) {
        <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-sm">
          ✓ {{ i18n.t('admin.xp.save_success')() }}
        </div>
      }

      <!-- XP formula info -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-5">
        <h2 class="font-black text-[var(--color-text-main)] mb-3">{{ i18n.t('admin.xp.formula_label')() }}</h2>
        <div class="flex items-center gap-4 text-sm">
          <div class="flex-1 font-mono bg-[var(--color-bg-main)] rounded-xl px-4 py-3 border border-[var(--color-border-card)]">
            level = floor(sqrt(xp / 100)) + 1
          </div>
          <div class="text-[var(--color-text-muted)]">
            <p>Lv.1: 0 XP</p>
            <p>Lv.5: 1600 XP</p>
            <p>Lv.10: 8100 XP</p>
            <p>Lv.20: 36100 XP</p>
          </div>
        </div>
      </div>

      <!-- Settings grid -->
      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (s of settings(); track s.key) {
            <div class="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] p-4 flex items-center gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-[var(--color-text-main)]">{{ s.label }}</p>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">{{ s.description }}</p>
                <p class="text-[10px] font-mono text-[var(--color-text-muted)] mt-1">{{ s.key }}</p>
              </div>
              <div class="flex items-center gap-2">
                <input [(ngModel)]="s.value" type="number" min="0" max="9999"
                       class="w-20 px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-right font-mono font-bold text-[var(--color-accent-to)] text-sm" />
                <span class="text-xs font-bold text-[var(--color-text-muted)]">XP</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminXpConfigComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  isLoading = signal(true);
  isSaving = signal(false);
  savedMsg = signal(false);
  settings = signal<XpSetting[]>([]);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/admin/settings`).subscribe({
      next: r => {
        const serverMap = new Map<string, string>(
          (r.settings ?? []).map((s: any) => [s.key, s.value])
        );
        this.settings.set(DEFAULT_SETTINGS.map(d => ({
          ...d,
          value: serverMap.get(d.key) ?? d.value,
        })));
        this.isLoading.set(false);
      },
      error: () => {
        this.settings.set([...DEFAULT_SETTINGS]);
        this.isLoading.set(false);
      },
    });
  }

  saveAll(): void {
    this.isSaving.set(true);
    const payload = { settings: this.settings().map(s => ({ key: s.key, value: s.value })) };
    this.http.put(`${this.apiUrl}/admin/settings/bulk`, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.savedMsg.set(true);
        setTimeout(() => this.savedMsg.set(false), 3000);
      },
      error: () => this.isSaving.set(false),
    });
  }
}
