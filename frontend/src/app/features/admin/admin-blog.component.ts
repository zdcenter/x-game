import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService, BlogPostMeta, AdminBlogPostInput } from '../../core/services/blog.service';
import { DistributeService } from '../../core/services/distribute.service';
import { PlatformFormatterService, PlatformId } from '../../core/services/platform-formatter.service';
import { PlatformDistribPanelComponent } from './platform-distrib-panel.component';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';

type EditTab = 'meta' | 'content_en' | 'content_zh';

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('execCommand copy failed');
}

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, PlatformDistribPanelComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">📝 {{ i18n.t('admin.blog.title')() }}</h2>
          <p class="text-[var(--color-text-muted)] mt-1">{{ i18n.t('admin.blog.subtitle')() }}</p>
        </div>
        <button (click)="openCreate()"
          class="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          {{ i18n.t('admin.blog.add')() }}
        </button>
      </div>

      <!-- Posts Table -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-[var(--color-bg-main)]/50 border-b border-[var(--color-border-card)]">
              <th class="py-3 px-4 w-12 opacity-60 uppercase text-xs tracking-wider">ID</th>
              <th class="py-3 px-4 opacity-60 uppercase text-xs tracking-wider">{{ i18n.t('admin.blog.col.title_en')() }}</th>
              <th class="py-3 px-4 w-28 opacity-60 uppercase text-xs tracking-wider">{{ i18n.t('admin.blog.col.date')() }}</th>
              <th class="py-3 px-4 w-24 opacity-60 uppercase text-xs tracking-wider">{{ i18n.t('admin.blog.col.status')() }}</th>
              <th class="py-3 px-4 w-20 opacity-60 uppercase text-xs tracking-wider text-center">{{ i18n.t('admin.blog.col.order')() }}</th>
              <th class="py-3 px-4 w-44 opacity-60 uppercase text-xs tracking-wider text-right">{{ i18n.t('admin.blog.col.actions')() }}</th>
            </tr>
          </thead>
          <tbody>
            @for (post of posts(); track post.dbId) {
              <tr (click)="toggleDistrib(post)"
                class="border-b border-[var(--color-border-card)]/50 transition-colors group cursor-pointer select-none"
                [class.bg-cyan-500/5]="distribOpenId() === post.dbId"
                [class.hover:bg-cyan-500/5]="distribOpenId() === post.dbId"
                [class.hover:bg-[var(--color-bg-main)]/30]="distribOpenId() !== post.dbId">
                <td class="py-3 px-4 font-mono opacity-40">#{{ post.dbId }}</td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium truncate max-w-xs">{{ post.en.title }}</span>
                    <button (click)="copyTitle(post, 'en'); $event.stopPropagation()"
                      class="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[10px] rounded border transition-all"
                      [class]="titleCopyKey() === post.dbId + '_en'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 opacity-100'
                        : 'border-[var(--color-border-card)] hover:border-cyan-500/50 hover:text-cyan-400'">
                      {{ titleCopyKey() === post.dbId + '_en' ? '✓' : 'EN' }}
                    </button>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[var(--color-text-muted)] text-xs truncate max-w-xs">{{ post.zh.title }}</span>
                    <button (click)="copyTitle(post, 'zh'); $event.stopPropagation()"
                      class="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[10px] rounded border transition-all"
                      [class]="titleCopyKey() === post.dbId + '_zh'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 opacity-100'
                        : 'border-[var(--color-border-card)] hover:border-cyan-500/50 hover:text-cyan-400'">
                      {{ titleCopyKey() === post.dbId + '_zh' ? '✓' : 'ZH' }}
                    </button>
                  </div>
                  <div class="font-mono text-xs text-blue-400 opacity-70 mt-0.5">{{ post.id }}</div>
                </td>
                <td class="py-3 px-4 font-mono text-xs opacity-70">{{ post.date }}</td>
                <td class="py-3 px-4">
                  <button (click)="togglePost(post); $event.stopPropagation()"
                    class="px-2.5 py-1 rounded-full text-xs font-bold border transition-colors"
                    [class]="post.published
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'">
                    {{ post.published ? '✓ ' + i18n.t('admin.blog.published')() : '⏸ ' + i18n.t('admin.blog.draft')() }}
                  </button>
                </td>
                <td class="py-3 px-4 text-center font-mono text-xs">{{ post.sort_order }}</td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <span class="text-xs opacity-40 mr-1">{{ distribOpenId() === post.dbId ? '▲' : '▼' }}</span>
                    <a [href]="'/blog/' + post.id" target="_blank" (click)="$event.stopPropagation()"
                      class="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Preview">
                      🔗
                    </a>
                    <button (click)="openEdit(post); $event.stopPropagation()"
                      class="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                      ✏️
                    </button>
                    <button (click)="deletePost(post); $event.stopPropagation()"
                      class="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
              <!-- 手风琴：分发平台 -->
              @if (distribOpenId() === post.dbId) {
                <tr class="border-b border-cyan-500/10 bg-cyan-500/5">
                  <td colspan="6" class="px-4 py-3">
                    <app-platform-distrib-panel
                      [distribKey]="distribKey()"
                      [loading]="distribLoading()"
                      (copy)="copyBlogPost($event.platformId, $event.lang)">
                    </app-platform-distrib-panel>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="6" class="py-12 text-center text-sm opacity-40 italic">{{ i18n.t('admin.blog.no_posts')() }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit / Create Modal -->
    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-4xl shadow-2xl my-8">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 border-b border-[var(--color-border-card)]">
            <h3 class="text-xl font-bold">{{ isEditing() ? i18n.t('admin.blog.edit')() : i18n.t('admin.blog.new')() }}</h3>
            <button (click)="closeModal()" class="p-2 hover:bg-[var(--color-bg-main)]/50 rounded-lg transition-colors text-lg">✕</button>
          </div>

          <!-- Tab nav -->
          <div class="flex border-b border-[var(--color-border-card)] px-6">
            @for (tab of tabs; track tab.id) {
              <button (click)="activeTab.set(tab.id)"
                class="px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px"
                [class]="activeTab() === tab.id
                  ? 'border-[var(--color-accent-from)] text-[var(--color-accent-from)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
                {{ tab.label }}
              </button>
            }
          </div>

          <div class="p-6 space-y-4">

            <!-- Tab: Meta -->
            @if (activeTab() === 'meta') {
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-semibold opacity-60 mb-1.5">SLUG (URL identifier)</label>
                  <input [(ngModel)]="form.slug" type="text" placeholder="e.g. minesweeper-strategy"
                    class="w-full px-4 py-2.5 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm font-mono focus:outline-none focus:border-[var(--color-accent-from)]">
                </div>
                <div>
                  <label class="block text-xs font-semibold opacity-60 mb-1.5">Date</label>
                  <input [(ngModel)]="form.date" type="date"
                    class="w-full px-4 py-2.5 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-from)]">
                </div>
                <div>
                  <label class="block text-xs font-semibold opacity-60 mb-1.5">Sort Order</label>
                  <input [(ngModel)]="form.sort_order" type="number"
                    class="w-full px-4 py-2.5 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-from)]">
                </div>
                <div class="col-span-2 flex items-center gap-3">
                  <input [(ngModel)]="form.published" type="checkbox" id="pub" class="w-4 h-4 rounded accent-emerald-500">
                  <label for="pub" class="text-sm font-medium">Published (visible to public)</label>
                </div>
              </div>

              <hr class="border-[var(--color-border-card)]">
              <h4 class="font-bold text-sm opacity-70">🇺🇸 English Metadata</h4>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Title EN</label>
                  <input [(ngModel)]="form.title_en" type="text" class="input-field w-full">
                </div>
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Description EN</label>
                  <textarea [(ngModel)]="form.desc_en" rows="2" class="input-field w-full resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Keywords EN</label>
                  <input [(ngModel)]="form.keywords_en" type="text" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Read Time EN</label>
                  <input [(ngModel)]="form.read_time_en" type="text" placeholder="7 min read" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Author EN</label>
                  <input [(ngModel)]="form.author_en" type="text" placeholder="Puzzle PK Team" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Tags EN (comma-separated)</label>
                  <input [(ngModel)]="tagsENStr" type="text" placeholder="Logic, Strategy, Guide" class="input-field w-full">
                </div>
              </div>

              <hr class="border-[var(--color-border-card)]">
              <h4 class="font-bold text-sm opacity-70">🇨🇳 Chinese Metadata</h4>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Title ZH</label>
                  <input [(ngModel)]="form.title_zh" type="text" class="input-field w-full">
                </div>
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Description ZH</label>
                  <textarea [(ngModel)]="form.desc_zh" rows="2" class="input-field w-full resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Keywords ZH</label>
                  <input [(ngModel)]="form.keywords_zh" type="text" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Read Time ZH</label>
                  <input [(ngModel)]="form.read_time_zh" type="text" placeholder="7 分钟阅读" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Author ZH</label>
                  <input [(ngModel)]="form.author_zh" type="text" placeholder="Puzzle PK 团队" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Tags ZH (comma-separated)</label>
                  <input [(ngModel)]="tagsZHStr" type="text" placeholder="逻辑, 策略, 指南" class="input-field w-full">
                </div>
              </div>
            }

            <!-- Tab: Content EN -->
            @if (activeTab() === 'content_en') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-semibold opacity-60">🇺🇸 English Content (Markdown)</label>
                  <span class="text-xs opacity-40 font-mono">{{ wordCount(form.content_en) }} words</span>
                </div>
                <textarea [(ngModel)]="form.content_en" rows="32"
                  class="w-full px-4 py-3 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm font-mono focus:outline-none focus:border-[var(--color-accent-from)] resize-y leading-relaxed"
                  placeholder="# Your article title&#10;&#10;Start writing in Markdown...">
                </textarea>
              </div>
            }

            <!-- Tab: Content ZH -->
            @if (activeTab() === 'content_zh') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-semibold opacity-60">🇨🇳 Chinese Content (Markdown)</label>
                  <span class="text-xs opacity-40 font-mono">{{ charCount(form.content_zh) }} chars</span>
                </div>
                <textarea [(ngModel)]="form.content_zh" rows="32"
                  class="w-full px-4 py-3 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm font-mono focus:outline-none focus:border-[var(--color-accent-from)] resize-y leading-relaxed"
                  placeholder="# 文章标题&#10;&#10;在这里用 Markdown 编写中文内容...">
                </textarea>
              </div>
            }

          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border-card)]">
            <button (click)="closeModal()" class="px-5 py-2.5 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)]/50 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button (click)="save()" [disabled]="saving()"
              class="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg disabled:opacity-50 text-sm flex items-center gap-2">
              @if (saving()) { <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> }
              {{ isEditing() ? i18n.t('admin.blog.save')() : i18n.t('admin.blog.create')() }}
            </button>
          </div>
        </div>
      </div>
    }

  `,
  styles: [`
    .input-field {
      padding: 0.5rem 1rem;
      background: var(--color-bg-main);
      border: 1px solid var(--color-border-card);
      border-radius: 0.75rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .input-field:focus { border-color: var(--color-accent-from); }
  `],
})
export class AdminBlogComponent implements OnInit {
  private blogService   = inject(BlogService);
  private distributeService = inject(DistributeService);
  private formatter     = inject(PlatformFormatterService);
  private toast         = inject(ToastService);
  i18n = inject(I18nService);

  posts     = signal<BlogPostMeta[]>([]);
  modalOpen = signal(false);
  saving    = signal(false);
  editingId = signal<number | null>(null);
  activeTab = signal<EditTab>('meta');

  // Distribute state
  distribOpenId  = signal<number | null>(null);
  distribFull    = signal<BlogPostMeta | null>(null);
  distribLoading = signal(false);
  distribKey     = signal(''); // "platformId_lang" while copying
  titleCopyKey   = signal(''); // "dbId_lang" while copying title

  readonly tabs: { id: EditTab; label: string }[] = [
    { id: 'meta',       label: '📋 Metadata (EN + ZH)' },
    { id: 'content_en', label: '🇺🇸 Content EN' },
    { id: 'content_zh', label: '🇨🇳 Content ZH' },
  ];

  isEditing = computed(() => this.editingId() !== null);

  form: AdminBlogPostInput = this.emptyForm();
  tagsENStr = '';
  tagsZHStr = '';

  ngOnInit() { this.loadPosts(); }

  loadPosts() {
    this.blogService.adminListAll().subscribe({ next: p => this.posts.set(p) });
  }

  openCreate() {
    this.form = this.emptyForm();
    this.tagsENStr = '';
    this.tagsZHStr = '';
    this.editingId.set(null);
    this.activeTab.set('meta');
    this.modalOpen.set(true);
  }

  openEdit(post: BlogPostMeta) {
    if (!post.dbId) return;
    this.blogService.adminGet(post.dbId).subscribe({
      next: (full) => {
        this.form = {
          slug:         full.id,
          date:         full.date,
          published:    full.published ?? true,
          sort_order:   full.sort_order ?? 0,
          title_en:     full.en.title,
          desc_en:      full.en.description,
          keywords_en:  full.en.keywords,
          read_time_en: full.en.readTime,
          author_en:    full.en.author,
          tags_en:      full.en.tags ?? [],
          content_en:   full.en.content ?? '',
          title_zh:     full.zh.title,
          desc_zh:      full.zh.description,
          keywords_zh:  full.zh.keywords,
          read_time_zh: full.zh.readTime,
          author_zh:    full.zh.author,
          tags_zh:      full.zh.tags ?? [],
          content_zh:   full.zh.content ?? '',
        };
        this.tagsENStr = (full.en.tags ?? []).join(', ');
        this.tagsZHStr = (full.zh.tags ?? []).join(', ');
        this.editingId.set(post.dbId!);
        this.activeTab.set('meta');
        this.modalOpen.set(true);
      },
    });
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    this.form.tags_en = this.tagsENStr.split(',').map(t => t.trim()).filter(Boolean);
    this.form.tags_zh = this.tagsZHStr.split(',').map(t => t.trim()).filter(Boolean);

    if (!this.form.slug.trim()) {
      this.toast.show(this.i18n.t('admin.blog.slug_required')(), 'error');
      return;
    }

    this.saving.set(true);
    const id = this.editingId();
    const req = id
      ? this.blogService.adminUpdate(id, this.form)
      : this.blogService.adminCreate(this.form);

    req.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.blog.save_success')(), 'success');
        this.saving.set(false);
        this.closeModal();
        this.loadPosts();
      },
      error: () => {
        this.toast.show(this.i18n.t('admin.blog.save_error')(), 'error');
        this.saving.set(false);
      },
    });
  }

  togglePost(post: BlogPostMeta) {
    if (!post.dbId) return;
    this.blogService.adminToggle(post.dbId).subscribe({
      next: (res) => {
        this.posts.update(list =>
          list.map(p => p.dbId === post.dbId ? { ...p, published: res.published } : p)
        );
        this.toast.show(this.i18n.t('admin.blog.toggle_success')(), 'success');
      },
    });
  }

  deletePost(post: BlogPostMeta) {
    if (!post.dbId || !confirm(this.i18n.t('admin.blog.delete_confirm')())) return;
    this.blogService.adminDelete(post.dbId).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.blog.delete_success')(), 'success');
        this.posts.update(list => list.filter(p => p.dbId !== post.dbId));
      },
      error: () => this.toast.show(this.i18n.t('admin.blog.delete_error')(), 'error'),
    });
  }

  // ---- Distribute ----
  toggleDistrib(post: BlogPostMeta, event?: Event) {
    event?.stopPropagation();
    if (!post.dbId) return;
    if (this.distribOpenId() === post.dbId) {
      this.distribOpenId.set(null);
      this.distribFull.set(null);
      return;
    }
    this.distribOpenId.set(post.dbId);
    this.distribFull.set(null);
    this.distribKey.set('');
    this.distribLoading.set(true);
    this.blogService.adminGet(post.dbId).subscribe({
      next: (full) => { this.distribFull.set(full); this.distribLoading.set(false); },
      error: () => { this.distribLoading.set(false); },
    });
  }

  async copyTitle(post: BlogPostMeta, lang: 'en' | 'zh') {
    const key = `${post.dbId}_${lang}`;
    const text = lang === 'zh' ? post.zh.title : post.en.title;
    this.titleCopyKey.set(key);
    try {
      await copyToClipboard(text);
      this.toast.show('标题已复制', 'success');
    } catch { this.toast.show('复制失败', 'error'); }
    setTimeout(() => { if (this.titleCopyKey() === key) this.titleCopyKey.set(''); }, 2000);
  }

  async copyBlogPost(platformId: PlatformId, lang: 'en' | 'zh') {
    const full = this.distribFull();
    if (!full) return;
    const key = `${platformId}_${lang}`;
    this.distribKey.set(key);
    try {
      const text = await this.formatter.formatForPlatform(platformId, full, lang);
      await copyToClipboard(text);
      if (full.dbId) {
        this.distributeService.record(full.dbId, platformId, lang).subscribe();
      }
      this.toast.show('已复制到剪贴板！', 'success');
    } catch {
      this.toast.show('复制失败', 'error');
    }
    setTimeout(() => {
      if (this.distribKey() === key) this.distribKey.set('');
    }, 2000);
  }



  wordCount(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  charCount(text: string): number {
    return text.trim().length;
  }

  private emptyForm(): AdminBlogPostInput {
    const today = new Date().toISOString().split('T')[0];
    return {
      slug: '', date: today, published: true, sort_order: 0,
      title_en: '', desc_en: '', keywords_en: '', read_time_en: '5 min read', author_en: 'Puzzle PK Team',
      tags_en: [], content_en: '',
      title_zh: '', desc_zh: '', keywords_zh: '', read_time_zh: '5 分钟阅读', author_zh: 'Puzzle PK 团队',
      tags_zh: [], content_zh: '',
    };
  }
}
