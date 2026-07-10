import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.waitForInit();
  if (auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login']);
};
