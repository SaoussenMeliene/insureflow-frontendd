import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit {
  fullName  = '';
  role      = '';
  editMode  = false;
  isLoading = false;

  toastMessage = '';
  toastType    = '';
  showToast    = false;

  profile: any = {
    fullName:     '',
    email:        '',
    role:         '',
    profileImage: ''
  };

  originalProfile: any = {};

  password = {
    current: '',
    new:     ''
  };

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // ── Toast ─────────────────────────────────────
  showToastMessage(message: string, type: string): void {
    this.toastMessage = message;
    this.toastType    = type;
    this.showToast    = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  // ── Normalise URL ─────────────────────────────
  normalizeImageUrl(url: string): string {
    if (!url || !url.trim()) return '';
    return url.trim();
  }

  // ── Charge le profil ──────────────────────────
loadProfile(): void {
  const user = this.authService.getUser();

  if (!user?.email) {
    console.error('Utilisateur introuvable');
    return;
  }

  // ── Charge depuis authService d'abord ────────
  this.profile = {
    fullName:     user.fullName     || '',
    email:        user.email        || '',
    role:         user.role         || '',
    profileImage: user.profileImage || ''
  };
  this.fullName = this.profile.fullName;
  this.role     = this.profile.role;

  // ── Puis appel API par email ──────────────────
  this.http.get<any>(
    `http://localhost:8080/api/auth/profile/email/${user.email}`
  ).subscribe({
    next: (res) => {
      const proxyUrl = res.profileImage ?
        `http://localhost:8080/api/auth/profile-image/${res.id}?t=${Date.now()}` : '';

      this.profile = {
        id:           res.id,
        fullName:     res.fullName || '',
        email:        res.email    || '',
        role:         res.role     || '',
        profileImage: proxyUrl
      };

      this.fullName        = this.profile.fullName;
      this.role            = this.profile.role;
      this.originalProfile = { ...this.profile };
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Erreur chargement profil :', err);
    }
  });
}

  // ── Toggle edit ───────────────────────────────
  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.originalProfile = { ...this.profile };
    }
  }

  cancelEdit(): void {
    this.profile  = { ...this.originalProfile };
    this.editMode = false;
  }

  // ── Sauvegarde profil ─────────────────────────
saveProfile(): void {
  if (!this.profile?.id) return;

  this.http.put<any>(
    `http://localhost:8080/api/auth/profile/${this.profile.id}`,
    { fullName: this.profile.fullName, email: this.profile.email }
  ).subscribe({
    next: (res) => {
      // ... reste pareil
    }
  });
}

changePassword(): void {
  if (!this.profile?.id) {
    this.showToastMessage('❌ Utilisateur introuvable', 'error');
    return;
  }

  this.http.put(
    `http://localhost:8080/api/auth/change-password/${this.profile.id}`,
    { currentPassword: this.password.current, newPassword: this.password.new },
    { responseType: 'text' }
  ).subscribe({
    next: () => {
      this.password = { current: '', new: '' };
      this.showToastMessage('✅ Mot de passe modifié !', 'success');
    }
  });
}

onFileSelected(event: any): void {
  const file = event?.target?.files?.[0];
  if (!this.profile?.id || !file) return;

  const formData = new FormData();
  formData.append('file', file);

  this.http.post(
    `http://localhost:8080/api/auth/upload-photo/${this.profile.id}`,
    formData,
    { responseType: 'text' }
  ).subscribe({
    next: () => {
      const proxyUrl =
        `http://localhost:8080/api/auth/profile-image/${this.profile.id}?t=${Date.now()}`;
      this.profile = { ...this.profile, profileImage: proxyUrl };
      this.cdr.detectChanges();
      this.showToastMessage('✅ Photo mise à jour !', 'success');
    }
  });
}

  logout(): void {
    this.authService.logout();
  }
}