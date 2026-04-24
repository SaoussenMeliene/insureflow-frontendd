import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // ✅ Keycloak gère automatiquement le Bearer token
  // Fallback localStorage pour compatibilité
  const token = localStorage.getItem('token');

  if (token && !req.headers.has('Authorization')) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};