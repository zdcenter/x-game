import { HttpInterceptorFn } from '@angular/common/http';
import { EMPTY } from 'rxjs';
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
    // Static assets (e.g. /assets/blog/*.json) are served by Angular's prerender
    // server and must go through — only block dynamic API calls.
    if (req.url.startsWith('/assets/')) {
      return next(req);
    }
    return EMPTY;
  }
  return next(req);
};
