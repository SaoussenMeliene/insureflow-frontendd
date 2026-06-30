import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
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
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, SidebarComponent, HeaderComponent],
  templateUrl: './contracts.html',
  styleUrl: './contracts.css'
})
export class ContractsComponent implements OnInit, OnDestroy {

  fullName              = '';
  role                  = '';
  email                 = '';
  profileImage          = '';
  contracts: any[]      = [];
  isModalOpen           = false;
  selectedContract: any = null;
  totalClaimsCount      = 0;

  notifCount            = 0;
  notifications: any[]  = [];
  showNotifPanel        = false;
  private notifSub?: Subscription;

  private api    = environment.apiUrl;
  private ragApi = environment.apiUrl;

  constructor(
    private authService:     AuthService,
    private router:          Router,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public  langService:     LanguageService,
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profileImage = user.profileImage || '';
  }

  ngOnInit() {
    this.notifSub = this.firebaseService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
      this.notifCount    = this.firebaseService.getUnreadCount();
      this.cdr.detectChanges();
    });

    const user = this.authService.getUser();
    if (!user?.email) return;

    this.fullName = user.fullName || '';
    this.role     = user.role     || '';
    this.email    = user.email    || '';

    this.http.get<any>(
      `${this.api}/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile) => {
        this.fullName = profile.fullName || user.fullName;

        if (profile.profileImage) {
          this.profileImage =
            `${this.api}/api/auth/profile-image/${profile.id}?t=${Date.now()}`;
          this.cdr.detectChanges();
        }

        this.http.get<any[]>(
          `${this.api}/api/claims/client/${profile.id}`
        ).subscribe({
          next: (claims) => {
            this.totalClaimsCount = claims.length;
            this.loadContractsByEmail(user.email);
          },
          error: () => {
            this.totalClaimsCount = 0;
            this.loadContractsByEmail(user.email);
          }
        });
      },
      error: () => this.loadContractsByEmail(user.email)
    });
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

  loadContractsByEmail(email: string) {
    const policyNumbers = [
      '202650000000037',
      '202610000000083',
      '202643200000001',
      '202631100000001',
      '202662100000001'
    ];

    this.contracts = [];

    policyNumbers.forEach(policyNumber => {
      this.http.get<any>(
        `${this.ragApi}/api/contract-rag/contracts/${policyNumber}`
      ).subscribe({
        next: (data) => {

          // ✅ On garde contractType (AUTO, HOME...) séparément
          // pour que getTypeColor/getTypeBg/getTypeGradient fonctionnent
          this.contracts.push({
            type:          data.contractType,          // ← 'AUTO', 'HOME', etc.
            label:         this.getTypeLabel(data.contractType), // ← 'Automobile', etc.
            insuranceType: data.productName,
            number:        data.policyNumber,
            status:        data.status,
            startDate:     data.startDate,
            endDate:       data.endDate,
            prime:         data.annualPremium,
            franchise:     data.franchise,
            plafond:       data.plafond,
            claimsCount:   this.totalClaimsCount,
            paymentMethod: 'ANNUAL',
            nextPayment:   { date: data.endDate },
            holderName:    this.fullName,
            holderEmail:   email,
            holderAddress: 'Tunisie',
            guarantees:    (data.garanties || []).map((g: string) => ({ name: g }))
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn(`Contrat ${policyNumber} non trouvé:`, err);
        }
      });
    });
  }

  // ✅ Label lisible par type
  getTypeLabel(type: string): string {
    const map: { [key: string]: string } = {
      'AUTO':     'Automobile',
      'SCOLAIRE': 'Multirisques Scolaire',
      'HOME':     'Habitation',
      'HEALTH':   'Santé',
      'OTHER':    'Autres'
    };
    return map[type] || type;
  }

  // ✅ Couleur par type
  getTypeColor(type: string): string {
    const map: { [key: string]: string } = {
      'AUTO':     '#3b82f6',
      'HOME':     '#10b981',
      'HEALTH':   '#ec4899',
      'SCOLAIRE': '#8b5cf6',
      'OTHER':    '#f97316'
    };
    return map[type] || '#4f46e5';
  }

  // ✅ Fond par type
  getTypeBg(type: string): string {
    const map: { [key: string]: string } = {
      'AUTO':     '#eff6ff',
      'HOME':     '#ecfdf5',
      'HEALTH':   '#fdf2f8',
      'SCOLAIRE': '#f5f3ff',
      'OTHER':    '#fff7ed'
    };
    return map[type] || '#f5f3ff';
  }

  // ✅ Gradient bouton par type
  getTypeGradient(type: string): string {
    const map: { [key: string]: string } = {
      'AUTO':     'linear-gradient(135deg,#3b82f6,#2563eb)',
      'HOME':     'linear-gradient(135deg,#10b981,#059669)',
      'HEALTH':   'linear-gradient(135deg,#ec4899,#db2777)',
      'SCOLAIRE': 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'OTHER':    'linear-gradient(135deg,#f97316,#ea580c)'
    };
    return map[type] || 'linear-gradient(135deg,#4f46e5,#7c3aed)';
  }

  getTotalPremium(): number {
    return Math.round(
      this.contracts.reduce((sum, c) => sum + (c.prime || 0), 0) * 100
    ) / 100;
  }

  getTotalClaims(): number {
    return this.totalClaimsCount;
  }

  openModal(contract: any) {
    this.selectedContract = contract;
    this.isModalOpen      = true;
  }

  closeModal() {
    this.isModalOpen      = false;
    this.selectedContract = null;
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIF' || status === 'ACTIVE' ? 'Actif' : 'Inactif';
  }

  getPaymentMethodLabel(method: string): string {
    return method === 'ANNUAL'
      ? 'Paiement annuel'
      : 'Prélèvement automatique';
  }

  logout() {
    this.authService.logout();
  }
}