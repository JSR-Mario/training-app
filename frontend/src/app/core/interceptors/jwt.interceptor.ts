import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken;

  // Don't add token to public auth endpoints
  if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/register') && !req.url.includes('/auth/forgot-password') && !req.url.includes('/auth/reset-password')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
