import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (isAuthenticated && user?.role === 'ADMIN') {
    return true;
  }

  if (!isAuthenticated) {
    router.navigate(['/login']);
  } else {
    router.navigate(['/atelier']);
  }
  return false;
};


