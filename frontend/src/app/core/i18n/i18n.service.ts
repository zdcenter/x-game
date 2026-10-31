import { Injectable, inject, computed, Signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

export type Lang = 'en' | 'zh' | 'es' | 'ja' | 'ko' | 'pt' | 'fr' | 'de';

export const ALL_SUPPORTED_LANGS: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

/**
 * 集中语言控制开关 (AdSense 审核合规模式)
 * 审核期间锁定为 ['en', 'zh']，消除机器翻译疑虑与跨语种重复内容判定；
 * 审核通过后，可随时将数组扩充为全部 8 门语言一键生效。
 */
export const ACTIVE_LANG_CODES: Lang[] = ['en', 'zh'];

export const SUPPORTED_LANGS: { code: Lang; name: string; flag: string }[] =
  ALL_SUPPORTED_LANGS.filter(l => ACTIVE_LANG_CODES.includes(l.code));

/** schema.org inLanguage value per supported language (BCP-47). */
export const LANG_LOCALES: Record<Lang, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
};

/** Open Graph og:locale value per supported language (underscore form). */
export const LANG_OG_LOCALES: Record<Lang, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  es: 'es_ES',
  ja: 'ja_JP',
  ko: 'ko_KR',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
};

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
      let res = this.transloco.translate(key, params ?? {}, lang) || key;
      if (params && typeof res === 'string' && Object.keys(params).length > 0) {
        for (const [k, v] of Object.entries(params)) {
          res = res.replace(new RegExp(`\\{\\{?\\s*${k}\\s*\\}\\}?`, 'g'), String(v));
        }
      }
      return res;
    });
  }

  hasKey(key: string): boolean {
    const lang = this.currentLang();
    const translations = this.transloco.getTranslation(lang);
    return !!(translations && translations[key]);
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
