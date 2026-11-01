import { Injectable } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { Observable, from, of } from 'rxjs';

const DYNAMIC_LOADERS: Record<string, () => Promise<{ default: Translation }>> = {
  en: () => import('../../../assets/i18n/en.json'),
  zh: () => import('../../../assets/i18n/zh.json'),
  es: () => import('../../../assets/i18n/es.json'),
  ja: () => import('../../../assets/i18n/ja.json'),
  ko: () => import('../../../assets/i18n/ko.json'),
  pt: () => import('../../../assets/i18n/pt.json'),
  fr: () => import('../../../assets/i18n/fr.json'),
  de: () => import('../../../assets/i18n/de.json'),
};

@Injectable({ providedIn: 'root' })
export class InlineTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const loader = DYNAMIC_LOADERS[lang];
    if (!loader) {
      return of({});
    }
    return from(loader().then(m => m.default as Translation));
  }
}
