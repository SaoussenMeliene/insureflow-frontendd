import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';

@Component({
  selector: 'app-login-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin w-10 h-10 border-4 border-indigo-600
                    border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-slate-600">Connexion en cours...</p>
      </div>
    </div>
  `
})
export class LoginCallbackComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseNotificationService  // ← AJOUTER
  ) {}

  async ngOnInit(): Promise<void> {
    // ✅ Récupère user depuis token Keycloak
    const user = this.authService.getUser();
    console.log('User Keycloak :', user);

    // ✅ Init FCM après login
    await this.firebaseService.initNotifications();

    // ✅ Redirige selon le rôle
    this.authService.redirectByRole();
  }
}