import { Injectable } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';

import enTranslations from '../../../assets/i18n/en.json';
import zhTranslations from '../../../assets/i18n/zh.json';
import esTranslations from '../../../assets/i18n/es.json';
import jaTranslations from '../../../assets/i18n/ja.json';
import koTranslations from '../../../assets/i18n/ko.json';
import ptTranslations from '../../../assets/i18n/pt.json';
import frTranslations from '../../../assets/i18n/fr.json';
import deTranslations from '../../../assets/i18n/de.json';

const INLINE_TRANSLATIONS: Record<string, Translation> = {
  en: enTranslations as Translation,
  zh: zhTranslations as Translation,
  es: esTranslations as Translation,
  ja: jaTranslations as Translation,
  ko: koTranslations as Translation,
  pt: ptTranslations as Translation,
  fr: frTranslations as Translation,
  de: deTranslations as Translation,
};

@Injectable({ providedIn: 'root' })
export class InlineTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(INLINE_TRANSLATIONS[lang] ?? {});
  }
}
