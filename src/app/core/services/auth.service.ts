import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { User } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUser = signal<User | null>(null);

  constructor(
    private http:     HttpClient,
    private router:   Router,
    private keycloak: KeycloakService
  ) {
    // ✅ Charge user depuis localStorage (compatibilité)
    const saved = localStorage.getItem('user');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  // ── LOGIN → redirige vers Keycloak ───────────
  login(email?: string, password?: string) {
    // ✅ Redirige vers page login Keycloak
    return this.keycloak.login({
      redirectUri: window.location.origin + '/login-callback'
    });
  }

  // ── LOGOUT → Keycloak logout ─────────────────
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);

    // ✅ Déconnecte depuis Keycloak
    this.keycloak.logout(
      window.location.origin + '/login'
    );
  }

  // ── Récupère le token Keycloak ────────────────
  getToken(): string {
    return this.keycloak.getKeycloakInstance()?.token || 
           localStorage.getItem('token') || '';
  }

  // ── Récupère les infos user depuis token ──────
 getUser(): any {
  const kc = this.keycloak.getKeycloakInstance();

  if (kc?.tokenParsed) {
    const token = kc.tokenParsed as any;
    const roles: string[] = 
      token?.realm_access?.roles || [];

    const role = roles.includes('ROLE_ADMIN') ? 'ADMIN' :
                 roles.includes('ROLE_CLIENT') ? 'CLIENT' : '';

    const user: User = {
      id:           token.sub         || 0,
      fullName:     token.name        ||
                    token.preferred_username || '',
      email:        token.email       || '',
      role:         role as 'CLIENT' | 'ADMIN',
      token:        kc.token          || '',
      type:         'Bearer',
      cin:          token.cin         || ''
    };

    // ✅ Sync localStorage
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
    return user;
  }

  // ✅ Fallback localStorage
  return this.currentUser();
}

   

  // ── Getters ───────────────────────────────────
  isLoggedIn(): boolean {
    return this.keycloak.isLoggedIn() ||
           !!localStorage.getItem('token');
  }

  getRole(): string {
    return this.getUser()?.role || '';
  }

  getFullName(): string {
    return this.getUser()?.fullName || '';
  }

  // ── Redirect après login ──────────────────────
  redirectByRole() {
    const role = this.getRole();
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'CLIENT') {
      this.router.navigate(['/client/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  // ── Register (garde pour compatibilité) ───────
  register(fullName: string, email: string,
           password: string, cin?: string) {
    return this.http.post<any>(
      `${this.apiUrl}/register`,
      { fullName, email, cin, password }
    );
  }
}