import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-claims',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-claims.html',
  styleUrls: ['./my-claims.css']
})
export class MyClaims implements OnInit {

  fullName      = '';
  role          = '';
  profileImage  = '';
  isLoading     = true;
  claims: any[] = [];
  filteredClaims: any[] = [];

  searchQuery  = '';
  filterStatus = 'all';

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (!user?.email) {
      this.isLoading = false;
      return;
    }

    this.fullName = user.fullName || '';
    this.role     = user.role     || '';

    // ✅ Récupère l'ID numérique depuis auth_db par email
    this.http.get<any>(
      `http://localhost:8080/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile) => {
        // ✅ Photo de profil
        if (profile.profileImage) {
          this.profileImage =
            `http://localhost:8080/api/auth/profile-image/${profile.id}?t=${Date.now()}`;
        }
        this.fullName = profile.fullName || user.fullName;

        // ✅ Charge sinistres avec ID numérique
        this.loadClaims(profile.id, user.email);
      },
      error: () => {
        // Fallback — filtre par email
        this.loadClaims(null, user.email);
      }
    });
  }

  loadClaims(clientId: number | null, email: string): void {
    this.isLoading = true;

    // ✅ Si on a l'ID numérique → endpoint optimisé
    const url = clientId
      ? `http://localhost:8080/api/claims/client/${clientId}`
      : `http://localhost:8080/api/claims`;

    this.http.get<any[]>(url).subscribe({
      next: (data: any[]) => {
        // Si pas d'ID → filtre par email
        this.claims = clientId
          ? data
          : data.filter(c => c.clientEmail === email);

        this.claims = this.claims.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );

        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur :', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.filteredClaims = this.claims.filter(claim => {
      const ref    = claim.reference   || '';
      const desc   = claim.description || '';
      const type   = claim.claimType   || '';
      const status = claim.status      || '';

      const matchesSearch =
        ref.toLowerCase().includes(this.searchQuery.toLowerCase())   ||
        desc.toLowerCase().includes(this.searchQuery.toLowerCase())  ||
        type.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus =
        this.filterStatus === 'all' || status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });
    this.cdr.detectChanges();
  }

  getStatusLabel(status: string): string {
    const map: { [k: string]: string } = {
      'SUBMITTED':      'En attente',
      'ROUTING':        'Classification',
      'VALIDATING':     'Validation',
      'ESTIMATING':     'Estimation',
      'AGGREGATING':    'Calcul score',
      'PROCESSING':     'En traitement',
      'HUMAN_REQUIRED': 'En révision',
      'COMPLETED':      'Complété',
      'APPROVED':       'Approuvé',
      'REJECTED':       'Rejeté',
      'FAILED':         'Échoué'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: { [k: string]: string } = {
      'SUBMITTED':      'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'ROUTING':        'bg-blue-100 text-blue-800 border border-blue-300',
      'VALIDATING':     'bg-blue-100 text-blue-800 border border-blue-300',
      'ESTIMATING':     'bg-blue-100 text-blue-800 border border-blue-300',
      'AGGREGATING':    'bg-purple-100 text-purple-800 border border-purple-300',
      'PROCESSING':     'bg-blue-100 text-blue-800 border border-blue-300',
      'HUMAN_REQUIRED': 'bg-orange-100 text-orange-800 border border-orange-300',
      'COMPLETED':      'bg-green-100 text-green-800 border border-green-300',
      'APPROVED':       'bg-emerald-100 text-emerald-800 border border-emerald-300',
      'REJECTED':       'bg-red-100 text-red-800 border border-red-300',
      'FAILED':         'bg-rose-100 text-rose-800 border border-rose-300'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }

  getTypeIcon(type: string): string {
    const map: { [k: string]: string } = {
      'AUTO':     '🚗',
      'HOME':     '🏠',
      'HEALTH':   '🏥',
      'SCOLAIRE': '🏫',
      'OTHER':    '📋'
    };
    return map[type] || '📋';
  }

  getTypeLabel(type: string): string {
    const map: { [k: string]: string } = {
      'AUTO':     'Automobile',
      'HOME':     'Habitation',
      'HEALTH':   'Santé',
      'SCOLAIRE': 'Scolaire',
      'OTHER':    'Autre'
    };
    return map[type] || type;
  }

  getIaScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  }

  logout(): void {
    this.authService.logout();
  }
}