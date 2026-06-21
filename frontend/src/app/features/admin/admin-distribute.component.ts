import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService, BlogPostMeta } from '../../core/services/blog.service';
import { DistributeService, DistributionRecord } from '../../core/services/distribute.service';
import { PlatformFormatterService, PLATFORM_DEFS, PlatformId } from '../../core/services/platform-formatter.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-admin-distribute',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Toast -->
    @if (toast()) {
      <div class="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl transition-all"
           [class]="toastError() ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'">
        {{ toast() }}
      </div>
    }

    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-black tracking-tight">{{ i18n.t('admin.distribute.title')() }}</h1>
        <p class="text-sm opacity-60 mt-1">{{ i18n.t('admin.distribute.subtitle')() }}</p>
      </div>

      <!-- Two-panel layout -->
      <div class="flex gap-6 h-[calc(100vh-14rem)]">

        <!-- Left: Post list -->
        <div class="w-80 flex-shrink-0 flex flex-col bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl overflow-hidden">
          <div class="p-3 border-b border-[var(--color-border-card)]">
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              [placeholder]="i18n.t('admin.distribute.search_posts')()"
              class="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)] outline-none focus:border-purple-500"
            />
          </div>
          <div class="flex-1 overflow-y-auto">
            @if (loading()) {
              <div class="flex items-center justify-center h-32 opacity-50 text-sm">{{ i18n.t('admin.distribute.loading')() }}</div>
            } @else if (filteredPosts().length === 0) {
              <div class="flex items-center justify-center h-32 opacity-50 text-sm">{{ i18n.t('admin.distribute.no_posts')() }}</div>
            } @else {
              @for (post of filteredPosts(); track post.dbId) {
                <button
                  (click)="selectPost(post)"
                  class="w-full text-left px-4 py-3 border-b border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors"
                  [class.bg-purple-500\/10]="selectedPost()?.dbId === post.dbId"
                  [class.border-l-2]="selectedPost()?.dbId === post.dbId"
                  [class.border-l-purple-500]="selectedPost()?.dbId === post.dbId"
                >
                  <div class="text-sm font-bold truncate">{{ post.zh.title || post.en.title }}</div>
                  <div class="text-xs opacity-50 mt-0.5">{{ post.date }}</div>
                  <!-- Distribution status dots -->
                  <div class="flex gap-1 mt-1.5 flex-wrap">
                    @for (p of platforms; track p.id) {
                      @for (lang of p.langs; track lang) {
                        <span
                          class="w-2 h-2 rounded-full inline-block"
                          [title]="p.name + ' ' + lang.toUpperCase()"
                          [class]="getDistStatus(post.dbId!, p.id, lang) ? 'bg-emerald-500' : 'bg-[var(--color-border-card)]'"
                        ></span>
                      }
                    }
                  </div>
                </button>
              }
            }
          </div>
        </div>

        <!-- Right: Platform cards -->
        <div class="flex-1 overflow-y-auto">
          @if (!selectedPost()) {
            <div class="h-full flex flex-col items-center justify-center opacity-40 space-y-3">
              <span class="text-5xl">📡</span>
              <p class="text-sm font-medium">{{ i18n.t('admin.distribute.select_post')() }}</p>
            </div>
          } @else {
            <div class="space-y-4">
              <!-- Selected post info -->
              <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4">
                <div class="text-base font-bold">{{ selectedPost()!.zh.title }}</div>
                <div class="text-sm opacity-60">{{ selectedPost()!.en.title }}</div>
                @if (loadingFull()) {
                  <div class="text-xs mt-2 opacity-50 animate-pulse">{{ i18n.t('admin.distribute.loading_content')() }}</div>
                }
              </div>

              <!-- Platform cards grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (p of platforms; track p.id) {
                  <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl overflow-hidden">
                    <!-- Card header -->
                    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-card)]">
                      <div class="flex items-center gap-2">
                        <span class="text-xl">{{ p.icon }}</span>
                        <span class="font-bold text-sm">{{ p.name }}</span>
                      </div>
                      <a [href]="p.url" target="_blank" rel="noopener"
                         class="text-xs opacity-40 hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-[var(--color-bg-main)]"
                         [title]="i18n.t('admin.distribute.open_platform')()">
                        ↗
                      </a>
                    </div>

                    <!-- Card body -->
                    <div class="px-4 py-3 space-y-3">
                      <!-- Per-lang copy buttons -->
                      @for (lang of p.langs; track lang) {
                        <div class="space-y-1">
                          <!-- Status row -->
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider opacity-50">{{ lang }}</span>
                            @if (getDistStatus(selectedPost()!.dbId!, p.id, lang); as dist) {
                              <span class="text-xs text-emerald-500 font-medium">
                                ✓ {{ formatDate(dist.last_copied_at) }}
                                @if (dist.copy_count > 1) {
                                  <span class="opacity-50"> ×{{ dist.copy_count }}</span>
                                }
                              </span>
                            } @else {
                              <span class="text-xs opacity-30">{{ i18n.t('admin.distribute.never')() }}</span>
                            }
                          </div>
                          <!-- Copy button -->
                          <button
                            (click)="copy(p.id, lang)"
                            [disabled]="loadingFull() || isCopying(p.id, lang)"
                            class="w-full py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                                   bg-[var(--color-bg-main)] border-[var(--color-border-card)]
                                   hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400"
                          >
                            @if (isCopying(p.id, lang)) {
                              ⏳ {{ i18n.t('admin.distribute.copying')() }}
                            } @else {
                              📋 {{ lang === 'zh' ? i18n.t('admin.distribute.copy_zh')() : i18n.t('admin.distribute.copy_en')() }}
                            }
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminDistributeComponent implements OnInit {
  i18n = inject(I18nService);
  private blogService = inject(BlogService);
  private distributeService = inject(DistributeService);
  private formatter = inject(PlatformFormatterService);

  readonly platforms = PLATFORM_DEFS;

  posts = signal<BlogPostMeta[]>([]);
  distributions = signal<DistributionRecord[]>([]);
  selectedPost = signal<BlogPostMeta | null>(null);
  selectedPostFull = signal<BlogPostMeta | null>(null);
  loading = signal(false);
  loadingFull = signal(false);
  copyingKey = signal<string | null>(null);
  toast = signal<string | null>(null);
  toastError = signal(false);
  searchQuery = signal('');

  filteredPosts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.posts();
    return this.posts().filter(p =>
      p.zh.title.toLowerCase().includes(q) || p.en.title.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.blogService.adminListAll().subscribe({
      next: posts => { this.posts.set(posts); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.distributeService.getDistributions().subscribe({
      next: dists => this.distributions.set(dists),
    });
  }

  selectPost(post: BlogPostMeta) {
    this.selectedPost.set(post);
    this.selectedPostFull.set(null);
    this.loadingFull.set(true);
    this.blogService.adminGet(post.dbId!).subscribe({
      next: full => { this.selectedPostFull.set(full); this.loadingFull.set(false); },
      error: () => this.loadingFull.set(false),
    });
  }

  getDistStatus(postId: number, platform: string, lang: string): DistributionRecord | null {
    return this.distributions().find(d => d.post_id === postId && d.platform === platform && d.lang === lang) ?? null;
  }

  isCopying(platform: string, lang: string): boolean {
    return this.copyingKey() === `${platform}_${lang}`;
  }

  async copy(platform: PlatformId, lang: 'en' | 'zh') {
    const post = this.selectedPostFull();
    if (!post) return;

    const key = `${platform}_${lang}`;
    this.copyingKey.set(key);

    try {
      const text = await this.formatter.formatForPlatform(platform, post, lang);
      await navigator.clipboard.writeText(text);

      this.distributeService.record(post.dbId!, platform, lang).subscribe({
        next: () => {
          // Refresh distributions
          this.distributeService.getDistributions().subscribe(dists => this.distributions.set(dists));
        }
      });

      this.showToast(this.i18n.t('admin.distribute.copied_success')(), false);
    } catch {
      this.showToast(this.i18n.t('admin.distribute.copy_error')(), true);
    } finally {
      this.copyingKey.set(null);
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  private showToast(msg: string, isError: boolean) {
    this.toast.set(msg);
    this.toastError.set(isError);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
