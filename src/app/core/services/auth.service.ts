import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { User } from '../../shared/models/user.model';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment'; // ← AJOUTÉ

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`; // ← CORRIGÉ
  private currentUser = signal<User | null>(null);

  constructor(
    private http:     HttpClient,
    private router:   Router,
    private keycloak: KeycloakService
  ) {
    const saved = localStorage.getItem('user');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  login(email?: string, password?: string) {
    return this.keycloak.login({
      redirectUri: window.location.origin + '/login-callback'
    });
  }

  profileImage$ = new BehaviorSubject<string>('');

  updateProfileImage(url: string) {
    this.profileImage$.next(url);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.keycloak.logout(
      window.location.origin + '/login'
    );
  }

  getToken(): string {
    return this.keycloak.getKeycloakInstance()?.token ||
           localStorage.getItem('token') || '';
  }

  getUser(): any {
    const kc = this.keycloak.getKeycloakInstance();

    if (kc?.tokenParsed) {
      const token = kc.tokenParsed as any;
      const roles: string[] =
        token?.realm_access?.roles || [];

      const role = roles.includes('ROLE_ADMIN')  ? 'ADMIN'  :
                   roles.includes('ROLE_CLIENT') ? 'CLIENT' : '';

      const user: User = {
        id:       token.sub              || 0,
        fullName: token.name             ||
                  token.preferred_username || '',
        email:    token.email            || '',
        role:     role as 'CLIENT' | 'ADMIN',
        token:    kc.token               || '',
        type:     'Bearer',
        cin:      token.cin              || ''
      };

      localStorage.setItem('user', JSON.stringify(user));
      this.currentUser.set(user);
      return user;
    }

    return this.currentUser();
  }

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

  register(fullName: string, email: string,
           password: string, cin?: string) {
    return this.http.post<any>(
      `${this.apiUrl}/register`,
      { fullName, email, cin, password }
    );
  }
}