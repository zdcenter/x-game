import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  // Automatically register as guest if not authenticated
  return authService.guestLogin().pipe(
    map(res => {
      if (res.token && res.user) {
        authStore.setCredentials(res.token, res.user);
        return true;
      }
      return router.parseUrl('/login');
    }),
    catchError(() => {
      return of(router.parseUrl('/login'));
    })
  );
};
