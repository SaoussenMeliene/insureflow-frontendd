import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // ── Publiques ───────────────────────────────
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/landing/landing')
      .then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login')
      .then(m => m.LoginComponent)
  },

  // ✅ Callback Keycloak après login
  {
    path: 'login-callback',
    loadComponent: () => import('./pages/auth/login-callback/login-callback')
      .then(m => m.LoginCallbackComponent)
  },

  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password')
      .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register')
      .then(m => m.RegisterComponent)
  },

  // ── CLIENT ──────────────────────────────────
  {
    path: 'client',
    canActivate: [authGuard],
    data: { roles: ['CLIENT'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/client/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'declare',
        loadComponent: () => import('./pages/client/declare-claim/declare-claim')
          .then(m => m.DeclareClaim)
      },
      {
        path: 'contracts',
        loadComponent: () => import('./pages/client/contracts/contracts')
          .then(m => m.ContractsComponent)
      },
      {
        path: 'my-claims',
        loadComponent: () => import('./pages/client/my-claims/my-claims')
          .then(m => m.MyClaims)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/client/profile/profile')
          .then(m => m.ProfileComponent)
      }
    ]
  },

  // ── ADMIN ───────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'claims',
        loadComponent: () => import('./pages/admin/claims/claims')
          .then(m => m.ClaimsComponent)
      },
      {
        path: 'review',
        loadComponent: () => import('./pages/admin/review/review')
          .then(m => m.ReviewComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/users/users')
          .then(m => m.Users)
      },
      {
        path: 'contracts',
        loadComponent: () => import('./pages/admin/contracts/contracts')
          .then(m => m.ContractsComponent)
      }
    ]
  },

  // ── Redirect ────────────────────────────────
  { path: '**', redirectTo: '' }
];