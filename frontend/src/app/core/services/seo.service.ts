import { Injectable, inject, effect, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { filter, map, mergeMap } from 'rxjs/operators';

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

  private currentSeoData = signal<SeoData | null>(null);

  constructor() {
    // Reactively update SEO tags when language or route SEO data changes
    effect(() => {
      const seoData = this.currentSeoData();

      // Read default SEO translation strings (this registers language dependency)
      let title = this.i18n.t('seo.default.title')();
      let desc = this.i18n.t('seo.default.desc')();
      let keywords = this.i18n.t('seo.default.keywords')();

      // If route has specific SEO data, override the defaults
      if (seoData) {
        if (seoData.titleKey) {
          const resolvedTitle = this.i18n.t(seoData.titleKey)();
          if (resolvedTitle && resolvedTitle !== seoData.titleKey) title = resolvedTitle;
        }
        if (seoData.descKey) {
          const resolvedDesc = this.i18n.t(seoData.descKey)();
          if (resolvedDesc && resolvedDesc !== seoData.descKey) desc = resolvedDesc;
        }
        if (seoData.keywordsKey) {
          const resolvedKw = this.i18n.t(seoData.keywordsKey)();
          if (resolvedKw && resolvedKw !== seoData.keywordsKey) keywords = resolvedKw;
        }
      }

      // Apply to document
      this.title.setTitle(title);
      this.meta.updateTag({ name: 'description', content: desc });
      this.meta.updateTag({ name: 'keywords', content: keywords });
    });

    // Listen to router navigation to extract SEO data from the active route
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
}
