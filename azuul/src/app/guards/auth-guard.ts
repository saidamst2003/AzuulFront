import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: Checking authentication for route:', state.url);
  
  if (authService.isAuthenticated()) {
    console.log('AuthGuard: User is authenticated, allowing access');
    return true;
  } else {
    console.log('AuthGuard: User is not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }
};
