import { Component, inject, OnInit, signal, SecurityContext, computed, effect, untracked, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { BlogService, BlogPostMeta } from '../../../core/services/blog.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { marked } from 'marked';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

const PROD_ORIGIN = 'https://www.puzzlepk.com';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent],
  template: `
    <div class="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto">
        <a routerLink="/blog" class="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 mb-8 transition-colors">
          <svg class="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          {{ i18n.t('blog.back_to_blog')() }}
        </a>

        @if (loading()) {
          <div class="flex justify-center py-20">
            <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (error()) {
          <div class="text-center py-20 text-red-400">
            <h2 class="text-2xl font-bold mb-2">{{ i18n.t('blog.not_found_title')() }}</h2>
            <p>{{ i18n.t('blog.not_found_desc')() }}</p>
          </div>
        } @else {
          <article class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-6 sm:p-10 shadow-xl">
            <header class="mb-10 border-b border-[var(--color-border-card)] pb-8">
              <div class="flex flex-wrap gap-2 mb-4">
                @for (tag of displayMeta()?.tags; track tag) {
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                    {{ tag }}
                  </span>
                }
              </div>
              <h1 class="text-3xl sm:text-4xl font-black mb-6 leading-tight text-[var(--color-text-main)]">
                {{ displayMeta()?.title }}
              </h1>
              <div class="flex items-center text-sm text-[var(--color-text-muted)] gap-4">
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  {{ displayMeta()?.author }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  {{ rawMeta()?.date }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {{ displayMeta()?.readTime }}
                </span>
              </div>
            </header>

            <div class="prose prose-invert prose-emerald max-w-none" [innerHTML]="contentHtml()">
            </div>
            
            <div class="mt-12 pt-8 border-t border-[var(--color-border-card)] text-center">
              <h3 class="text-xl font-bold mb-4">{{ i18n.t('blog.cta_title')() }}</h3>
              <a routerLink="/lobby" class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
                {{ i18n.t('blog.cta_btn')() }}
              </a>
            </div>
          </article>
        }
      </div>

      <div class="px-4 sm:px-8 max-w-4xl mx-auto w-full mt-16">
        <app-footer></app-footer>
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
      color: var(--color-text-muted);
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
  displayMeta = computed(() => {
    const raw = this.rawMeta();
    if (!raw) return null;
    return this.i18n.currentLang() === 'zh' ? raw.zh : raw.en;
  });

  contentHtml = signal<SafeHtml>('');
  loading = signal(true);
  error = signal(false);
  currentId = signal<string | null>(null);

  constructor() {
    // Re-render content + SEO when language or loaded post changes
    effect(() => {
      const lang = this.i18n.currentLang();
      const meta = this.displayMeta();
      const raw = this.rawMeta();

      if (!meta || !raw) return;

      untracked(async () => {
        // SEO tags
        this.titleService.setTitle(`${meta.title} - Puzzle PK Blog`);
        this.metaService.updateTag({ name: 'description', content: meta.description });
        this.metaService.updateTag({ name: 'keywords', content: meta.keywords });
        this.metaService.updateTag({ property: 'og:title', content: `${meta.title} - Puzzle PK Blog` });
        this.metaService.updateTag({ property: 'og:description', content: meta.description });

        // BlogPosting JSON-LD
        const origin = (typeof window !== 'undefined' && window.location?.origin) || PROD_ORIGIN;
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: meta.title,
          description: meta.description,
          author: { '@type': 'Organization', name: meta.author || 'Puzzle PK Team' },
          publisher: { '@type': 'Organization', name: 'Puzzle PK', logo: { '@type': 'ImageObject', url: `${origin}/assets/icons/icon-192x192.png` } },
          datePublished: raw.date,
          dateModified: raw.date,
          url: `${origin}/${lang}/blog/${raw.id}`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${origin}/${lang}/blog/${raw.id}` },
          keywords: meta.keywords,
          image: `${origin}/og-cover.png`,
          inLanguage: lang === 'zh' ? 'zh-CN' : 'en-US',
        });

        // Render markdown (content already available in meta.content from API)
        const markdownStr = meta.content ?? '';
        const rawHtml = await marked.parse(markdownStr);
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
      }
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
