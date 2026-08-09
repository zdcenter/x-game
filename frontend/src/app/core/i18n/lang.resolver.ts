import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Lang, SUPPORTED_LANGS } from './i18n.service';

export const langResolver: ResolveFn<Lang> = (route) => {
  // Works for both { path: ':lang', ... } and literal { path: 'en', ... } / { path: 'zh', ... }
  const lang = (route.paramMap.get('lang') ?? route.url[0]?.path ?? 'zh') as Lang;
  const transloco = inject(TranslocoService);
  const validLangs = SUPPORTED_LANGS.map(l => l.code);
  const activeLang: Lang = validLangs.includes(lang) ? lang : 'zh';
  if (transloco.getActiveLang() !== activeLang) {
    transloco.setActiveLang(activeLang);
  }
  return activeLang;
};
