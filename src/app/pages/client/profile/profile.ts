import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';                              // ← AJOUTER
import { LanguageService } from '../../../core/services/language.service';  
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,TranslateModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
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

  // ✅ Notifications
  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifSub?: Subscription;

  constructor(
    private authService:     AuthService,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public langService: LanguageService,
  ) {}

  ngOnInit(): void {
    // ✅ Subscribe au BehaviorSubject partagé
    this.notifSub = this.firebaseService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
      this.notifCount    = this.firebaseService.getUnreadCount();
      this.cdr.detectChanges();
    });
    this.loadProfile();
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  // ✅ Toggle panel
 toggleNotifPanel() {
  this.showNotifPanel = !this.showNotifPanel;
  if (this.showNotifPanel) {
    this.notifCount = 0;
    this.firebaseService.markAsSeen(); // ← AJOUTER
  }
}

  // ✅ Effacer notifications
  clearNotifications() {
    this.firebaseService.clearNotifications();
    this.showNotifPanel = false;
  }

  toggleLang() {
  this.langService.toggle();
}

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

  normalizeImageUrl(url: string): string {
    if (!url || !url.trim()) return '';
    return url.trim();
  }

  loadProfile(): void {
    const user = this.authService.getUser();
    if (!user?.email) return;

    this.profile = {
      fullName:     user.fullName     || '',
      email:        user.email        || '',
      role:         user.role         || '',
      profileImage: user.profileImage || ''
    };
    this.fullName = this.profile.fullName;
    this.role     = this.profile.role;

    this.http.get<any>(
      `http://localhost:8080/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (res) => {
        const proxyUrl = res.profileImage
          ? `http://localhost:8080/api/auth/profile-image/${res.id}?t=${Date.now()}`
          : '';

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
      error: (err) => console.error('Erreur chargement profil :', err)
    });
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) this.originalProfile = { ...this.profile };
  }

  cancelEdit(): void {
    this.profile  = { ...this.originalProfile };
    this.editMode = false;
  }

  saveProfile(): void {
    if (!this.profile?.id) return;

    this.http.put<any>(
      `http://localhost:8080/api/auth/profile/${this.profile.id}`,
      { fullName: this.profile.fullName, email: this.profile.email }
    ).subscribe({
      next: () => {
        this.fullName = this.profile.fullName;
        this.editMode = false;
        this.showToastMessage('✅ Profil mis à jour !', 'success');
        this.cdr.detectChanges();
      },
      error: () => this.showToastMessage('❌ Erreur lors de la mise à jour', 'error')
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
      },
      error: () => this.showToastMessage('❌ Mot de passe actuel incorrect', 'error')
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
      },
      error: () => this.showToastMessage('❌ Erreur upload photo', 'error')
    });
  }

  logout(): void {
    this.authService.logout();
  }
}