import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, SKIP_AUTH } from './auth.service';

/**
 * Attaches the access token to backend requests. When one comes back 401
 * (token expired), refreshes once and retries; if that fails, ends the session.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Never send the token to third-party hosts.
  if (req.context.get(SKIP_AUTH) || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withToken(req, auth.getAccessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(auth.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            auth.endSession(router.url);
            return throwError(() => error);
          }
          return next(withToken(req, token));
        }),
      );
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
