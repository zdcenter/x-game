import { Injectable, signal, computed, Signal, Inject, LOCALE_ID } from '@angular/core';
import { TRANSLATIONS, Lang } from './translations';

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
      localStorage.setItem('lang_preference', lang);
      // Hard redirect to the localized URL prefix
      const basePath = window.location.pathname.replace(/^\/(zh|en)/, '');
      window.location.href = `/${lang}${basePath}${window.location.search}`;
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
