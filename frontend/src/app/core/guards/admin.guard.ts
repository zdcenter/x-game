import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated() && authStore.currentUser()?.role === 'admin') {
    return true;
  }

  // Redirect to lobby if not an admin
  return router.parseUrl('/lobby');
};
