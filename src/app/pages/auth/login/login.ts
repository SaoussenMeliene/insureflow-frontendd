import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email         = '';
  password      = '';
  rememberMe    = false;
  showPassword  = false;
  isLoading     = false;
  errorMessage  = '';
  successMessage = '';

  constructor(
    private router:      Router,
    private route:       ActivatedRoute,
    private authService: AuthService
  ) {
    // ✅ Si déjà connecté via Keycloak → redirige
    if (this.authService.isLoggedIn()) {
      this.authService.redirectByRole();
    }

    // ✅ Message après inscription
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.successMessage =
          'Inscription réussie ! Connectez-vous maintenant.';
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ✅ Login → redirige vers Keycloak
  onSubmit(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // ✅ Redirige vers page login Keycloak
    this.authService.login();
  }

  // ✅ Bouton direct Keycloak
  loginWithKeycloak(): void {
    this.authService.login();
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  continueWithGoogle(): void {
  this.authService.login();
}

continueWithMicrosoft(): void {
  this.authService.login();
}
}