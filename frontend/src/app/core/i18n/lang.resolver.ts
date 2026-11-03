import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Lang, SUPPORTED_LANGS } from './i18n.service';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const langResolver: ResolveFn<Lang> = async (route) => {
  // Works for both { path: ':lang', ... } and literal { path: 'en', ... } / { path: 'zh', ... }
  const lang = (route.paramMap.get('lang') ?? route.url[0]?.path ?? 'zh') as Lang;
  const transloco = inject(TranslocoService);
  const validLangs = SUPPORTED_LANGS.map(l => l.code);
  const activeLang: Lang = validLangs.includes(lang) ? lang : 'zh';

  // 核心：在 SSR / 预渲染阶段，必须等待语言包完全加载进内存，严禁提前渲染导致组件输出未翻译的 key
  try {
    await firstValueFrom(transloco.load(activeLang).pipe(catchError(() => of(null))));
  } catch {}

  transloco.setActiveLang(activeLang);
  return activeLang;
};
