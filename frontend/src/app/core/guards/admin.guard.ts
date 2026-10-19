import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../i18n/i18n.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const i18n = inject(I18nService);
  const lang = i18n.currentLang() || 'zh';

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

