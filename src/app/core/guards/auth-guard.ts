import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { KeycloakService } from 'keycloak-angular';

const normalizeRole = (role: string | undefined): string => {
  if (!role) return '';
  const cleanedRole = role.startsWith('ROLE_') ? role.replace('ROLE_', '') : role;
  return cleanedRole.toUpperCase();
};

export const authGuard: CanActivateFn = (route) => {
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const keycloak = inject(KeycloakService);

  if (!auth.isLoggedIn()) {
    // ✅ Redirige vers Keycloak au lieu de /login
    keycloak.login({
      redirectUri: window.location.origin + '/login-callback'
    });
    return false;
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  if (!allowedRoles?.length) return true;

  const userRole = normalizeRole(auth.getRole());
  if (allowedRoles.includes(userRole)) return true;

  auth.redirectByRole();
  return false;
};