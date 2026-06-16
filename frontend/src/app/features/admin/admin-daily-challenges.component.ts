import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { environment } from '../../../environments/environment';
import { GAME_DEFINITIONS } from '../../core/config/game-definitions';

interface DailyChallenge {
  id: number;
  date: string;
  game_id: string;
  mode: string;
  difficulty: string;
  puzzle_id?: number;
  is_active: boolean;
  completion_count?: number;
}

@Component({
  selector: 'app-admin-daily-challenges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1 class="text-2xl font-black text-[var(--color-text-main)]">📅 {{ i18n.t('admin.daily.title')() }}</h1>
        <div class="flex gap-2">
          <button (click)="openBulk()" class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold hover:bg-[var(--color-bg-main)] transition-colors">
            📋 {{ i18n.t('admin.daily.bulk')() }}
          </button>
          <button (click)="openCreate()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow hover:shadow-lg transition-all">
            + {{ i18n.t('admin.daily.add')() }}
          </button>
        </div>
      </div>

      <!-- Month navigation -->
      <div class="flex items-center justify-between">
        <button (click)="prevMonth()" class="p-2 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors">←</button>
        <span class="font-black text-lg text-[var(--color-text-main)]">{{ currentMonthLabel() }}</span>
        <button (click)="nextMonth()" class="p-2 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors">→</button>
      </div>

      <!-- Calendar -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-4">
        <!-- Day headers -->
        <div class="grid grid-cols-7 gap-1 mb-1">
          @for (d of dayLabels; track d) {
            <div class="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] py-1">{{ d }}</div>
          }
        </div>
        <!-- Weeks -->
        <div class="grid grid-cols-7 gap-1">
          @for (cell of calendarCells(); track cell.key) {
            <div class="aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border text-sm"
                 [class]="cell.challenge
                   ? 'border-[var(--color-accent-from)]/40 bg-[var(--color-accent-from)]/10 hover:bg-[var(--color-accent-from)]/20'
                   : cell.day
                     ? 'border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] border-dashed'
                     : 'border-transparent opacity-0'"
                 (click)="cell.day && (cell.challenge ? openEdit(cell.challenge) : openCreateForDate(cell.date!))">
              @if (cell.day) {
                <span class="font-bold text-xs" [class.text-[var(--color-accent-from)]]="cell.challenge">{{ cell.day }}</span>
                @if (cell.challenge) {
                  <span class="text-[10px] mt-0.5">{{ getEmoji(cell.challenge.game_id) }}</span>
                }
              }
            </div>
          }
        </div>
      </div>

      <!-- List view -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        @if (isLoading()) {
          <div class="flex justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        } @else if (!challenges().length) {
          <div class="text-center py-10 text-[var(--color-text-muted)]">
            <p class="text-3xl mb-2">📭</p>
            <p class="font-bold">No challenges this month</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--color-border-card)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th class="text-left px-4 py-3">Date</th>
                  <th class="text-left px-4 py-3">Game</th>
                  <th class="text-left px-4 py-3">Mode</th>
                  <th class="text-left px-4 py-3">Difficulty</th>
                  <th class="text-left px-4 py-3">Completions</th>
                  <th class="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (c of challenges(); track c.id) {
                  <tr class="border-b border-[var(--color-border-card)]/50 last:border-0 hover:bg-[var(--color-bg-main)]/40 transition-colors"
                      [class.opacity-50]="!c.is_active">
                    <td class="px-4 py-3 font-mono font-bold">{{ c.date }}</td>
                    <td class="px-4 py-3">{{ getEmoji(c.game_id) }} {{ c.game_id }}</td>
                    <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ c.mode }}</td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[var(--color-border-card)] bg-[var(--color-bg-main)]">
                        {{ c.difficulty }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ c.completion_count ?? '—' }}</td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button (click)="openEdit(c)" class="text-xs px-2 py-1 rounded-lg border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors">Edit</button>
                        <button (click)="confirmDelete(c.id)" class="text-xs px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Del</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" (click)="closeModal()">
          <div class="w-full max-w-sm bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-6 shadow-2xl" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-black mb-4">{{ editMode() ? 'Edit Challenge' : 'New Challenge' }}</h2>
            <div class="flex flex-col gap-3">
              <input [(ngModel)]="form.date" type="date" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              <select [(ngModel)]="form.game_id" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm">
                @for (g of games; track g.id) {
                  <option [value]="g.id">{{ g.iconEmoji }} {{ g.id }}</option>
                }
              </select>
              <select [(ngModel)]="form.mode" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm">
                <option value="single">Single</option>
              </select>
              <select [(ngModel)]="form.difficulty" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div class="flex gap-3 mt-5">
              <button (click)="closeModal()" class="flex-1 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold text-[var(--color-text-muted)]">Cancel</button>
              <button (click)="save()" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow">
                {{ editMode() ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bulk Modal -->
      @if (showBulk()) {
        <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" (click)="closeBulk()">
          <div class="w-full max-w-sm bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-6 shadow-2xl" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-black mb-4">Bulk Create Challenges</h2>
            <div class="flex flex-col gap-3">
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="bulk.start_date" type="date" placeholder="Start date" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
                <input [(ngModel)]="bulk.end_date" type="date" placeholder="End date" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              </div>
              <select [(ngModel)]="bulk.game_id" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm">
                <option value="">Random game per day</option>
                @for (g of games; track g.id) {
                  <option [value]="g.id">{{ g.iconEmoji }} {{ g.id }}</option>
                }
              </select>
              <select [(ngModel)]="bulk.difficulty" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm">
                <option value="">Random difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <p class="text-xs text-[var(--color-text-muted)]">Existing dates will be skipped.</p>
            </div>
            <div class="flex gap-3 mt-5">
              <button (click)="closeBulk()" class="flex-1 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold text-[var(--color-text-muted)]">Cancel</button>
              <button (click)="saveBulk()" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow">
                Create
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminDailyChallengesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  games = GAME_DEFINITIONS;
  dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  isLoading = signal(true);
  challenges = signal<DailyChallenge[]>([]);
  showModal = signal(false);
  showBulk = signal(false);
  editMode = signal(false);
  editId = signal(0);

  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth() + 1);

  currentMonthLabel = computed(() => {
    return new Date(this.viewYear(), this.viewMonth() - 1, 1)
      .toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  });

  calendarCells = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const challengeMap = new Map(this.challenges().map(c => [c.date, c]));

    const cells: { key: string; day: number | null; date: string | null; challenge: DailyChallenge | null }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ key: `pre-${i}`, day: null, date: null, challenge: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key: dateStr, day: d, date: dateStr, challenge: challengeMap.get(dateStr) ?? null });
    }
    return cells;
  });

  form: any = this.emptyForm();
  bulk: any = { start_date: '', end_date: '', game_id: '', difficulty: '' };

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.isLoading.set(true);
    const year = this.viewYear();
    const month = String(this.viewMonth()).padStart(2, '0');
    this.http.get<any>(`${this.apiUrl}/admin/daily-challenges?month=${year}-${month}`).subscribe({
      next: r => { this.challenges.set(r.challenges ?? []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  prevMonth(): void {
    let m = this.viewMonth() - 1;
    let y = this.viewYear();
    if (m < 1) { m = 12; y--; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.load();
  }

  nextMonth(): void {
    let m = this.viewMonth() + 1;
    let y = this.viewYear();
    if (m > 12) { m = 1; y++; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.load();
  }

  openCreate(): void { this.form = this.emptyForm(); this.editMode.set(false); this.showModal.set(true); }

  openCreateForDate(date: string): void {
    this.form = { ...this.emptyForm(), date };
    this.editMode.set(false);
    this.showModal.set(true);
  }

  openEdit(c: DailyChallenge): void {
    this.form = { ...c };
    this.editId.set(c.id);
    this.editMode.set(true);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }
  openBulk(): void { this.showBulk.set(true); }
  closeBulk(): void { this.showBulk.set(false); }

  save(): void {
    const obs = this.editMode()
      ? this.http.put<any>(`${this.apiUrl}/admin/daily-challenges/${this.editId()}`, this.form)
      : this.http.post<any>(`${this.apiUrl}/admin/daily-challenges`, this.form);
    obs.subscribe(() => { this.closeModal(); this.load(); });
  }

  saveBulk(): void {
    this.http.post(`${this.apiUrl}/admin/daily-challenges/bulk`, this.bulk).subscribe(() => { this.closeBulk(); this.load(); });
  }

  confirmDelete(id: number): void {
    if (!confirm('Delete this challenge?')) return;
    this.http.delete(`${this.apiUrl}/admin/daily-challenges/${id}`).subscribe(() => this.load());
  }

  getEmoji(gameId: string): string {
    return GAME_DEFINITIONS.find(g => g.id === gameId)?.iconEmoji ?? '🎮';
  }

  private emptyForm() {
    const today = new Date().toISOString().slice(0, 10);
    return { date: today, game_id: 'minesweeper', mode: 'single', difficulty: 'medium', puzzle_id: null, is_active: true };
  }
}
