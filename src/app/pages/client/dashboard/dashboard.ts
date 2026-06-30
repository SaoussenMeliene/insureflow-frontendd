import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, SidebarComponent, HeaderComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  fullName     = '';
  role         = '';
  profileImage = '';
  isLoading    = true;
  recentClaims: any[] = [];

  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifSub?: Subscription;

  private api = environment.apiUrl; // ← AJOUTÉ

  stats = [
    { title: 'Sinistres déclarés', value: 0, bgClass: 'bg-blue-100',   iconClass: 'text-blue-600',   icon: 'clipboard-list' },
    { title: 'En attente',         value: 0, bgClass: 'bg-yellow-100', iconClass: 'text-yellow-600', icon: 'clock' },
    { title: 'En révision',        value: 0, bgClass: 'bg-orange-100', iconClass: 'text-orange-600', icon: 'clock' },
    { title: 'Approuvés',          value: 0, bgClass: 'bg-green-100',  iconClass: 'text-green-600',  icon: 'document-check' },
    { title: 'Rejetés',            value: 0, bgClass: 'bg-red-100',    iconClass: 'text-red-600',    icon: 'x' }
  ];

  contracts = [
    { type: 'Automobile', typeKey: 'AUTO',     count: 0, bgClass: 'bg-red-100',    iconClass: 'text-red-600',    icon: 'car' },
    { type: 'Habitation', typeKey: 'HOME',     count: 0, bgClass: 'bg-green-100',  iconClass: 'text-green-600',  icon: 'house' },
    { type: 'Santé',      typeKey: 'HEALTH',   count: 0, bgClass: 'bg-pink-100',   iconClass: 'text-pink-600',   icon: 'heart' },
    { type: 'Scolaire',   typeKey: 'SCOLAIRE', count: 0, bgClass: 'bg-purple-100', iconClass: 'text-purple-600', icon: 'school' },
    { type: 'Autres',     typeKey: 'OTHER',    count: 0, bgClass: 'bg-orange-100', iconClass: 'text-orange-600', icon: 'other' }
  ];

  quickActions = [
    { title: 'Déclarer un sinistre', icon: 'plus-circle',    action: 'declare-claim', actionKey: 'declare'   },
    { title: 'Mes sinistres',        icon: 'clipboard-list', action: 'my-claims',     actionKey: 'claims'    },
    { title: 'Mes contrats',         icon: 'document-check', action: 'contracts',     actionKey: 'contracts' },
    { title: 'Mon profil',           icon: 'user',           action: 'profile',       actionKey: 'profile'   }
  ];

  constructor(
    private authService:     AuthService,
    public  router:          Router,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public  langService:     LanguageService,
  ) {
    this.fullName = this.authService.getFullName() || 'Utilisateur';
    this.role     = this.authService.getRole()     || 'CLIENT';
  }

  ngOnInit(): void {
    this.notifSub = this.firebaseService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
      this.notifCount    = this.firebaseService.getUnreadCount();
      this.cdr.detectChanges();
    });

    const user = this.authService.getUser();
    if (!user?.email) {
      this.isLoading = false;
      return;
    }

    this.http.get<any>(
      `${this.api}/api/auth/profile/email/${user.email}` // ← CORRIGÉ
    ).subscribe({
      next: (profile) => {
        this.fullName = profile.fullName || user.fullName;
        if (profile.profileImage) {
          this.profileImage =
            `${this.api}/api/auth/profile-image/${profile.id}?t=${Date.now()}`; // ← CORRIGÉ
        }
        this.loadDashboardData(profile.id);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
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
    this.cdr.detectChanges();
  }

  loadDashboardData(clientId: number): void {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/claims/client/${clientId}`) // ← CORRIGÉ
      .subscribe({
        next: (claims) => {
          this.stats = [
            { title: 'Sinistres déclarés', value: claims.length,
              bgClass: 'bg-blue-100', iconClass: 'text-blue-600', icon: 'clipboard-list' },
            { title: 'En attente',
              value: claims.filter(c => [
                'SUBMITTED','ROUTING','VALIDATING','ESTIMATING','AGGREGATING','PROCESSING'
              ].includes(c.status)).length,
              bgClass: 'bg-yellow-100', iconClass: 'text-yellow-600', icon: 'clock' },
            { title: 'En révision humaine',
              value: claims.filter(c => c.status === 'HUMAN_REQUIRED').length,
              bgClass: 'bg-orange-100', iconClass: 'text-orange-600', icon: 'clock' },
            { title: 'Approuvés',
              value: claims.filter(c =>
                c.status === 'APPROVED' || c.status === 'COMPLETED').length,
              bgClass: 'bg-green-100', iconClass: 'text-green-600', icon: 'document-check' },
            { title: 'Rejetés',
              value: claims.filter(c => c.status === 'REJECTED').length,
              bgClass: 'bg-red-100', iconClass: 'text-red-600', icon: 'x' }
          ];

          this.contracts = [
            { type: 'Automobile', typeKey: 'AUTO',
              count: claims.filter(c => c.claimType === 'AUTO').length,
              bgClass: 'bg-blue-100', iconClass: 'text-blue-600', icon: 'car' },
            { type: 'Habitation', typeKey: 'HOME',
              count: claims.filter(c => c.claimType === 'HOME').length,
              bgClass: 'bg-green-100', iconClass: 'text-green-600', icon: 'house' },
            { type: 'Santé', typeKey: 'HEALTH',
              count: claims.filter(c => c.claimType === 'HEALTH').length,
              bgClass: 'bg-pink-100', iconClass: 'text-pink-600', icon: 'heart' },
            { type: 'Scolaire', typeKey: 'SCOLAIRE',
              count: claims.filter(c => c.claimType === 'SCOLAIRE').length,
              bgClass: 'bg-purple-100', iconClass: 'text-purple-600', icon: 'school' },
            { type: 'Autres', typeKey: 'OTHER',
              count: claims.filter(c => c.claimType === 'OTHER').length,
              bgClass: 'bg-orange-100', iconClass: 'text-orange-600', icon: 'other' }
          ];

          this.recentClaims = [...claims.slice(0, 5)];
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur chargement dashboard:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  performAction(action: string): void {
    switch (action) {
      case 'declare-claim': this.router.navigate(['/client/declare']);    break;
      case 'my-claims':     this.router.navigate(['/client/my-claims']); break;
      case 'contracts':     this.router.navigate(['/client/contracts']);  break;
      case 'profile':       this.router.navigate(['/client/profile']);    break;
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'SUBMITTED':      'En attente',
      'PROCESSING':     'En traitement',
      'HUMAN_REQUIRED': 'En révision',
      'COMPLETED':      'Approuvé',
      'REJECTED':       'Rejeté'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'SUBMITTED':      'bg-yellow-100 text-yellow-800',
      'PROCESSING':     'bg-blue-100 text-blue-800',
      'HUMAN_REQUIRED': 'bg-orange-100 text-orange-800',
      'COMPLETED':      'bg-green-100 text-green-800',
      'REJECTED':       'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'AUTO': 'Automobile', 'HOME': 'Habitation',
      'HEALTH': 'Santé', 'OTHER': 'Autre'
    };
    return labels[type] || type;
  }

  get roleBadgeClass(): string {
    switch (this.role) {
      case 'ADMIN':  return 'bg-red-100 text-red-700';
      case 'EXPERT': return 'bg-amber-100 text-amber-700';
      default:       return 'bg-primary/10 text-primary';
    }
  }

  getActionBgClass(icon: string): string {
    const map: { [k: string]: string } = {
      'plus-circle':    'bg-purple-100',
      'clipboard-list': 'bg-blue-100',
      'document-check': 'bg-orange-100',
      'user':           'bg-teal-100'
    };
    return map[icon] || 'bg-indigo-100';
  }

  getActionIconClass(icon: string): string {
    const map: { [k: string]: string } = {
      'plus-circle':    'text-purple-600',
      'clipboard-list': 'text-blue-600',
      'document-check': 'text-orange-600',
      'user':           'text-teal-600'
    };
    return map[icon] || 'text-indigo-600';
  }

  logout(): void {
    this.authService.logout();
  }
}