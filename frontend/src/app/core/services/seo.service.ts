import { Injectable, inject, effect, signal, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { filter, map, mergeMap } from 'rxjs/operators';
import { getOrigin, getHref, isBrowser } from '../utils/browser.util';

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

  private currentSeoData = signal<SeoData | null>(null);

  constructor() {
    // Reactively update SEO tags when language or route SEO data changes
    effect(() => {
      const seoData = this.currentSeoData();

      // Read default SEO translation strings (this registers language dependency)
      let pageTitle = this.i18n.t('seo.default.title')();
      let desc = this.i18n.t('seo.default.desc')();
      let keywords = this.i18n.t('seo.default.keywords')();

      // If route has specific SEO data, override the defaults
      if (seoData) {
        if (seoData.titleKey) {
          const resolved = this.i18n.t(seoData.titleKey)();
          if (resolved && resolved !== seoData.titleKey) pageTitle = resolved;
        }
        if (seoData.descKey) {
          const resolved = this.i18n.t(seoData.descKey)();
          if (resolved && resolved !== seoData.descKey) desc = resolved;
        }
        if (seoData.keywordsKey) {
          const resolved = this.i18n.t(seoData.keywordsKey)();
          if (resolved && resolved !== seoData.keywordsKey) keywords = resolved;
        }
      }

      // --- Derive origin / URL (always absolute, even in SSR) ---
      const origin = getOrigin() || PROD_ORIGIN;
      const lang = this.i18n.currentLang();
      const routePath = this.router.url.split('?')[0]; // e.g. /games/minesweeper
      const canonicalUrl = `${origin}/${lang}${routePath}`;
      const altLang = lang === 'en' ? 'zh' : 'en';
      const altUrl = `${origin}/${altLang}${routePath}`;
      const defaultUrl = `${origin}/en${routePath}`;

      // --- og:image: always use PNG (social platforms don't support SVG) ---
      const fullImageUrl = `${origin}/assets/icons/icon-512x512.png`;

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
      this.meta.updateTag({ property: 'og:site_name', content: 'Puzzle PK' });
      this.meta.updateTag({ property: 'og:locale', content: lang === 'zh' ? 'zh_CN' : 'en_US' });

      // Twitter Card
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
      this.meta.updateTag({ name: 'twitter:description', content: desc });
      this.meta.updateTag({ name: 'twitter:image', content: fullImageUrl });

      // ===== Canonical + hreflang <link> tags =====
      this.setLinkTag('canonical', canonicalUrl);
      this.setLinkTag('alternate', canonicalUrl, lang);
      this.setLinkTag('alternate', altUrl, altLang);
      this.setLinkTag('alternate', defaultUrl, 'x-default');

      // ===== JSON-LD Structured Data (for game pages) =====
      const gameMatch = routePath.match(/^\/games\/([a-zA-Z0-9_-]+)/);
      if (gameMatch) {
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
          'inLanguage': lang === 'zh' ? 'zh-CN' : 'en-US'
        });
      } else {
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'Puzzle PK',
          'url': origin,
          'description': desc,
          'inLanguage': ['en', 'zh-CN'],
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${origin}/lobby`,
            'query-input': 'required name=search_term_string'
          }
        });
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
      this.currentSeoData.set(data['seo'] || null);
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
   */
  private setJsonLd(data: Record<string, any>): void {
    const head = this.doc.head;
    if (!head) return;

    const id = 'seo-jsonld';
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
