import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.waitForInit();
  if (auth.isLoggedIn()) return true;
  inject(NavController).navigateRoot('/login');
  return false;
};
