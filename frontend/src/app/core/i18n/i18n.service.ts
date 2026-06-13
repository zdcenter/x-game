import { Injectable, signal, computed, Signal, Inject, LOCALE_ID } from '@angular/core';
import { TRANSLATIONS, Lang } from './translations';
import { getPathname, getSearch, replaceState, storageSet } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly currentLang = signal<Lang>('zh');

  constructor(@Inject(LOCALE_ID) private locale: string) {
    const lang = locale.startsWith('en') ? 'en' : 'zh';
    this.currentLang.set(lang);
  }

  // Expose the current translation dictionary as a computed signal
  private readonly dict = computed(() => TRANSLATIONS[this.currentLang()]);

  setLang(lang: Lang) {
    if (this.currentLang() !== lang) {
      storageSet('lang_preference', lang);
      
      // Determine if we are running in a localized build (URL contains /zh/ or /en/ right after host)
      const pathname = getPathname();
      const isLocalizedPath = /^\/(zh|en)(\/|$)/.test(pathname);

      if (isLocalizedPath) {
        // Hard redirect to the localized URL prefix
        const basePath = pathname.replace(/^\/(zh|en)/, '');
        replaceState(`/${lang}${basePath}${getSearch()}`);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        // In local development without URL localization, just update the signal and reload
        // Wait, if we reload, the constructor will read LOCALE_ID ('zh' by default in dev)
        // and overwrite the language! To truly support dev dynamic switching, we shouldn't reload.
        // We just update the signal so the dynamic i18n.t() calls update instantly.
        this.currentLang.set(lang);
      }
    }
  }

  toggleLang() {
    this.setLang(this.currentLang() === 'en' ? 'zh' : 'en');
  }

  // Returns a computed signal for a specific key
  t(key: string): Signal<string> {
    return computed(() => {
      const dictionary = this.dict();
      return dictionary[key] || key; // Fallback to key if not found
    });
  }
}
