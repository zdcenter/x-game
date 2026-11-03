import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  isDevMode,
  ErrorHandler,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { GameRegistryService } from './core/services/game-registry.service';
import { TranslocoService } from '@jsverse/transloco';
import { provideRouter, withInMemoryScrolling, UrlSerializer } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ssrNoopInterceptor } from './core/interceptors/ssr-noop.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { getSearch, getHref, buildUrl } from './core/utils/browser.util';
import { InlineTranslocoLoader } from './core/i18n/transloco-loader';
import { LangUrlSerializer } from './core/i18n/lang-url-serializer';
import { SUPPORTED_LANGS } from './core/i18n/i18n.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error.message ? error.message.toLowerCase() : '';
    if (
      message.includes('loading chunk') ||
      message.includes('expected a javascript module script') ||
      error.name === 'ChunkLoadError'
    ) {
      console.warn('Chunk load error detected, forcing reload for PWA update...', error);
      if (!getSearch().includes('version_update=1')) {
        const newUrl = buildUrl(getHref(), { version_update: '1' });
        if (typeof window !== 'undefined') {
          console.error('Preventing auto-reload loop. The error was:', error);
          // window.location.href = newUrl;
        }
      }
      return;
    }
    console.error('[GlobalErrorHandler]', error?.stack || error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // 移除 withPreloading(PreloadAllModules)，禁止启动时无脑并行下载全站 70+ 游戏组件，彻底消除 4 秒关键路径延迟与主线程脚本解析过载
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([ssrNoopInterceptor, authInterceptor]), withFetch()),
    // Initialize PWA Update & Service Worker management
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const pwa = inject(PwaUpdateService);
        return () => {};
      },
      multi: true,
    },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: UrlSerializer, useClass: LangUrlSerializer },
    provideClientHydration(withEventReplay()),
    provideTransloco({
      config: {
        availableLangs: SUPPORTED_LANGS.map(l => l.code),
        defaultLang: 'zh',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: InlineTranslocoLoader,
    }),
    // 仅按需预加载首屏所需的一门语言，严禁启动时无脑全量并发下载所有语种（每个语种都是 80KB+ JSON 模块）
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const transloco = inject(TranslocoService);
        return () => {
          let initialLang = 'zh';
          if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path.startsWith('/en')) initialLang = 'en';
            else if (path.startsWith('/zh')) initialLang = 'zh';
          }
          return transloco.load(initialLang).toPromise() as Promise<void>;
        };
      },
      multi: true,
    },
    // 后台非阻塞静默同步 DB 游戏元数据，绝不阻塞 APP_INITIALIZER 与首屏首帧（GAME_DEFINITIONS 已有同步种子底本）
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const registry = inject(GameRegistryService);
        return () => {
          if (typeof window !== 'undefined') {
            setTimeout(() => registry.loadFromDB(), 2000);
          }
          return Promise.resolve();
        };
      },
      multi: true,
    },
  ],
};
