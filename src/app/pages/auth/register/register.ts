import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  form = {
    fullName: '',
    email:    '',
    cin:      '',
    password: ''
  };

  showPassword = false;
  isLoading    = false;
  error: string | null = null;

  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private router: Router,
    private http:   HttpClient
  ) {}

  get passwordStrength() {
    const pw = this.form.password;
    if (!pw) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pw.length >= 8)          score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Faible', color: 'bg-red-500',    width: '33%'  };
    if (score <= 2) return { label: 'Moyen',  color: 'bg-orange-400', width: '66%'  };
    return              { label: 'Fort',   color: 'bg-green-500',  width: '100%' };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.error = null;

    if (!this.form.fullName || !this.form.email || !this.form.cin || !this.form.password) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (this.form.password.length < 8) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères';
      return;
    }

    this.isLoading = true;

    this.http.post<any>(`${this.api}/api/auth/register`, this.form) // ← CORRIGÉ
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Inscription réussie:', response);
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' }
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.error?.message || "Erreur lors de l'inscription.";
          console.error('Erreur inscription:', err);
        }
      });
  }
}