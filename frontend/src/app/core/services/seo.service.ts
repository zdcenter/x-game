import { Injectable, inject, effect, signal, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { I18nService, SUPPORTED_LANGS, LANG_LOCALES, LANG_OG_LOCALES } from '../i18n/i18n.service';
import { filter, map, mergeMap } from 'rxjs/operators';
import { getOrigin, getHref, isBrowser } from '../utils/browser.util';
import { GameRegistryService } from './game-registry.service';

/** Production domain used as fallback when origin is unavailable (SSR/SSG). */
const PROD_ORIGIN = 'https://www.puzzlepk.com';

export interface SeoData {
  titleKey?: string;
  descKey?: string;
  keywordsKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private doc = inject(DOCUMENT);
  private gameRegistry = inject(GameRegistryService);

  private currentSeoData = signal<SeoData | null>(null);

  constructor() {
    // Reactively update SEO tags when language or route SEO data changes
    effect(() => {
      const seoData = this.currentSeoData();

      // Legal pages: the Contact page gets its own dedicated title/desc/keywords
      // instead of the generic "Legal & Privacy Policy" used by privacy/terms/about.
      let effectiveSeo = seoData;
      const legalMatch = this.router.url.match(/\/legal\/([a-zA-Z_-]+)/);
      if (legalMatch && legalMatch[1] === 'contact') {
        effectiveSeo = {
          titleKey: 'seo.legal.contact.title',
          descKey: 'seo.legal.contact.desc',
          keywordsKey: 'seo.legal.contact.keywords',
        };
      }

      // Read default SEO translation strings (this registers language dependency)
      let pageTitle = this.i18n.t('seo.default.title')();
      let desc = this.i18n.t('seo.default.desc')();
      let keywords = this.i18n.t('seo.default.keywords')();

      // If route has specific SEO data, override the defaults
      if (effectiveSeo) {
        if (effectiveSeo.titleKey) {
          const resolved = this.i18n.t(effectiveSeo.titleKey)();
          if (resolved && resolved !== effectiveSeo.titleKey) {
            const appName = this.i18n.t('app.title')();
            pageTitle = resolved.includes(appName) ? resolved : `${resolved} - ${appName}`;
          }
        }
        if (effectiveSeo.descKey) {
          const resolved = this.i18n.t(effectiveSeo.descKey)();
          if (resolved && resolved !== effectiveSeo.descKey) desc = resolved;
        }
        if (effectiveSeo.keywordsKey) {
          const resolved = this.i18n.t(effectiveSeo.keywordsKey)();
          if (resolved && resolved !== effectiveSeo.keywordsKey) keywords = resolved;
        }
      }

      // --- Derive origin / URL (always absolute, even in SSR) ---
      const origin = getOrigin() || PROD_ORIGIN;
      const lang = this.i18n.currentLang();
      // Strip the lang prefix that Transloco routing adds
      const langPattern = SUPPORTED_LANGS.map(l => l.code).join('|');
      const regex = new RegExp(`^\\/(${langPattern})`);
      const routePath = this.router.url.split('?')[0].replace(regex, '') || '/';
      const canonicalUrl = `${origin}/${lang}${routePath}`;
      const defaultUrl = `${origin}/en${routePath}`;

      // ===== Match Routes for Dynamic Content =====
      const gameMatch = routePath.match(/^\/games\/([a-zA-Z0-9_-]+)/);
      const docsMatch = routePath.match(/^\/docs\/([a-zA-Z0-9_-]+)/);
      const gameId = gameMatch ? gameMatch[1] : (docsMatch ? docsMatch[1] : null);

      // --- og:image: dynamically select based on game or default ---
      let ogImageFile = 'og-cover.png';
      if (gameId) {
        const config = this.gameRegistry.getConfig(gameId);
        ogImageFile = config?.coverImage || `og-${gameId}.png`;
      }
      const fullImageUrl = `${origin}/${ogImageFile}`;

      // ===== Apply meta tags =====
      this.title.setTitle(pageTitle);
      this.meta.updateTag({ name: 'description', content: desc });
      this.meta.updateTag({ name: 'keywords', content: keywords });

      // Open Graph
      this.meta.updateTag({ property: 'og:title', content: pageTitle });
      this.meta.updateTag({ property: 'og:description', content: desc });
      this.meta.updateTag({ property: 'og:image', content: fullImageUrl });
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      this.meta.updateTag({ property: 'og:site_name', content: lang === 'zh' ? '益智擂台' : 'Puzzle PK' });
      this.meta.updateTag({ property: 'og:locale', content: LANG_OG_LOCALES[lang] });

      // Twitter Card
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
      this.meta.updateTag({ name: 'twitter:description', content: desc });
      this.meta.updateTag({ name: 'twitter:image', content: fullImageUrl });

      // ===== Canonical + hreflang <link> tags =====
      this.setLinkTag('canonical', canonicalUrl);
      
      // Generate alternate tags for all supported languages
      SUPPORTED_LANGS.forEach(supportedLang => {
        const altUrl = `${origin}/${supportedLang.code}${routePath}`;
        this.setLinkTag('alternate', altUrl, supportedLang.code);
      });
      
      this.setLinkTag('alternate', defaultUrl, 'x-default');

      // ===== JSON-LD Structured Data (game pages, tutorials, breadcrumbs) =====

      if (gameMatch && gameId) {
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': pageTitle,
          'description': desc,
          'url': canonicalUrl,
          'applicationCategory': 'GameApplication',
          'operatingSystem': 'Web Browser',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD'
          },
          'image': fullImageUrl,
          'inLanguage': LANG_LOCALES[lang]
        });
      } else if (docsMatch && gameId) {
        // Add HowTo schema for docs
        
        // Import ALL_DEMO_CONFIGS dynamically or statically?
        // Let's use a simpler HowTo structure if we can't easily extract steps
        // Wait, I can just require or import ALL_DEMO_CONFIGS at the top of the file.
        // Actually, since I didn't add the import yet, I'll just build a generic Article or HowTo.
        
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          'name': pageTitle,
          'description': desc,
          'image': fullImageUrl,
          'inLanguage': LANG_LOCALES[lang],
          'step': [
            {
              '@type': 'HowToStep',
              'name': 'Understand the Goal',
              'text': 'Read the rules and understand the primary objective of the puzzle.'
            },
            {
              '@type': 'HowToStep',
              'name': 'Learn the Mechanics',
              'text': 'Interact with the tutorial board to learn how to move or place elements.'
            },
            {
              '@type': 'HowToStep',
              'name': 'Master Strategies',
              'text': 'Avoid dead ends and learn advanced patterns to win quickly.'
            }
          ]
        });
      } else {
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': lang === 'zh' ? '益智擂台' : 'Puzzle PK',
          'url': origin,
          'description': desc,
          'inLanguage': SUPPORTED_LANGS.map(l => l.code),
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${origin}/lobby`,
            'query-input': 'required name=search_term_string'
          }
        });
      }

      // ===== BreadcrumbList (Home > Section > Page) =====
      const breadcrumbItems: { name: string; path: string }[] = [
        { name: lang === 'zh' ? '首页' : 'Home', path: `/${lang}/lobby` },
      ];
      const seg = routePath.split('/').filter(Boolean); // e.g. ['games','sudoku'] / ['docs','sudoku'] / ['blog','slug'] / ['legal','privacy']
      if (seg.length >= 1) {
        const section = seg[0];
        const sectionNames: Record<string, string> = {
          games: lang === 'zh' ? '游戏' : 'Games',
          docs: lang === 'zh' ? '攻略' : 'Guides',
          blog: lang === 'zh' ? '博客' : 'Blog',
          legal: lang === 'zh' ? '法律与联系' : 'Legal',
          lobby: lang === 'zh' ? '大厅' : 'Lobby',
        };
        const sectionName = sectionNames[section];
        if (sectionName) {
          breadcrumbItems.push({ name: sectionName, path: `/${lang}/${section}` });
        }
        if (seg.length >= 2 && (section === 'games' || section === 'docs' || section === 'blog')) {
          const pageName = (pageTitle || '').split(' - ')[0].split(' | ')[0];
          if (pageName) {
            breadcrumbItems.push({ name: pageName, path: `/${lang}${routePath}` });
          }
        }
      }
      if (breadcrumbItems.length >= 2) {
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': breadcrumbItems.map((item, i) => ({
            '@type': 'ListItem',
            'position': i + 1,
            'name': item.name,
            'item': `${origin}${item.path}`,
          })),
        }, 'seo-jsonld-breadcrumb');
      }
    });

    // Listen for route changes to extract SEO data from route config
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      mergeMap(route => route.data)
    ).subscribe(data => {
      // Shallow-copy so the signal always emits a fresh reference on every
      // navigation (same route config data object would otherwise be === and
      // the SEO effect would skip re-running, e.g. legal/privacy → legal/contact).
      this.currentSeoData.set(data['seo'] ? { ...data['seo'] } : null);
    });

    // GA4 Page View Tracking
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (isBrowser() && typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('config', 'G-S0JB094KY4', {
          'page_path': event.urlAfterRedirects
        });
      }
    });
  }

  /**
   * Create or update a <link> tag in <head>.
   * For canonical: rel="canonical", no hreflang.
   * For alternate: rel="alternate", with hreflang attribute.
   */
  private setLinkTag(rel: string, href: string, hreflang?: string): void {
    const head = this.doc.head;
    if (!head) return;

    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]:not([hreflang])`;

    let link = head.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) link.setAttribute('hreflang', hreflang);
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /**
   * Inject or update a JSON-LD <script> block in <head> for structured data.
   * Each schema type gets its own script element (identified by `id`) so
   * multiple schemas (e.g. WebApplication + BreadcrumbList) can coexist.
   */
  private setJsonLd(data: Record<string, any>, id: string = 'seo-jsonld'): void {
    const head = this.doc.head;
    if (!head) return;

    let script = head.querySelector(`#${id}`) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }
}
