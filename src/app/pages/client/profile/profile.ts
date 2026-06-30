import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, SidebarComponent, HeaderComponent],
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

  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifSub?: Subscription;

  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private authService:     AuthService,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public  langService:     LanguageService,
  ) {}

  ngOnInit(): void {
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

  toggleNotifPanel() {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      this.notifCount = 0;
      this.firebaseService.markAsSeen();
    }
  }

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
      `${this.api}/api/auth/profile/email/${user.email}` // ← CORRIGÉ
    ).subscribe({
      next: (res) => {
        const proxyUrl = res.profileImage
          ? `${this.api}/api/auth/profile-image/${res.id}?t=${Date.now()}` // ← CORRIGÉ
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
      `${this.api}/api/auth/profile/${this.profile.id}`, // ← CORRIGÉ
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
      `${this.api}/api/auth/change-password/${this.profile.id}`, // ← CORRIGÉ
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
      `${this.api}/api/auth/upload-photo/${this.profile.id}`, // ← CORRIGÉ
      formData,
      { responseType: 'text' }
    ).subscribe({
      next: () => {
        const proxyUrl =
          `${this.api}/api/auth/profile-image/${this.profile.id}?t=${Date.now()}`; // ← CORRIGÉ

        this.profile = { ...this.profile, profileImage: proxyUrl };
        this.authService.updateProfileImage(proxyUrl);

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