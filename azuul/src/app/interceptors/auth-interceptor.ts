// 3. interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import {AuthService} from '../services/auth';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  console.log(`Interceptor for URL: ${req.url}, Token: ${token}`);

  // Do not add token for public endpoints
  if (req.url.includes('/user/register') ||
      req.url.includes('/user/login') ||
      req.url.includes('/user/roles')) {
    console.log(`Skipping token for public endpoint: ${req.url}`);
    return next(req);
  }


  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
