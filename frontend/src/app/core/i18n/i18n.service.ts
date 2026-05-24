import { Injectable, signal, computed, Signal } from '@angular/core';
import { TRANSLATIONS, Lang } from './translations';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  // Store current language in a Signal, try to load from localStorage first
  private readonly defaultLang: Lang = (localStorage.getItem('lang') as Lang) || 'zh';
  readonly currentLang = signal<Lang>(this.defaultLang);

  // Expose the current translation dictionary as a computed signal
  private readonly dict = computed(() => TRANSLATIONS[this.currentLang()]);

  setLang(lang: Lang) {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
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
