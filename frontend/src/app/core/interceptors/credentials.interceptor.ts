import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ensures cookies (including the HttpOnly refresh token) are sent
 * with every cross-origin API request.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const credReq = req.clone({ withCredentials: true });
  return next(credReq);
};
