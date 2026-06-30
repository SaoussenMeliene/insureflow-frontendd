import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() breadcrumb = 'Dashboard';

  fullName       = '';
  profileImage   = '';
  role           = '';
  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;

  private notifSub?: Subscription;
  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private authService:     AuthService,
    private http:            HttpClient,
    private firebaseService: FirebaseNotificationService,
    public  langService:     LanguageService,
    public  router:          Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.fullName = user?.fullName || 'Utilisateur';
    this.role     = user?.role     || 'CLIENT';

    this.authService.profileImage$.subscribe(url => {
      if (url) this.profileImage = url;
    });

    if (user?.email) {
      this.http.get<any>(
        `${this.api}/api/auth/profile/email/${user.email}` // ← CORRIGÉ
      ).subscribe({
        next: (profile) => {
          this.fullName = profile.fullName || this.fullName;
          if (profile.profileImage) {
            const url = `${this.api}/api/auth/profile-image/${profile.id}?t=${Date.now()}`; // ← CORRIGÉ
            this.profileImage = url;
            this.authService.updateProfileImage(url);
          }
        },
        error: () => {}
      });
    }

    this.notifSub = this.firebaseService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
      this.notifCount    = this.firebaseService.getUnreadCount();
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  toggleLang(): void {
    this.langService.toggle();
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      this.notifCount = 0;
      this.firebaseService.markAsSeen();
    }
  }

  clearNotifications(): void {
    this.firebaseService.clearNotifications();
    this.showNotifPanel = false;
  }
}