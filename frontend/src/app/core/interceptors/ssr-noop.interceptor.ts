import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { isBrowser } from '../utils/browser.util';

/**
 * SSR/SSG No-Op Interceptor
 *
 * During server-side rendering (SSR) or static site generation (SSG), the
 * Angular application runs inside Node.js where relative API URLs (e.g.
 * `/api/v1/...`) are unresolvable.  Any pending HTTP request keeps the
 * application unstable and triggers the infamous
 * "Application did not stabilize within 9 seconds" timeout.
 *
 * This interceptor short-circuits **all** outgoing HTTP requests on the server
 * by returning `EMPTY` (an Observable that completes immediately without
 * emitting).  It must be registered **before** any other interceptors in the
 * `provideHttpClient(withInterceptors([...]))` chain so that nothing
 * downstream even attempts a network call.
 *
 * On the browser side this interceptor is a transparent pass-through.
 */
export const ssrNoopInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBrowser()) {
    // In dev mode (ng serve), Node SSR cannot reliably fetch local relative URLs without an origin server,
    // which causes the "Application did not stabilize within 9 seconds" timeout.
    if (isDevMode()) {
      return EMPTY;
    }
    // During production SSG/prerender, static assets (e.g. /assets/blog/*.json) are served
    // by Angular's prerender server, but we safeguard with a timeout so it never hangs.
    if (req.url.startsWith('/assets/')) {
      return next(req).pipe(
        timeout({ each: 3000, with: () => EMPTY }),
        catchError(() => EMPTY)
      );
    }
    return EMPTY;
  }
  return next(req);
};
