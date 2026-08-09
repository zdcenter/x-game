import { Injectable, inject, computed, Signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

export type Lang = 'en' | 'zh' | 'es' | 'ja' | 'ko' | 'pt' | 'fr' | 'de';

export const SUPPORTED_LANGS: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

@Injectable({ providedIn: 'root' })
export class I18nService {
  private transloco = inject(TranslocoService);
  private router = inject(Router);
  private doc = inject(DOCUMENT);

  constructor() {
    effect(() => {
      this.doc.documentElement.lang = this.currentLang();
    });
  }

  // Reactive lang signal — updates when TranslocoService lang changes
  readonly currentLang = toSignal(
    this.transloco.langChanges$,
    { initialValue: this.transloco.getActiveLang() as Lang }
  ) as Signal<Lang>;

  t(key: string, params?: Record<string, unknown>): Signal<string> {
    return computed(() => {
      const lang = this.currentLang(); // reactive dependency
      return this.transloco.translate(key, params ?? {}, lang) || key;
    });
  }

  setLang(lang: Lang) {
    if (this.currentLang() === lang) return;
    const currentUrl = this.router.url;
    // Strip any existing language prefix dynamically based on SUPPORTED_LANGS codes
    const langPattern = SUPPORTED_LANGS.map(l => l.code).join('|');
    const regex = new RegExp(`^\\/(${langPattern})`);
    const base = currentUrl.replace(regex, '');
    this.router.navigateByUrl('/' + lang + (base || '/lobby'));
  }
}
