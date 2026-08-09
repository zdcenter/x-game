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
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules, UrlSerializer } from '@angular/router';
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
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' }), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([ssrNoopInterceptor, authInterceptor]), withFetch()),
    // Register sw.js (a self-killing SW) so legacy ngsw caches get cleared.
    // Also listen for SW_KILL_ALL message to unregister any remaining SW registrations.
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
          navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data?.type === 'SW_KILL_ALL') {
              navigator.serviceWorker.getRegistrations().then(regs =>
                regs.forEach(reg => reg.unregister())
              );
            }
          });
        }
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
    // Eagerly load all languages before first render — inline loader is synchronous so this is free.
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const transloco = inject(TranslocoService);
        return () => {
          let chain = Promise.resolve();
          for (const lang of SUPPORTED_LANGS) {
            chain = chain.then(() => transloco.load(lang.code).toPromise() as Promise<void>);
          }
          return chain;
        };
      },
      multi: true,
    },
    // Merge DB game metadata (icon/modes/difficulties) into GameRegistryService at startup.
    // Browser-only: SSR/prerender falls back silently to TS seed data.
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const registry = inject(GameRegistryService);
        return () => registry.loadFromDB();
      },
      multi: true,
    },
  ],
};
