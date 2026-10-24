import { Component, inject, OnInit, signal, SecurityContext, computed, effect, untracked, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { BlogService, BlogPostMeta, BlogLanguageMeta } from '../../../core/services/blog.service';
import { I18nService, LANG_LOCALES } from '../../../core/i18n/i18n.service';
import { marked } from 'marked';

const PROD_ORIGIN = 'https://www.puzzlepk.com';

export interface BlogGameDef {
  id: string;
  nameKey: string;
  icon: string;
}

const BLOG_TO_GAME_MAP: Record<string, BlogGameDef> = {
  'gomoku-strategy-guide': { id: 'gomoku', nameKey: 'lobby.gomoku', icon: '⚪' },
  'nonogram-strategy': { id: 'nonogram', nameKey: 'lobby.nonogram', icon: '🎨' },
  'water-sort-puzzle-guide': { id: 'watersort', nameKey: 'lobby.watersort', icon: '🧪' },
  'tetris-battle-strategy': { id: 'tetris', nameKey: 'lobby.tetris', icon: '🧱' },
  'sokoban-strategy': { id: 'sokoban', nameKey: 'lobby.sokoban', icon: '📦' },
  'minesweeper-logic': { id: 'minesweeper', nameKey: 'lobby.minesweeper', icon: '💣' },
  '1a2b-bulls-cows': { id: 'codebreaker', nameKey: 'lobby.codebreaker', icon: '🐮' },
  'sudoku-benefits': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '🔢' },
  'why-math24-is-the-best-brain-training-game-for-kids': { id: 'math24', nameKey: 'lobby.math24', icon: '➗' },
  'sudoku-for-kids-a-beginners-guide': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '🔢' },
  'benefits-of-multiplayer-educational-games': { id: 'lobby', nameKey: 'nav.lobby', icon: '🏆' },
  'block-puzzle-strategy': { id: 'block', nameKey: 'lobby.block', icon: '🧩' },
  'classic2048-strategy': { id: 'classic2048', nameKey: 'lobby.classic2048', icon: '🔢' },
  'hashi-bridges-strategy': { id: 'hashi', nameKey: 'lobby.hashi', icon: '🌉' },
  'hexa-puzzle-strategy': { id: 'hexa', nameKey: 'lobby.hexa', icon: '⬡' },
  'lights-out-puzzle-guide': { id: 'lightsout', nameKey: 'lobby.lightsout', icon: '💡' },
  'sliding-puzzle-strategy': { id: 'sliding', nameKey: 'lobby.sliding', icon: '🔲' },
};

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-8 sm:py-10">
      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        
        <!-- Breadcrumb & Back Header Bar (Aligned with 1600px grid) -->
        <div class="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <a [routerLink]="['/', i18n.currentLang(), 'blog']"
             class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-xs sm:text-sm font-bold text-[var(--color-text-main)] hover:border-emerald-500/50 hover:text-emerald-400 shadow-xs hover:shadow-md transition-all active:scale-95 group">
            <svg class="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            <span>{{ i18n.t('blog.back_to_blog')() }}</span>
          </a>

          @if (displayMeta()?.title) {
            <span class="text-xs text-[var(--color-text-muted)] font-medium truncate max-w-xs sm:max-w-md hidden md:inline-block">
              {{ displayMeta()?.title }}
            </span>
          }
        </div>

        @if (loading()) {
          <div class="flex justify-center py-24">
            <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (error()) {
          <div class="text-center py-24 text-red-400 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl p-10 max-w-2xl mx-auto shadow-xl">
            <h2 class="text-2xl font-black mb-2">{{ i18n.t('blog.not_found_title')() }}</h2>
            <p class="text-sm text-[var(--color-text-secondary)]">{{ i18n.t('blog.not_found_desc')() }}</p>
          </div>
        } @else {
          <!-- Modern Full-Width 1600px Two-Column Architecture -->
          <div class="flex flex-col lg:flex-row gap-8 items-start w-full">
            
            <!-- Left Main Column: Full-Breadth Article Card -->
            <main class="flex-1 min-w-0 w-full">
              <article class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl relative overflow-hidden">
                
                <!-- Article Header -->
                <header class="border-b border-[var(--color-border-card)] pb-8 mb-8 sm:mb-10">
                  <div class="flex flex-wrap gap-2 mb-4">
                    @for (tag of displayMeta()?.tags; track tag) {
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {{ tag }}
                      </span>
                    }
                  </div>
                  
                  <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight text-[var(--color-text-main)] tracking-tight">
                    {{ displayMeta()?.title }}
                  </h1>

                  <div class="flex flex-wrap items-center text-xs sm:text-sm text-[var(--color-text-secondary)] gap-4 sm:gap-6">
                    <span class="flex items-center gap-1.5 font-semibold text-[var(--color-text-main)]">
                      <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-[10px] font-black">
                        PK
                      </div>
                      {{ displayMeta()?.author }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      {{ rawMeta()?.date }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {{ displayMeta()?.readTime }}
                    </span>
                  </div>
                </header>

                <!-- Markdown Rendered Prose Body -->
                <div class="prose prose-invert prose-emerald max-w-none text-base sm:text-lg leading-relaxed" [innerHTML]="contentHtml()">
                </div>

                <!-- Author / Team Bio (E-E-A-T Quality Signal) -->
                <div class="mt-12 p-6 sm:p-8 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-lg font-black shrink-0 text-white shadow-md">
                      PK
                    </div>
                    <div>
                      <h3 class="font-bold text-base text-[var(--color-text-main)] mb-1">{{ displayMeta()?.author }}</h3>
                      <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">{{ i18n.t('blog.author_bio')() }}</p>
                      <a [routerLink]="['/', i18n.currentLang(), 'legal', 'about']" class="inline-block mt-3 text-xs sm:text-sm font-bold text-[var(--color-accent-from)] hover:underline">
                        {{ i18n.t('blog.author_more')() }}
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Related Masterclasses (Horizontal Shelf on Main Card) -->
                @if (recommendedPosts().length > 0) {
                  <div class="mt-12 pt-10 border-t border-[var(--color-border-card)]">
                    <div class="mb-6">
                      <h3 class="text-xl font-black text-[var(--color-text-main)] flex items-center gap-2">
                        <span>📖</span>
                        <span>{{ i18n.t('blog.related_guides_title')() }}</span>
                      </h3>
                      <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
                        {{ i18n.t('blog.related_guides_subtitle')() }}
                      </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      @for (post of recommendedPosts(); track post.id) {
                        @let pMeta = getPostDisplayMeta(post);
                        <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]"
                           class="group flex flex-col justify-between p-5 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-emerald-500/40 hover:bg-[var(--color-bg-card)] transition-all shadow-sm hover:shadow-md">
                          <div>
                            <div class="flex items-center gap-2 mb-2">
                              @if (pMeta?.tags?.[0]; as firstTag) {
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {{ firstTag }}
                                </span>
                              }
                              <span class="text-[10px] text-[var(--color-text-secondary)] font-mono">{{ pMeta?.readTime }}</span>
                            </div>
                            <h4 class="text-sm font-bold text-[var(--color-text-main)] group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                              {{ pMeta?.title }}
                            </h4>
                          </div>
                          <div class="mt-4 flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                            <span>{{ i18n.t('game.read_guide')() }}</span>
                            <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </a>
                      }
                    </div>
                  </div>
                }

              </article>
            </main>

            <!-- Right Column: Sticky Esports Practice & Quick Action Sidebar -->
            <aside class="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20 space-y-6">
              
              <!-- Card 1: Interactive Practice & Battle Arena Gateway -->
              @if (relatedGame(); as game) {
                <div class="p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--color-bg-card)] to-[var(--color-bg-main)] shadow-xl relative overflow-hidden">
                  <div class="flex items-center gap-3.5 mb-4">
                    <div class="text-4xl shrink-0 w-14 h-14 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center shadow-inner">
                      {{ game.icon }}
                    </div>
                    <div>
                      <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                        <span>🎯</span>
                        <span>{{ i18n.t('blog.interactive_practice_badge')() }}</span>
                      </div>
                      <h3 class="text-lg font-black text-[var(--color-text-main)] mt-1">
                        {{ i18n.t(game.nameKey)() }}
                      </h3>
                    </div>
                  </div>

                  <p class="text-xs text-[var(--color-text-secondary)] mb-5 leading-relaxed">
                    {{ i18n.t('blog.interactive_practice_desc')() }}
                  </p>

                  <!-- Action Buttons: Solo & PK -->
                  <div class="flex flex-col gap-2.5">
                    <a [routerLink]="game.id === 'lobby' ? ['/', i18n.currentLang(), 'lobby'] : ['/', i18n.currentLang(), 'games', game.id]"
                       class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 active:scale-95 transition-all">
                      <span>🕹️</span>
                      <span>{{ i18n.t('blog.cta_play_solo')() }}</span>
                    </a>
                    @if (game.id !== 'lobby') {
                      <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']"
                         [queryParams]="{ game: game.id }"
                         class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-[var(--color-bg-main)] border border-violet-500/40 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/60 shadow-sm active:scale-95 transition-all">
                        <span>⚔️</span>
                        <span>{{ i18n.t('blog.cta_play_pk')() }}</span>
                      </a>
                    }
                  </div>
                </div>
              }

              <!-- Card 2: Community & Global Leaderboards -->
              <div class="p-6 rounded-3xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-xl">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xl">🏆</span>
                  <h4 class="font-black text-sm text-[var(--color-text-main)]">{{ i18n.t('nav.leaderboard')() }}</h4>
                </div>
                <p class="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4">
                  挑战脑力纪录，赢取每日任务脑力币与段位排位！
                </p>
                <a [routerLink]="['/', i18n.currentLang(), 'leaderboard']"
                   class="inline-flex items-center justify-center w-full py-2 px-3 rounded-xl border border-[var(--color-border-card)] hover:border-emerald-500/40 text-xs font-bold text-[var(--color-text-main)] hover:text-emerald-400 bg-[var(--color-bg-main)] transition-colors">
                  <span>查看全球榜单 →</span>
                </a>
              </div>

            </aside>

          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Custom styles for the markdown injected prose to match our dark theme perfectly */
    ::ng-deep .prose-invert {
      color: var(--color-text-secondary);
    }
    ::ng-deep .prose-invert h1, 
    ::ng-deep .prose-invert h2, 
    ::ng-deep .prose-invert h3, 
    ::ng-deep .prose-invert h4 {
      color: var(--color-text-main);
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 1em;
    }
    ::ng-deep .prose-invert h2 {
      border-bottom: 1px solid var(--color-border-card);
      padding-bottom: 0.3em;
    }
    ::ng-deep .prose-invert p {
      margin-top: 1.25em;
      margin-bottom: 1.25em;
      line-height: 1.75;
    }
    ::ng-deep .prose-invert a {
      color: #34d399; /* emerald-400 */
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    ::ng-deep .prose-invert a:hover {
      color: #6ee7b7; /* emerald-300 */
    }
    ::ng-deep .prose-invert strong {
      color: var(--color-text-main);
    }
    ::ng-deep .prose-invert ul {
      list-style-type: disc;
      padding-left: 1.5em;
      margin-top: 1.25em;
      margin-bottom: 1.25em;
    }
    ::ng-deep .prose-invert li {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    ::ng-deep .prose-invert blockquote {
      border-left-width: 4px;
      border-left-color: var(--color-border-card);
      padding-left: 1em;
      font-style: italic;
      color: var(--color-text-secondary);
    }
    ::ng-deep .prose-invert code {
      color: #6ee7b7;
      background-color: rgba(255, 255, 255, 0.1);
      padding: 0.2em 0.4em;
      border-radius: 0.25rem;
      font-size: 0.875em;
    }
  `]
})
export class BlogPostComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private blogService = inject(BlogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private sanitizer = inject(DomSanitizer);
  private doc = inject(DOCUMENT);
  i18n = inject(I18nService);

  rawMeta = signal<BlogPostMeta | null>(null);
  allPosts = signal<BlogPostMeta[]>([]);
  displayMeta = computed(() => {
    const raw = this.rawMeta();
    if (!raw) return null;
    const lang = this.i18n.currentLang() as keyof BlogPostMeta;
    return raw[lang] as BlogLanguageMeta || raw.en;
  });

  contentHtml = signal<SafeHtml>('');
  loading = signal(true);
  error = signal(false);
  currentId = signal<string | null>(null);

  relatedGame = computed<BlogGameDef | null>(() => {
    const slug = this.currentId();
    if (slug && BLOG_TO_GAME_MAP[slug]) {
      return BLOG_TO_GAME_MAP[slug];
    }
    const raw = this.rawMeta();
    if (raw?.relatedGameId) {
      return { id: raw.relatedGameId, nameKey: `lobby.${raw.relatedGameId}`, icon: '🎮' };
    }
    return null;
  });

  recommendedPosts = computed<BlogPostMeta[]>(() => {
    const current = this.currentId();
    return this.allPosts()
      .filter(p => p.id !== current)
      .slice(0, 3);
  });

  getPostDisplayMeta(post: BlogPostMeta): BlogLanguageMeta {
    const lang = this.i18n.currentLang() as keyof BlogPostMeta;
    return (post[lang] as BlogLanguageMeta) || post.en;
  }

  constructor() {
    // Re-render content + SEO when language or loaded post changes
    effect(() => {
      const lang = this.i18n.currentLang();
      const meta = this.displayMeta();
      const raw = this.rawMeta();

      if (!meta || !raw) return;

      untracked(() => {
        // SEO tags
        this.titleService.setTitle(`${meta.title} - ${this.i18n.t('app.title')()} Blog`);
        this.metaService.updateTag({ name: 'description', content: meta.description });
        this.metaService.updateTag({ name: 'keywords', content: meta.keywords });
        this.metaService.updateTag({ property: 'og:title', content: `${meta.title} - ${this.i18n.t('app.title')()} Blog` });
        this.metaService.updateTag({ property: 'og:description', content: meta.description });

        // BlogPosting JSON-LD
        const origin = (typeof window !== 'undefined' && window.location?.origin) || PROD_ORIGIN;
        const coverImg = raw.cover_image ? raw.cover_image : `${origin}/og-cover.png`;
        this.metaService.updateTag({ property: 'og:image', content: coverImg });
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: meta.title,
          description: meta.description,
          author: { '@type': 'Organization', name: meta.author || 'Puzzle PK Team' },
          publisher: { '@type': 'Organization', name: this.i18n.t('app.title')(), logo: { '@type': 'ImageObject', url: `${origin}/assets/icons/icon-192x192.png` } },
          datePublished: raw.date,
          dateModified: raw.date,
          url: `${origin}/${lang}/blog/${raw.id}`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${origin}/${lang}/blog/${raw.id}` },
          keywords: meta.keywords,
          image: raw.cover_image || `${origin}/og-cover.png`,
          inLanguage: LANG_LOCALES[lang],
        });

        // Render markdown (content already available in meta.content from API)
        const markdownStr = meta.content ?? '';
        const rawHtml = marked.parse(markdownStr) as string;
        const safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
        this.contentHtml.set(safeHtml);
        this.loading.set(false);
      });
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('id');
      if (slug) {
        this.currentId.set(slug);
        this.loadPost(slug);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });

    this.blogService.getBlogPosts().subscribe({
      next: (posts) => this.allPosts.set(posts || []),
      error: () => {}
    });
  }

  private setJsonLd(data: Record<string, unknown>): void {
    const head = this.doc.head;
    if (!head) return;
    const elemId = 'blog-post-jsonld';
    let script = head.querySelector(`#${elemId}`) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = elemId;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private loadPost(slug: string) {
    this.loading.set(true);
    this.error.set(false);

    this.blogService.getBlogPost(slug).subscribe({
      next: (post) => {
        this.rawMeta.set(post);
        // loading.set(false) is handled in the effect after content renders
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
