import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'users/login',
    loadComponent: () => import('./users/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'users/register',
    loadComponent: () => import('./users/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'users/profile',
    loadComponent: () => import('./users/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [() => import('./auth.guard').then(m => m.authGuard)]
  },
  {
    path: '',
    redirectTo: 'users/login',
    pathMatch: 'full'
  }
];
