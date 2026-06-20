import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

interface Idiom {
  id: number;
  word: string;
  pinyin: string;
  explanation: string;
  story: string;
  derivation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_daily_target: boolean;
}

interface PageResult {
  items: Idiom[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const EMPTY_FORM = (): Partial<Idiom> => ({
  word: '', pinyin: '', explanation: '', story: '',
  derivation: '', difficulty: 'medium', is_daily_target: false,
});

@Component({
  selector: 'app-admin-idiom',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">成语词库管理</h2>
          <p class="text-[var(--color-text-muted)] mt-1 text-sm">新增、编辑、删除成语词条；共 <span class="font-bold text-[var(--color-text-main)]">{{ total() }}</span> 条</p>
        </div>
        <button (click)="openCreate()"
          class="px-5 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2 self-start sm:self-auto">
          <span class="text-lg leading-none">+</span> 新增成语
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <input [(ngModel)]="searchKw" (ngModelChange)="onSearch()"
          placeholder="搜索词、释义、拼音..."
          class="flex-1 min-w-48 px-4 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60" />
        <select [(ngModel)]="filterDiff" (ngModelChange)="load(1)"
          class="px-4 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60">
          <option value="">全部难度</option>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <select [(ngModel)]="filterDaily" (ngModelChange)="load(1)"
          class="px-4 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60">
          <option value="">全部类型</option>
          <option value="true">每日目标</option>
          <option value="false">普通词库</option>
        </select>
      </div>

      <!-- Table -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-[var(--color-bg-main)]/60 border-b border-[var(--color-border-card)]">
                <th class="py-3 px-4 font-bold opacity-60 w-14">ID</th>
                <th class="py-3 px-4 font-bold opacity-60 w-24">成语</th>
                <th class="py-3 px-4 font-bold opacity-60 w-36">拼音</th>
                <th class="py-3 px-4 font-bold opacity-60">释义</th>
                <th class="py-3 px-4 font-bold opacity-60 w-20 text-center">难度</th>
                <th class="py-3 px-4 font-bold opacity-60 w-20 text-center">每日</th>
                <th class="py-3 px-4 font-bold opacity-60 w-28 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (i of [1,2,3,4,5,6,7,8]; track i) {
                  <tr class="border-b border-[var(--color-border-card)]/40 animate-pulse">
                    <td class="py-3 px-4"><div class="h-4 bg-[var(--color-border-card)] rounded w-8"></div></td>
                    <td class="py-3 px-4"><div class="h-4 bg-[var(--color-border-card)] rounded w-16"></div></td>
                    <td class="py-3 px-4"><div class="h-4 bg-[var(--color-border-card)] rounded w-24"></div></td>
                    <td class="py-3 px-4"><div class="h-4 bg-[var(--color-border-card)] rounded w-full"></div></td>
                    <td class="py-3 px-4"></td>
                    <td class="py-3 px-4"></td>
                    <td class="py-3 px-4"></td>
                  </tr>
                }
              } @else {
                @for (item of items(); track item.id) {
                  <tr class="border-b border-[var(--color-border-card)]/40 hover:bg-[var(--color-bg-main)]/30 transition-colors group">
                    <td class="py-3 px-4 font-mono opacity-40 text-xs">#{{ item.id }}</td>
                    <td class="py-3 px-4 font-bold tracking-wider">{{ item.word }}</td>
                    <td class="py-3 px-4 opacity-70 text-xs font-mono">{{ item.pinyin }}</td>
                    <td class="py-3 px-4 opacity-80 max-w-xs truncate">{{ item.explanation }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                        [class]="diffClass(item.difficulty)">
                        {{ diffLabel(item.difficulty) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center text-base">
                      {{ item.is_daily_target ? '⭐' : '' }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="openEdit(item)"
                          class="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="编辑">✏️</button>
                        <button (click)="confirmDelete(item)"
                          class="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors" title="删除">🗑️</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="py-16 text-center opacity-40 text-sm italic">暂无成语词条</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (pages() > 1) {
          <div class="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border-card)]/50 text-sm">
            <span class="opacity-50">第 {{ page() }} / {{ pages() }} 页，共 {{ total() }} 条</span>
            <div class="flex items-center gap-2">
              <button (click)="load(page() - 1)" [disabled]="page() <= 1"
                class="px-3 py-1.5 rounded-lg border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ‹ 上一页
              </button>
              <button (click)="load(page() + 1)" [disabled]="page() >= pages()"
                class="px-3 py-1.5 rounded-lg border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                下一页 ›
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Create / Edit Modal -->
    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        (click)="closeModal()">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden mx-4 max-h-[90dvh] flex flex-col"
          (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-card)]">
            <h3 class="text-lg font-bold">{{ editingId() ? '编辑成语' : '新增成语' }}</h3>
            <button (click)="closeModal()" class="opacity-50 hover:opacity-100 text-xl transition-opacity">✕</button>
          </div>

          <div class="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold opacity-60 mb-1.5">成语 <span class="text-rose-400">*</span></label>
                <input [(ngModel)]="form().word" placeholder="如：破釜沉舟"
                  class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60 font-bold tracking-widest" />
              </div>
              <div>
                <label class="block text-xs font-bold opacity-60 mb-1.5">拼音</label>
                <input [(ngModel)]="form().pinyin" placeholder="如：pò fǔ chén zhōu"
                  class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60 font-mono" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold opacity-60 mb-1.5">释义 <span class="text-rose-400">*</span></label>
              <input [(ngModel)]="form().explanation" placeholder="简短解释成语含义..."
                class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60" />
            </div>

            <div>
              <label class="block text-xs font-bold opacity-60 mb-1.5">成语故事（答题后展示）</label>
              <textarea [(ngModel)]="form().story" rows="4" placeholder="讲述成语背后的历史故事，2~4句为佳..."
                class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60 resize-none leading-relaxed"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold opacity-60 mb-1.5">出处</label>
              <input [(ngModel)]="form().derivation" placeholder="如：《史记·项羽本纪》"
                class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60" />
            </div>

            <div class="flex items-center gap-6">
              <div class="flex-1">
                <label class="block text-xs font-bold opacity-60 mb-1.5">难度</label>
                <select [(ngModel)]="form().difficulty"
                  class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-sm focus:outline-none focus:border-purple-500/60">
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div class="pt-5">
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <div class="relative">
                    <input type="checkbox" [(ngModel)]="form().is_daily_target" class="sr-only" />
                    <div class="w-11 h-6 rounded-full transition-colors"
                      [class]="form().is_daily_target ? 'bg-purple-500' : 'bg-[var(--color-border-card)]'">
                      <div class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform"
                        [class]="form().is_daily_target ? 'translate-x-5.5' : 'translate-x-0.5'"></div>
                    </div>
                  </div>
                  <span class="text-sm font-bold">标记为每日 Wordle 候选 ⭐</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-card)]">
            <button (click)="closeModal()"
              class="px-5 py-2 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] text-sm font-bold transition-colors">
              取消
            </button>
            <button (click)="save()" [disabled]="saving()"
              class="px-6 py-2 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all text-sm">
              {{ saving() ? '保存中...' : (editingId() ? '保存修改' : '创建') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm -->
    @if (deleteTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        (click)="deleteTarget.set(null)">
        <div class="bg-[var(--color-bg-card)] border border-rose-500/30 rounded-2xl w-full max-w-sm shadow-2xl mx-4 p-6"
          (click)="$event.stopPropagation()">
          <div class="text-4xl text-center mb-3">⚠️</div>
          <h3 class="text-lg font-bold text-center mb-2">确认删除？</h3>
          <p class="text-sm text-center opacity-60 mb-6">
            将删除成语「<span class="font-bold text-rose-400">{{ deleteTarget()?.word }}</span>」及其所有用户进度，此操作不可撤销。
          </p>
          <div class="flex gap-3">
            <button (click)="deleteTarget.set(null)"
              class="flex-1 py-2 rounded-xl border border-[var(--color-border-card)] font-bold hover:bg-[var(--color-bg-main)] transition-colors text-sm">
              取消
            </button>
            <button (click)="doDelete()" [disabled]="saving()"
              class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm">
              {{ saving() ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminIdiomComponent implements OnInit {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/idioms`;
  private toast = inject(ToastService);

  items = signal<Idiom[]>([]);
  total = signal(0);
  page = signal(1);
  pages = signal(1);
  loading = signal(false);
  saving = signal(false);

  searchKw = '';
  filterDiff = '';
  filterDaily = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  form = signal<Partial<Idiom>>(EMPTY_FORM());

  deleteTarget = signal<Idiom | null>(null);

  ngOnInit() { this.load(1); }

  load(p: number) {
    this.loading.set(true);
    const params: Record<string, string> = {
      page: String(p), limit: '20',
    };
    if (this.searchKw) params['q'] = this.searchKw;
    if (this.filterDiff) params['difficulty'] = this.filterDiff;
    if (this.filterDaily) params['daily_target'] = this.filterDaily;

    this.http.get<PageResult>(`${this.base}`, { params }).subscribe({
      next: res => {
        this.items.set(res.items ?? []);
        this.total.set(res.total);
        this.page.set(res.page);
        this.pages.set(res.pages);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.show('加载失败', 'error'); },
    });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(1), 300);
  }

  openCreate() {
    this.editingId.set(null);
    this.form.set(EMPTY_FORM());
    this.modalOpen.set(true);
  }

  openEdit(item: Idiom) {
    this.editingId.set(item.id);
    this.form.set({ ...item });
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const f = this.form();
    if (!f.word?.trim()) { this.toast.show('成语不能为空', 'error'); return; }
    if (!f.explanation?.trim()) { this.toast.show('释义不能为空', 'error'); return; }

    this.saving.set(true);
    const id = this.editingId();
    const req = id
      ? this.http.put<Idiom>(`${this.base}/${id}`, f)
      : this.http.post<Idiom>(`${this.base}`, f);

    req.subscribe({
      next: () => {
        this.toast.show(id ? '修改成功' : '创建成功', 'success');
        this.saving.set(false);
        this.closeModal();
        this.load(this.page());
      },
      error: (e) => {
        const msg = e?.error?.message || (id ? '修改失败' : '创建失败');
        this.toast.show(msg, 'error');
        this.saving.set(false);
      },
    });
  }

  confirmDelete(item: Idiom) { this.deleteTarget.set(item); }

  doDelete() {
    const item = this.deleteTarget();
    if (!item) return;
    this.saving.set(true);
    this.http.delete(`${this.base}/${item.id}`).subscribe({
      next: () => {
        this.toast.show(`「${item.word}」已删除`, 'success');
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.load(this.page());
      },
      error: () => { this.toast.show('删除失败', 'error'); this.saving.set(false); },
    });
  }

  diffLabel(d: string) { return d === 'easy' ? '简单' : d === 'hard' ? '困难' : '中等'; }
  diffClass(d: string) {
    return d === 'easy'
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      : d === 'hard'
      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  }
}
