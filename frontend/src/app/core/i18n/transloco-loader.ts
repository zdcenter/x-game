import { Injectable } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';

import enTranslations from '../../../assets/i18n/en.json';
import zhTranslations from '../../../assets/i18n/zh.json';

const INLINE_TRANSLATIONS: Record<string, Translation> = {
  en: enTranslations as Translation,
  zh: zhTranslations as Translation,
};

@Injectable({ providedIn: 'root' })
export class InlineTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(INLINE_TRANSLATIONS[lang] ?? {});
  }
}
