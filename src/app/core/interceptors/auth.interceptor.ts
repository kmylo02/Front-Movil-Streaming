import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((err: unknown) => {
      // Token vencido o inválido: cerrar sesión y volver al login.
      // (Se excluye /auth/login, donde un 401 es "credenciales incorrectas".)
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !req.url.includes('/auth/login')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
