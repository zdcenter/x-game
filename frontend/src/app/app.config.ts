import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  isDevMode,
  ErrorHandler,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules, UrlSerializer } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ssrNoopInterceptor } from './core/interceptors/ssr-noop.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { getSearch, getHref, buildUrl } from './core/utils/browser.util';
import { InlineTranslocoLoader } from './core/i18n/transloco-loader';
import { LangUrlSerializer } from './core/i18n/lang-url-serializer';

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
          window.location.href = newUrl;
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
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: UrlSerializer, useClass: LangUrlSerializer },
    provideClientHydration(withEventReplay()),
    provideTransloco({
      config: {
        availableLangs: ['en', 'zh'],
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
        return () => transloco.load('zh').toPromise().then(() => transloco.load('en').toPromise());
      },
      multi: true,
    },
  ],
};
