import { Component, inject, OnInit, signal, computed, effect, untracked, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { BlogService, BlogPostMeta, BlogLanguageMeta } from '../../../core/services/blog.service';
import { I18nService, LANG_LOCALES } from '../../../core/i18n/i18n.service';
import { optimizeMetaTitle, optimizeMetaDescription } from '../../../core/utils/seo.util';
import {
  BlogCategoryDef,
  BlogCategoryWithPosts,
  BLOG_TO_GAME_MAP,
  BLOG_ICON_MAP,
  BLOG_CATEGORIES
} from '../../../core/models/blog.model';

const PROD_ORIGIN = 'https://www.puzzlepk.com';

interface DisplayPostItem {
  id: string;
  date: string;
  icon: string;
  meta: BlogLanguageMeta;
}

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-4 sm:py-8">
      
      <!-- Mobile Drawer Overlay -->
      @if (isMobileMenuOpen()) {
        <div class="fixed inset-0 bg-black/50 z-40 lg:hidden" (click)="isMobileMenuOpen.set(false)"></div>
      }

      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-6 items-start relative">
        
        <!-- Left Sidebar (Strategy Guides Navigation) -->
        <aside class="fixed inset-y-0 left-0 pt-16 z-50 w-72 sm:w-80 bg-[var(--color-bg-card)] border-r border-[var(--color-border-card)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:pt-0 lg:z-auto lg:w-80 lg:shrink-0 lg:rounded-2xl lg:border lg:border-[var(--color-border-card)] lg:shadow-sm lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-5rem)]"
               [class.-translate-x-full]="!isMobileMenuOpen()"
               [class.translate-x-0]="isMobileMenuOpen()">
          
          <div class="p-3.5 flex flex-col gap-3 h-full overflow-y-auto">
            
            <!-- Sidebar Header -->
            <div class="px-2 pb-3 border-b border-[var(--color-border-card)] flex items-center justify-between">
              <div>
                <h2 class="text-base font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span class="text-lg">📝</span>
                  <span>{{ i18n.t('blog.sidebar_title')() || '解谜攻略目录' }}</span>
                </h2>
                <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {{ i18n.t('blog.sidebar_subtitle')() || '21篇通关攻略与胜率秘籍' }}
                </p>
              </div>
              <button class="lg:hidden p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer" 
                      (click)="isMobileMenuOpen.set(false)"
                      aria-label="Close menu">✕</button>
            </div>

            <!-- Instant Search Input -->
            <div class="px-1">
              <div class="relative">
                <input type="text"
                       [value]="searchQuery()"
                       (input)="onSearchInput($event)"
                       [placeholder]="i18n.t('blog.search_placeholder')() || '搜索攻略、技巧或游戏...'"
                       class="w-full px-3 py-2 pl-8 text-xs rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-all" />
                <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                @if (searchQuery()) {
                  <button (click)="clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">✕</button>
                }
              </div>
            </div>

            <!-- Category Accordion Navigation -->
            <div class="flex flex-col gap-2.5 flex-1">
              @for (cat of filteredSidebarCategories(); track cat.id) {
                <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/40 overflow-hidden transition-all">
                  
                  <!-- Category Header Toggle -->
                  <button type="button"
                          (click)="toggleCategory(cat.id)"
                          class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer select-none">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-base shrink-0">{{ cat.icon }}</span>
                      <span class="truncate">{{ i18n.t(cat.titleKey)() || cat.defaultTitle }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 ml-1.5">
                      <span class="px-2 py-0.5 text-[11px] rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-card)] font-mono font-medium">
                        {{ cat.posts.length }}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" 
                           class="w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200"
                           [class.rotate-180]="isCategoryExpanded(cat.id)"
                           viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  <!-- Category Posts -->
                  @if (isCategoryExpanded(cat.id)) {
                    <div class="px-1.5 pb-2 pt-1 flex flex-col gap-1 border-t border-[var(--color-border-card)]/50">
                      @for (post of cat.posts; track post.id) {
                        @let pMeta = getPostDisplayMeta(post);
                        <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]"
                           (click)="isMobileMenuOpen.set(false)"
                           class="px-2.5 py-2 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)] transition-all flex items-center justify-between group">
                          <div class="flex items-center gap-2 min-w-0 pr-1">
                            <span class="text-sm shrink-0">{{ getPostIcon(post.id) }}</span>
                            <span class="truncate leading-tight group-hover:text-[var(--color-accent-from)] transition-colors">{{ pMeta.title }}</span>
                          </div>
                        </a>
                      }
                    </div>
                  }
                </div>
              }

              @if (filteredSidebarCategories().length === 0) {
                <div class="text-center py-8 text-xs text-[var(--color-text-muted)]">
                  {{ i18n.t('blog.no_search_results')() || '未找到匹配的攻略文章' }}
                </div>
              }
            </div>

          </div>
        </aside>

        <!-- Right Main Column (Blog List Grid & Category Filter Tabs) -->
        <main class="flex-1 min-w-0 w-full flex flex-col gap-6">
          
          <!-- Mobile Drawer Opener Bar -->
          <div class="lg:hidden p-3 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl flex items-center justify-between">
            <button (click)="isMobileMenuOpen.set(true)" 
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-xs sm:text-sm font-bold text-[var(--color-text-primary)] cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{{ i18n.t('blog.mobile_menu_btn')() || '展开攻略目录' }}</span>
            </button>
            <span class="text-xs text-[var(--color-text-muted)] font-medium">
              {{ displayPosts().length }} 篇攻略
            </span>
          </div>

          <!-- Header Banner -->
          <header class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div class="relative z-10">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <span>💡</span>
                <span>Puzzle PK Strategy Hub</span>
              </div>
              <h1 class="text-3xl sm:text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300">
                {{ i18n.t('blog.title')() }}
              </h1>
              <p class="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
                {{ i18n.t('blog.subtitle')() }}
              </p>
            </div>
          </header>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 -mt-2 no-scrollbar">
            <button type="button"
                    (click)="selectedCategory.set('all')"
                    class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer border"
                    [class.bg-[var(--color-accent-from)]]="selectedCategory() === 'all'"
                    [class.text-white]="selectedCategory() === 'all'"
                    [class.border-transparent]="selectedCategory() === 'all'"
                    [class.bg-[var(--color-bg-card)]]="selectedCategory() !== 'all'"
                    [class.text-[var(--color-text-secondary)]]="selectedCategory() !== 'all'"
                    [class.border-[var(--color-border-card)]]="selectedCategory() !== 'all'"
                    [class.hover:text-[var(--color-text-primary)]]="selectedCategory() !== 'all'">
              {{ i18n.t('blog.all_guides')() || '全部攻略' }} ({{ rawPosts().length }})
            </button>
            @for (cat of categoriesWithPosts(); track cat.id) {
              <button type="button"
                      (click)="selectedCategory.set(cat.id)"
                      class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5"
                      [class.bg-[var(--color-accent-from)]]="selectedCategory() === cat.id"
                      [class.text-white]="selectedCategory() === cat.id"
                      [class.border-transparent]="selectedCategory() === cat.id"
                      [class.bg-[var(--color-bg-card)]]="selectedCategory() !== cat.id"
                      [class.text-[var(--color-text-secondary)]]="selectedCategory() !== cat.id"
                      [class.border-[var(--color-border-card)]]="selectedCategory() !== cat.id"
                      [class.hover:text-[var(--color-text-primary)]]="selectedCategory() !== cat.id">
                <span>{{ cat.icon }}</span>
                <span>{{ i18n.t(cat.titleKey)() || cat.defaultTitle }}</span>
                <span class="text-[11px] opacity-80 font-mono">({{ cat.posts.length }})</span>
              </button>
            }
          </div>

          <!-- Blog Card Grid -->
          <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            @for (post of displayPosts(); track post.id) {
              <article class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group flex flex-col justify-between">
                <div>
                  <!-- Tags & Icon -->
                  <div class="flex items-center justify-between gap-2 mb-3.5">
                    <div class="flex flex-wrap gap-1.5">
                      @for (tag of post.meta.tags.slice(0, 3); track tag) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400">
                          {{ tag }}
                        </span>
                      }
                    </div>
                    <span class="text-xl shrink-0 p-1 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
                      {{ post.icon }}
                    </span>
                  </div>

                  <!-- Title -->
                  <h2 class="text-lg sm:text-xl font-bold mb-2.5 text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-from)] transition-colors leading-snug">
                    <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]">{{ post.meta.title }}</a>
                  </h2>

                  <!-- Description -->
                  <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mb-5 line-clamp-3 leading-relaxed">
                    {{ post.meta.description }}
                  </p>
                </div>

                <!-- Footer: Date, Read Time, and Link -->
                <div class="pt-3.5 border-t border-[var(--color-border-card)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <div class="flex items-center gap-2">
                    <span>{{ post.date }}</span>
                    <span>•</span>
                    <span>{{ post.meta.readTime }}</span>
                  </div>
                  <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]"
                     class="inline-flex items-center gap-1 font-semibold text-[var(--color-accent-from)] hover:underline group-hover:translate-x-0.5 transition-transform">
                    <span>{{ i18n.t('blog.read_more')() || '阅读攻略 →' }}</span>
                  </a>
                </div>
              </article>
            }

            @if (displayPosts().length === 0 && !loading()) {
              <div class="col-span-full text-center py-16 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl">
                <div class="text-3xl mb-3">🔍</div>
                <div class="text-base font-bold text-[var(--color-text-primary)] mb-1">
                  {{ i18n.t('blog.no_search_results')() || '未找到匹配的攻略文章' }}
                </div>
                <p class="text-xs text-[var(--color-text-muted)] mb-4">
                  请尝试更换关键词或切换分类筛选
                </p>
                <button type="button"
                        (click)="resetFilters()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-accent-from)] text-white hover:opacity-90 cursor-pointer">
                  重置筛选条件
                </button>
              </div>
            }
            
            @if (loading()) {
              <div class="col-span-full flex flex-col items-center justify-center py-16">
                <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs text-[var(--color-text-muted)]">加载攻略中...</p>
              </div>
            }
          </div>

        </main>

      </div>
    </div>
  `
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private doc = inject(DOCUMENT);
  i18n = inject(I18nService);

  readonly categories = BLOG_CATEGORIES;

  rawPosts = signal<BlogPostMeta[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedCategory = signal<string>('all');
  isMobileMenuOpen = signal(false);

  expandedCategories = signal<Record<string, boolean>>({
    featured: true,
    logic: true,
    math: true,
    board: true,
    more: true
  });

  // Categorized posts computed
  categoriesWithPosts = computed<BlogCategoryWithPosts[]>(() => {
    const posts = this.rawPosts();
    const postMap = new Map(posts.map(p => [p.id, p]));
    const categorizedIds = new Set<string>();

    const result: BlogCategoryWithPosts[] = this.categories.map(cat => {
      const catPosts: BlogPostMeta[] = [];
      for (const pid of cat.postIds) {
        const p = postMap.get(pid);
        if (p) {
          catPosts.push(p);
          categorizedIds.add(pid);
        }
      }
      return {
        ...cat,
        posts: catPosts
      };
    }).filter(c => c.posts.length > 0);

    const remainingPosts = posts.filter(p => !categorizedIds.has(p.id));
    if (remainingPosts.length > 0) {
      result.push({
        id: 'more',
        icon: '🎮',
        titleKey: 'blog.cat.more',
        defaultTitle: '更多解谜指南',
        postIds: remainingPosts.map(p => p.id),
        posts: remainingPosts
      });
    }

    return result;
  });

  // Filtered categories for sidebar based on search query
  filteredSidebarCategories = computed<BlogCategoryWithPosts[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cats = this.categoriesWithPosts();
    if (!q) return cats;

    return cats.map(cat => {
      const matchingPosts = cat.posts.filter(p => {
        const meta = this.getPostDisplayMeta(p);
        const titleMatch = meta.title?.toLowerCase().includes(q);
        const descMatch = meta.description?.toLowerCase().includes(q);
        const tagMatch = meta.tags?.some(t => t.toLowerCase().includes(q));
        const slugMatch = p.id.toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || slugMatch;
      });
      return {
        ...cat,
        posts: matchingPosts
      };
    }).filter(c => c.posts.length > 0);
  });

  // Display posts in main grid filtered by selectedCategory and searchQuery
  displayPosts = computed<DisplayPostItem[]>(() => {
    const lang = this.i18n.currentLang();
    const q = this.searchQuery().trim().toLowerCase();
    const selCat = this.selectedCategory();
    let posts = this.rawPosts();

    // 1. Filter by category
    if (selCat !== 'all') {
      const cat = this.categoriesWithPosts().find(c => c.id === selCat);
      if (cat) {
        const idSet = new Set(cat.posts.map(p => p.id));
        posts = posts.filter(p => idSet.has(p.id));
      }
    }

    // 2. Filter by search query
    if (q) {
      posts = posts.filter(p => {
        const meta = lang === 'zh' ? p.zh : p.en;
        const titleMatch = meta.title?.toLowerCase().includes(q);
        const descMatch = meta.description?.toLowerCase().includes(q);
        const tagMatch = meta.tags?.some(t => t.toLowerCase().includes(q));
        const slugMatch = p.id.toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || slugMatch;
      });
    }

    return posts.map(post => ({
      id: post.id,
      date: post.date,
      icon: this.getPostIcon(post.id),
      meta: lang === 'zh' ? post.zh : post.en
    }));
  });

  constructor() {
    // Dynamic SEO updates on language or state change
    effect(() => {
      const lang = this.i18n.currentLang();
      untracked(() => {
        const appName = this.i18n.t('app.title')();
        const baseTitle = lang === 'zh' 
          ? 'Puzzle PK 官方博客 - 脑力训练与益智游戏通关攻略' 
          : 'Puzzle PK Blog - Brain Training & Puzzle Strategy Guides';
        const finalTitle = optimizeMetaTitle(baseTitle, appName, ` - ${appName}`);
        const finalDesc = optimizeMetaDescription(
          lang === 'zh'
            ? '探索益智游戏PK网全系列18款经典益智游戏的深度通关攻略、逻辑解题策略、儿童脑力开发心得与全球PK对战制胜秘籍。'
            : 'Explore masterclass puzzle walkthroughs, winning tactics, and cognitive training insights across 18 classical puzzle games on Puzzle PK.',
          lang
        );

        this.titleService.setTitle(finalTitle);
        this.metaService.updateTag({ name: 'description', content: finalDesc });
        this.metaService.updateTag({ property: 'og:title', content: finalTitle });
        this.metaService.updateTag({ property: 'og:description', content: finalDesc });

        const origin = (typeof window !== 'undefined' && window.location?.origin) || PROD_ORIGIN;
        this.metaService.updateTag({ property: 'og:image', content: `${origin}/og-cover.png` });

        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: finalTitle,
          description: finalDesc,
          url: `${origin}/${lang}/blog`,
          inLanguage: LANG_LOCALES[lang] || 'zh-CN',
          publisher: {
            '@type': 'Organization',
            name: appName,
            logo: { '@type': 'ImageObject', url: `${origin}/assets/icons/icon-192x192.png` }
          }
        });
      });
    });
  }

  ngOnInit() {
    this.blogService.getBlogPosts().subscribe({
      next: (data) => {
        // Sort by date descending
        this.rawPosts.set(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load blog posts', err);
        this.loading.set(false);
      }
    });
  }

  toggleCategory(catId: string) {
    this.expandedCategories.update(state => ({
      ...state,
      [catId]: !state[catId]
    }));
  }

  isCategoryExpanded(catId: string): boolean {
    if (this.searchQuery().trim()) {
      return true; // Auto expand all categories during active search
    }
    return !!this.expandedCategories()[catId];
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }

  getPostDisplayMeta(post: BlogPostMeta): BlogLanguageMeta {
    const lang = this.i18n.currentLang() as keyof BlogPostMeta;
    return (post[lang] as BlogLanguageMeta) || post.en;
  }

  getPostIcon(postId: string): string {
    return BLOG_ICON_MAP[postId] || '📄';
  }

  private setJsonLd(data: Record<string, unknown>): void {
    const head = this.doc.head;
    if (!head) return;
    const elemId = 'blog-list-jsonld';
    let script = head.querySelector(`#${elemId}`) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = elemId;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }
}
