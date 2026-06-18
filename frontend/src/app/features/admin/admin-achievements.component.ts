import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { environment } from '../../../environments/environment';
import { AchievementWithStatus } from '../../core/services/achievement.service';

@Component({
  selector: 'app-admin-achievements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-black text-[var(--color-text-main)]">🏅 {{ i18n.t('admin.achievements.title')() }}</h1>
        <button (click)="openCreate()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow hover:shadow-lg transition-all">
          + {{ i18n.t('admin.achievements.add')() }}
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        @for (stat of statsCards(); track stat.label) {
          <div class="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] p-4 text-center">
            <p class="text-2xl font-black text-[var(--color-text-main)]">{{ stat.value }}</p>
            <p class="text-xs font-bold text-[var(--color-text-muted)] mt-1">{{ stat.label }}</p>
          </div>
        }
      </div>

      <!-- Achievement list -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        @if (isLoading()) {
          <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-to)]"></div>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--color-border-card)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.icon')() }}</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.title')() }}</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.category')() }}</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.rarity')() }}</th>
                  <th class="text-left px-4 py-3">XP</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.unlock_count')() }}</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.active')() }}</th>
                  <th class="text-left px-4 py-3">{{ i18n.t('admin.achievements.col.actions')() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (a of achievements(); track a.id) {
                  <tr class="border-b border-[var(--color-border-card)]/50 last:border-0 hover:bg-[var(--color-bg-main)]/40 transition-colors">
                    <td class="px-4 py-3 text-xl">{{ a.icon_emoji }}</td>
                    <td class="px-4 py-3 font-bold">{{ i18n.t(a.title_key)() || a.title_key }}</td>
                    <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ a.category }}</td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            [class]="rarityClass(a.rarity)">
                        {{ a.rarity }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-mono font-bold text-[var(--color-accent-to)]">+{{ a.xp_reward }}</td>
                    <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ a.unlock_count ?? '—' }}</td>
                    <td class="px-4 py-3">
                      <button (click)="toggleActive(a)"
                              class="w-8 h-4 rounded-full transition-colors relative"
                              [class]="a.is_active ? 'bg-green-500' : 'bg-[var(--color-border-card)]'">
                        <span class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
                              [class]="a.is_active ? 'left-4.5' : 'left-0.5'"></span>
                      </button>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button (click)="openEdit(a)" class="text-xs px-2 py-1 rounded-lg border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors">{{ i18n.t('admin.form.edit')() }}</button>
                        <button (click)="confirmDelete(a.id)" class="text-xs px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">{{ i18n.t('admin.form.delete')() }}</button>
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
          <div class="w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-6 shadow-2xl" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-black mb-4">{{ editMode() ? i18n.t('admin.achievements.edit')() : i18n.t('admin.achievements.create')() }}</h2>
            <div class="flex flex-col gap-3">
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="form.icon_emoji" placeholder="Icon emoji" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-center text-2xl" />
                <input [(ngModel)]="form.rarity" placeholder="common/rare/epic/legendary" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              </div>
              <input [(ngModel)]="form.title_key" placeholder="title_key (e.g. achievement.starter1.title)" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              <input [(ngModel)]="form.desc_key" placeholder="desc_key" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="form.category" placeholder="category" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
                <input [(ngModel)]="form.xp_reward" type="number" placeholder="XP reward" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              </div>
              <input [(ngModel)]="form.condition_type" placeholder="condition_type" class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm" />
              <input [(ngModel)]="form.condition_params" placeholder='condition_params JSON e.g. {"count":10}' class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm font-mono" />
            </div>
            <div class="flex gap-3 mt-5">
              <button (click)="closeModal()" class="flex-1 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold text-[var(--color-text-muted)]">{{ i18n.t('admin.form.cancel')() }}</button>
              <button (click)="save()" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold text-sm shadow">
                {{ editMode() ? i18n.t('admin.form.update')() : i18n.t('admin.form.create')() }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminAchievementsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  isLoading = signal(true);
  achievements = signal<(AchievementWithStatus & { unlock_count?: number })[]>([]);
  showModal = signal(false);
  editMode = signal(false);
  editId = signal('');

  form: any = this.emptyForm();

  statsCards = () => [
    { label: this.i18n.t('admin.achievements.stat.total')(), value: this.achievements().length },
    { label: this.i18n.t('admin.achievements.stat.active')(), value: this.achievements().filter(a => a.is_active).length },
    { label: this.i18n.t('admin.achievements.stat.legendary')(), value: this.achievements().filter(a => a.rarity === 'legendary').length },
    { label: this.i18n.t('admin.achievements.stat.epic')(), value: this.achievements().filter(a => a.rarity === 'epic').length },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/admin/achievements`).subscribe({
      next: r => { this.achievements.set(r.achievements ?? []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editMode.set(false);
    this.showModal.set(true);
  }

  openEdit(a: AchievementWithStatus): void {
    this.form = { ...a };
    this.editId.set(a.id);
    this.editMode.set(true);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const obs = this.editMode()
      ? this.http.put<any>(`${this.apiUrl}/admin/achievements/${this.editId()}`, this.form)
      : this.http.post<any>(`${this.apiUrl}/admin/achievements`, this.form);
    obs.subscribe(() => {
      this.closeModal();
      this.load();
    });
  }

  confirmDelete(id: string): void {
    if (!confirm(this.i18n.t('admin.achievements.delete_confirm')())) return;
    this.http.delete(`${this.apiUrl}/admin/achievements/${id}`).subscribe(() => this.load());
  }

  toggleActive(a: AchievementWithStatus): void {
    this.http.put(`${this.apiUrl}/admin/achievements/${a.id}`, { ...a, is_active: !a.is_active }).subscribe(() => this.load());
  }

  rarityClass(r: string): string {
    switch (r) {
      case 'legendary': return 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10';
      case 'epic':      return 'text-purple-300 border-purple-400/40 bg-purple-400/10';
      case 'rare':      return 'text-blue-300 border-blue-400/40 bg-blue-400/10';
      default:          return 'text-green-300 border-green-400/40 bg-green-400/10';
    }
  }

  private emptyForm() {
    return { icon_emoji: '', rarity: 'common', title_key: '', desc_key: '', category: 'starter', xp_reward: 10, condition_type: '', condition_params: '{}', is_active: true };
  }
}
