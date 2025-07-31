import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  console.log(`Interceptor for URL: ${req.url}, Token: ${token ? 'Present' : 'Missing'}`);

  // Endpoints publics qu'on ne protège pas par token
  if (
    req.url.includes('/user/register') ||
    req.url.includes('/user/login') ||
    req.url.includes('/user/roles') ||
    req.url.includes('/upload')
  ) {
    console.log(`Skipping token for public endpoint: ${req.url}`);
    return next(req);
  }

  // Si token existe, on l'ajoute au header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(`Adding Authorization header for: ${req.url}`);
    return next(authReq);
  }

  // Pour les endpoints protégés sans token, on laisse passer mais on log
  console.log(`No token available for protected endpoint: ${req.url}`);
  return next(req);
};
