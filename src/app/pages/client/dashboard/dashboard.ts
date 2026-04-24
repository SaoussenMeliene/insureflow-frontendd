import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  fullName     = '';
  role         = '';
  profileImage = '';
  isLoading    = true;
  recentClaims: any[] = [];

  stats = [
    { title: 'Sinistres déclarés',      value: 0, bgClass: 'bg-blue-100',   iconClass: 'text-blue-600',   icon: 'clipboard-list' },
    { title: 'En attente de révision',  value: 0, bgClass: 'bg-yellow-100', iconClass: 'text-yellow-600', icon: 'clock' },
    { title: 'Approuvés',               value: 0, bgClass: 'bg-green-100',  iconClass: 'text-green-600',  icon: 'document-check' }
  ];

  contracts = [
    { type: 'Automobile', count: 0, bgClass: 'bg-red-100',    iconClass: 'text-red-600',    icon: 'car' },
    { type: 'Habitation', count: 0, bgClass: 'bg-green-100',  iconClass: 'text-green-600',  icon: 'house' },
    { type: 'Santé',      count: 0, bgClass: 'bg-pink-100',   iconClass: 'text-pink-600',   icon: 'heart' },
    { type: 'Autres',     count: 0, bgClass: 'bg-purple-100', iconClass: 'text-purple-600', icon: 'school' }
  ];

  quickActions = [
    { title: 'Déclarer un sinistre', icon: 'plus-circle',    action: 'declare-claim' },
    { title: 'Mes sinistres',        icon: 'clipboard-list', action: 'my-claims' },
    { title: 'Mes contrats',         icon: 'document-check', action: 'contracts' },
    { title: 'Mon profil',           icon: 'user',           action: 'profile' }
  ];

  constructor(
    private authService: AuthService,
    private router:      Router,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef
  ) {
    this.fullName = this.authService.getFullName() || 'Utilisateur';
    this.role     = this.authService.getRole()     || 'CLIENT';
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (!user?.email) {
      this.isLoading = false;
      return;
    }

    // ✅ Récupère le profil numérique depuis auth_db par email
    this.http.get<any>(
      `http://localhost:8080/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile) => {
        this.fullName = profile.fullName || user.fullName;

        // ✅ Photo de profil
        if (profile.profileImage) {
          this.profileImage =
            `http://localhost:8080/api/auth/profile-image/${profile.id}?t=${Date.now()}`;
        }

        // ✅ Charge sinistres avec ID numérique
        this.loadDashboardData(profile.id);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDashboardData(clientId: number): void {
    this.isLoading = true;

    this.http.get<any[]>(
      `http://localhost:8080/api/claims/client/${clientId}`
    ).subscribe({
      next: (claims) => {
        this.stats = [
          {
            title:     'Sinistres déclarés',
            value:     claims.length,
            bgClass:   'bg-blue-100',
            iconClass: 'text-blue-600',
            icon:      'clipboard-list'
          },
          {
            title:     'En attente de révision',
            value:     claims.filter(c =>
              c.status === 'SUBMITTED' ||
              c.status === 'HUMAN_REQUIRED' ||
              c.status === 'PROCESSING'
            ).length,
            bgClass:   'bg-yellow-100',
            iconClass: 'text-yellow-600',
            icon:      'clock'
          },
          {
            title:     'Approuvés',
            value:     claims.filter(c => c.status === 'COMPLETED').length,
            bgClass:   'bg-green-100',
            iconClass: 'text-green-600',
            icon:      'document-check'
          }
        ];

        this.contracts = [
          { type: 'Automobile', count: claims.filter(c => c.claimType === 'AUTO').length,   bgClass: 'bg-red-100',    iconClass: 'text-red-600',    icon: 'car' },
          { type: 'Habitation', count: claims.filter(c => c.claimType === 'HOME').length,   bgClass: 'bg-green-100',  iconClass: 'text-green-600',  icon: 'house' },
          { type: 'Santé',      count: claims.filter(c => c.claimType === 'HEALTH').length, bgClass: 'bg-pink-100',   iconClass: 'text-pink-600',   icon: 'heart' },
          { type: 'Autres',     count: claims.filter(c => c.claimType === 'OTHER').length,  bgClass: 'bg-purple-100', iconClass: 'text-purple-600', icon: 'school' }
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
      'AUTO':   'Automobile',
      'HOME':   'Habitation',
      'HEALTH': 'Santé',
      'OTHER':  'Autre'
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

  logout(): void {
    this.authService.logout();
  }
}