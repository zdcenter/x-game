import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  isDevMode,
  ErrorHandler,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ssrNoopInterceptor } from './core/interceptors/ssr-noop.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { getSearch, getHref, buildUrl } from './core/utils/browser.util';

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
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([ssrNoopInterceptor, authInterceptor]), withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideClientHydration(withEventReplay()),
  ],
};
