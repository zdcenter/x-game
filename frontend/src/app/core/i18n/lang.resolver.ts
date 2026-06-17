import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

export type Lang = 'en' | 'zh';
const VALID_LANGS: Lang[] = ['en', 'zh'];

export const langResolver: ResolveFn<Lang> = (route) => {
  // Works for both { path: ':lang', ... } and literal { path: 'en', ... } / { path: 'zh', ... }
  const lang = (route.paramMap.get('lang') ?? route.url[0]?.path ?? 'zh') as Lang;
  const transloco = inject(TranslocoService);
  const activeLang: Lang = VALID_LANGS.includes(lang) ? lang : 'zh';
  if (transloco.getActiveLang() !== activeLang) {
    transloco.setActiveLang(activeLang);
  }
  return activeLang;
};
