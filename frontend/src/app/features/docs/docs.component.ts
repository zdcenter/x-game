import { Component, inject, signal, computed, effect, ElementRef, ViewChild, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameService, GameDoc, getLocalizedField } from '../../core/services/game.service';
import { marked } from 'marked';
import { getOrigin } from '../../core/utils/browser.util';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { GameStepPlayerComponent } from './components/game-step-player/game-step-player.component';
import { ALL_DEMO_CONFIGS } from './data/demo-configs';
import { SlidingTutorialComponent } from '../games/sliding/components/sliding-tutorial/sliding-tutorial.component';
import { SokobanTutorialComponent } from '../games/sokoban/components/sokoban-tutorial/sokoban-tutorial.component';

const PROD_ORIGIN = 'https://www.puzzlepk.com';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule, RouterLink, GameStepPlayerComponent, SlidingTutorialComponent, SokobanTutorialComponent],
  template: `
    <div class="flex h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] overflow-hidden">
      
      <!-- Mobile Sidebar Overlay -->
      @if (isMobileMenuOpen()) {
        <div class="fixed inset-0 bg-black/50 z-40 lg:hidden" (click)="isMobileMenuOpen.set(false)"></div>
      }

      <!-- Left Sidebar (Navigation) -->
      <aside class="fixed inset-y-0 left-0 pt-16 lg:pt-0 lg:static z-50 w-64 h-full bg-[var(--color-bg-card)] border-r border-[var(--color-border-card)] transform transition-transform duration-300 ease-in-out lg:translate-x-0"
             [class.-translate-x-full]="!isMobileMenuOpen()"
             [class.translate-x-0]="isMobileMenuOpen()">
        <div class="h-full overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
          <div class="px-3 pb-4 mb-2 border-b border-[var(--color-border-card)] flex items-center justify-between">
            <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
              {{ i18n.t('docs.title')() || 'Game Tutorials' }}
            </h2>
            <button class="lg:hidden p-1 text-[var(--color-text-muted)]" (click)="isMobileMenuOpen.set(false)">✕</button>
          </div>
          
          @for (game of games(); track game.id; let idx = $index) {
            <a [routerLink]="['/', i18n.currentLang(), 'docs', game.id]"
               (click)="isMobileMenuOpen.set(false)"
               class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3"
               [class.bg-[var(--color-bg-main)]]="currentGameId() === game.id"
               [class.text-[var(--color-accent-from)]]="currentGameId() === game.id"
               [class.text-[var(--color-text-secondary)]]="currentGameId() !== game.id"
               [class.hover:bg-[var(--color-border-card)]]="currentGameId() !== game.id">
               <span class="w-6 h-6 rounded bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center text-xs opacity-70">
                 {{ idx + 1 }}
               </span>
               <span class="truncate">{{ getGameTitle(game.id) }}</span>
            </a>
          }
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 h-full overflow-y-auto custom-scrollbar relative bg-[var(--color-bg-main)] scroll-smooth" #scrollContainer>
        <!-- Mobile Header (Hamburger) -->
        <div class="lg:hidden sticky top-0 z-30 bg-[var(--color-bg-card)]/80 backdrop-blur-md border-b border-[var(--color-border-card)] px-4 py-3 flex items-center gap-3">
          <button (click)="isMobileMenuOpen.set(true)" class="p-1 text-[var(--color-text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span class="font-bold text-[var(--color-text-primary)] truncate">{{ currentGame() ? getGameTitle(currentGame()!.id) : 'Tutorials' }}</span>
        </div>

        <div class="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-12 flex flex-col xl:flex-row gap-12">
          
          <!-- Article Content -->
          <article class="flex-1 min-w-0">
            @if (currentGame()) {
              <div class="mb-8 border-b border-[var(--color-border-card)] pb-6">
                <h1 class="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text mb-4"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                  {{ getGameTitle(currentGame()!.id) }}
                </h1>
                <p class="text-[var(--color-text-secondary)] text-lg">
                  {{ getGameDesc(currentGame()!.id) }}
                </p>
              </div>

              <!-- Advanced Interactive Tutorial for Sliding Puzzle -->
              @if (currentGameId() === 'sliding') {
                <div class="mt-12 mb-8">
                  <h2 class="text-2xl font-bold text-[var(--color-text-primary)] mb-6 scroll-mt-20" id="advanced-tutorial">{{ i18n.t('docs.sliding_advanced_tutorial')() || '进阶攻略演示：快速复原秘籍' }}</h2>
                  <div class="relative w-full max-w-md mx-auto">
                    <app-sliding-tutorial [inline]="true"></app-sliding-tutorial>
                  </div>
                </div>
              }

              <!-- Advanced Interactive Tutorial for Sokoban -->
              @if (currentGameId() === 'sokoban') {
                <div class="mt-12 mb-8">
                  <h2 class="text-2xl font-bold text-[var(--color-text-primary)] mb-6 scroll-mt-20" id="advanced-tutorial">{{ i18n.t('docs.sokoban_advanced_tutorial')() || '推箱子真实演示' }}</h2>
                  <div class="relative w-full max-w-md mx-auto">
                    <app-sokoban-tutorial [inline]="true"></app-sokoban-tutorial>
                  </div>
                </div>
              } @else if (hasDemoConfig(currentGameId()) && currentGameId() !== 'sliding') {
                <!-- Standard Game Step Player for other games -->
                <div class="mt-12 mb-8">
                  <h2 class="text-2xl font-bold text-[var(--color-text-primary)] mb-6 scroll-mt-20" id="visual-guide">{{ i18n.t('docs.visual_guide')() || '图文教程' }}</h2>
                  <app-game-step-player [config]="getDemoConfig(currentGameId())"></app-game-step-player>
                </div>
              }

              <div class="prose prose-invert prose-lg max-w-none
                          [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:scroll-mt-20
                          [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:scroll-mt-20
                          [&_p]:text-[var(--color-text-secondary)] [&_p]:mb-4 [&_p]:leading-relaxed
                          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:text-[var(--color-text-secondary)] [&_li]:mb-2
                          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:text-[var(--color-text-secondary)] [&_li]:mb-2
                          [&_strong]:text-[var(--color-text-primary)] [&_strong]:font-semibold
                          [&_code]:bg-[var(--color-bg-card)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:border [&_code]:border-[var(--color-border-card)]
                          [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-accent-from)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-muted)]"
                   [innerHTML]="parsedContent()">
              </div>
              
              <!-- CTA Button Section -->
              <div class="mt-16 mb-8 pt-10 border-t border-[var(--color-border-card)] text-center">
                <h3 class="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">
                  {{ i18n.t('blog.cta_title')() || '准备好挑战您的大脑了吗？' }}
                </h3>
                <a [routerLink]="['/', i18n.currentLang(), 'games', currentGameId()]" 
                   class="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                  {{ i18n.t('blog.cta_btn')() || '立即畅玩益智游戏' }}
                </a>
              </div>
            } @else {
              <div class="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                Loading documentation...
              </div>
            }
          </article>

          <!-- Right Sidebar (Table of Contents) -->
          @if (toc().length > 0) {
            <aside class="hidden xl:block w-64 shrink-0">
              <div class="sticky top-8">
                <h4 class="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
                  {{ i18n.t('docs.toc')() || 'On this page' }}
                </h4>
                <ul class="space-y-2 text-sm border-l border-[var(--color-border-card)]">
                  @for (item of toc(); track item.id) {
                    <li>
                      <a [href]="'#'+item.id" 
                         (click)="scrollToId($event, item.id)"
                         class="block py-1 hover:text-[var(--color-accent-from)] transition-colors text-[var(--color-text-secondary)]"
                         [ngClass]="{'pl-4': item.level === 2, 'pl-8 text-xs': item.level === 3}">
                        {{ item.text }}
                      </a>
                    </li>
                  }
                </ul>
              </div>
            </aside>
          }

        </div>
        
        <div class="px-4 sm:px-8 max-w-5xl mx-auto">
          
        </div>
      </main>

    </div>
  `
})
export class DocsComponent {
  i18n = inject(I18nService);
  private gameService = inject(GameService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  private sanitizer = inject(DomSanitizer);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private doc = inject(DOCUMENT);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  games = signal<GameDoc[]>([]);
  currentGameId = signal<string>('');
  isMobileMenuOpen = signal(false);

  currentGame = computed(() => {
    return this.games().find(g => g.id === this.currentGameId()) || null;
  });

  // Rendered HTML
  parsedContent = signal<SafeHtml>('');
  
  // Table of Contents
  toc = signal<TocItem[]>([]);

  constructor() {
    this.gameService.getAllGamesDocs().subscribe(games => {
      // Sort games by sortOrder
      const sorted = [...games].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      this.games.set(sorted);
      
      // If no gameId in route, redirect to the first game
      // Use snapshot to avoid SSR synchronous observable race conditions
      const urlGameId = this.route.snapshot.data['gameId'];
      if (!urlGameId && sorted.length > 0) {
        this.router.navigate(['/', this.i18n.currentLang(), 'docs', sorted[0].id], { replaceUrl: true });
      }
    });

    this.route.data.subscribe(data => {
      const id = data['gameId'];
      if (id) {
        this.currentGameId.set(id);
      }
    });

    // Re-render content + update SEO when current game or language changes
    effect(() => {
      const game = this.currentGame();
      const lang = this.i18n.currentLang();
      if (game) {
        const md = getLocalizedField(game.rules, lang);
        this.renderMarkdown(md);

        // Per-page SEO: unique title/description/canonical for each game docs page
        const gameTitle = this.getGameTitle(game.id);
        const gameDesc = this.getGameDesc(game.id);
        const pageTitle = lang === 'zh'
          ? `${gameTitle} 玩法教程与规则攻略 - ${this.i18n.t('app.title')()}`
          : `How to Play ${gameTitle} - Rules & Advanced Tutorial | ${this.i18n.t('app.title')()}`;
        const desc = gameDesc || (lang === 'zh'
          ? `全面学习如何游玩 ${gameTitle}，查看详细的规则说明、进阶高分策略与保姆级通关教程。`
          : `Learn how to play ${gameTitle}. Read the comprehensive rules, advanced strategies, and step-by-step visual tutorials.`);
        const origin = getOrigin() || PROD_ORIGIN;
        const canonicalUrl = `${origin}/${lang}/docs/${game.id}`;
        const altLang = lang === 'en' ? 'zh' : 'en';
        const altUrl = `${origin}/${altLang}/docs/${game.id}`;

        this.titleService.setTitle(pageTitle);
        this.metaService.updateTag({ name: 'description', content: desc });
        this.metaService.updateTag({ property: 'og:title', content: pageTitle });
        this.metaService.updateTag({ property: 'og:description', content: desc });
        this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });

        this.setLinkTag('canonical', canonicalUrl);
        this.setLinkTag('alternate', canonicalUrl, lang);
        this.setLinkTag('alternate', altUrl, altLang);
        this.setLinkTag('alternate', `${origin}/en/docs/${game.id}`, 'x-default');
      }
    });
  }

  getGameTitle(id: string): string {
    const config = this.gameRegistry.getConfig(id);
    
    // First try docs-specific title, then fall back to config
    const docsTitleKey = `seo.docs.${id}.title`;
    const docsTitle = this.i18n.t(docsTitleKey)();
    if (docsTitle !== docsTitleKey) {
      return docsTitle;
    }
    
    if (config && config.titleKey) {
      return this.i18n.t(config.titleKey)();
    }
    
    // Fallback
    const fallbackKey = `lobby.${id}`;
    let title = this.i18n.t(fallbackKey)();
    if (title === fallbackKey) {
      title = id.charAt(0).toUpperCase() + id.slice(1);
    }
    return title;
  }

  getGameDesc(id: string): string {
    // Try docs specific SEO key first
    const docsSeoKey = `seo.docs.${id}.desc`;
    let desc = this.i18n.t(docsSeoKey)();
    if (desc !== docsSeoKey) return desc;

    // Return empty so the default docs description template is used
    // This prevents identical meta descriptions between /games/X and /docs/X
    return '';
  }

  hasDemoConfig(id: string): boolean {
    return !!ALL_DEMO_CONFIGS[id];
  }

  getDemoConfig(id: string) {
    return ALL_DEMO_CONFIGS[id];
  }

  private setLinkTag(rel: string, href: string, hreflang?: string): void {
    const head = this.doc.head;
    if (!head) return;
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
    let link = head.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) link.setAttribute('hreflang', hreflang);
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private renderMarkdown(md: string) {
    // 1. Generate HTML using marked
    const rawHtml = marked.parse(md, { async: false }) as string;
    
    // 2. Extract TOC and inject IDs into headings
    const tocItems: TocItem[] = [];
    let idCounter = 0;
    
    const htmlWithIds = rawHtml.replace(/<h([23])>(.*?)<\/h\1>/g, (_match, levelStr, text) => {
      const level = parseInt(levelStr, 10);
      const id = `heading-${idCounter++}`;
      // Clean up text (remove internal HTML tags if any)
      const plainText = text.replace(/<[^>]+>/g, '').trim();
      tocItems.push({ id, text: plainText, level });
      return `<h${level} id="${id}">${text}</h${level}>`;
    });

    this.toc.set(tocItems);
    this.parsedContent.set(this.sanitizer.bypassSecurityTrustHtml(htmlWithIds));

    // Reset scroll
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
  }

  scrollToId(event: Event, id: string) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el && this.scrollContainer?.nativeElement) {
      // Calculate position relative to container
      const container = this.scrollContainer.nativeElement;
      const topPos = el.offsetTop - 20; // 20px padding
      container.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  }
}
