import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
