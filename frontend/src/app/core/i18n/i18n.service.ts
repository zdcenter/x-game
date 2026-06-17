import { Injectable, inject, computed, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

export type Lang = 'en' | 'zh';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private transloco = inject(TranslocoService);
  private router = inject(Router);

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
    const base = currentUrl.replace(/^\/(en|zh)/, '');
    this.router.navigateByUrl('/' + lang + (base || '/lobby'));
  }

  toggleLang() {
    this.setLang(this.currentLang() === 'en' ? 'zh' : 'en');
  }
}
