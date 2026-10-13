import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Lets signed-in users through; sends everyone else to /login, remembering where they were going. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users off pages like /login. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/']);
};
