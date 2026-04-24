import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  email = '';
  submitted = false;
  successMessage = '';
  errorMessage = '';

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.isEmailValid(this.email)) {
      this.errorMessage = 'Veuillez entrer une adresse email valide.';
      return;
    }

    // The backend flow can be connected here later.
    this.successMessage =
      'Si un compte existe pour cet email, vous recevrez un lien de reinitialisation.';
  }

  private isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
