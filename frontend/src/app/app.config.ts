import { ApplicationConfig, provideZonelessChangeDetection, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error.message ? error.message.toLowerCase() : '';
    if (
      message.includes('loading chunk') ||
      message.includes('expected a javascript module script') ||
      error.name === 'ChunkLoadError'
    ) {
      console.warn('Chunk load error detected, forcing reload for PWA update...', error);
      if (!window.location.search.includes('version_update=1')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('version_update', '1');
        window.location.href = newUrl.toString();
      }
      return;
    }
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};
