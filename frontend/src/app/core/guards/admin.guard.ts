import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../i18n/i18n.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  // SSR pass-through: On the server side, browser storage is inaccessible.
  // Allow initial render to pass through so the client can evaluate auth state.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authStore = inject(AuthStore);
  const router = inject(Router);
  const i18n = inject(I18nService);
  const lang = i18n.currentLang() || 'zh';

  // Ensure credentials are fully read from localStorage / cookie before guarding
  authStore.ensureLoaded();

  if (authStore.isAuthenticated()) {
    if (authStore.currentUser()?.role === 'admin') {
      return true;
    }
    // Authenticated non-admin user -> redirect to lobby
    return router.parseUrl(`/${lang}/lobby`);
  }

  // Not authenticated -> redirect to login with returnUrl
  return router.parseUrl(`/${lang}/login?returnUrl=${encodeURIComponent(state.url)}`);
};

