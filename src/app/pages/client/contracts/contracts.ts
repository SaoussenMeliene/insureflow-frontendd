import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';                              // ← AJOUTER
import { LanguageService } from '../../../core/services/language.service';  
@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, RouterModule,TranslateModule],
  templateUrl: './contracts.html',
  styleUrl: './contracts.css'
})
export class ContractsComponent implements OnInit, OnDestroy {

  fullName         = '';
  role             = '';
  email            = '';
  profileImage     = '';
  contracts: any[] = [];
  isModalOpen      = false;
  selectedContract: any = null;

  // ✅ Notifications
  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifSub?: Subscription;

  constructor(
    private authService:     AuthService,
    private router:          Router,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public langService: LanguageService,
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profileImage = user.profileImage || '';
  }

  ngOnInit() {
    // ✅ Subscribe au BehaviorSubject partagé
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
      `http://localhost:8080/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile) => {
        this.fullName = profile.fullName || user.fullName;

        if (profile.profileImage) {
          this.profileImage =
            `http://localhost:8080/api/auth/profile-image/${profile.id}?t=${Date.now()}`;
          this.cdr.detectChanges();
        }

        this.http.get<any[]>(
          `http://localhost:8080/api/claims/client/${profile.id}`
        ).subscribe({
          next: (claims) => this.loadContractsByEmail(user.email, claims.length),
          error: ()       => this.loadContractsByEmail(user.email, 0)
        });
      },
      error: () => this.loadContractsByEmail(user.email, 0)
    });
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

  loadContractsByEmail(email: string, claimsCount: number) {
    const emailLower = email.toLowerCase().trim();

    const CONTRACT_AUTO = {
      type:          'Automobile',
      insuranceType: '521 Affaires et Promenades',
      number:        '202650000000037',
      status:        'ACTIF',
      startDate:     '19/03/2026',
      endDate:       '19/03/2027',
      prime:         2026.933,
      franchise:     '5%',
      plafond:       56516.856,
      claimsCount:   claimsCount,
      paymentMethod: 'ANNUAL',
      nextPayment:   { date: '19/03/2027' },
      guarantees: [
        { name: 'Responsabilité Civile Illimitée' },
        { name: 'Dommage collision (franchise 5%)' },
        { name: 'Vol : 56 516 DT' },
        { name: 'Incendie : 56 516 DT' },
        { name: 'Bris de glace (franchise 5%)' },
        { name: 'Assistance remorquage Premium' },
        { name: 'Voiture de remplacement 15 jours' }
      ]
    };

    const CONTRACT_SCOLAIRE = {
      type:          'Multirisques Scolaire',
      insuranceType: '171 Madrassati',
      number:        '202610000000083',
      status:        'ACTIF',
      startDate:     '20/03/2026',
      endDate:       '19/03/2027',
      prime:         333.400,
      franchise:     '100 DT',
      plafond:       100000,
      claimsCount:   claimsCount,
      paymentMethod: 'ANNUAL',
      nextPayment:   { date: '19/03/2027' },
      guarantees: [
        { name: 'Incendie Bâtiment : 500 000 DT' },
        { name: 'RC Exploitation' },
        { name: 'RC Professionnelle' },
        { name: 'Individuelle Accident élèves' },
        { name: 'Frais médicaux : 300 DT' }
      ]
    };

    const emailToContracts: { [key: string]: any[] } = {
      'wafa@gmail.com'     : [CONTRACT_AUTO],
      'amine@gmail.com'    : [CONTRACT_AUTO],
      'ali@gmail.com'      : [CONTRACT_AUTO, CONTRACT_SCOLAIRE],
      'client@email.com'   : [CONTRACT_AUTO],
      'scolaire@email.com' : [CONTRACT_SCOLAIRE],
      'ahmed@email.com'    : [CONTRACT_SCOLAIRE]
    };

    const contractList = emailToContracts[emailLower];

    this.contracts = contractList
      ? contractList.map(contract => ({
          ...contract,
          holderName:    this.fullName,
          holderEmail:   email,
          holderAddress: 'Tunisie'
        }))
      : [];

    console.log('Contrats trouvés :', this.contracts.length);
    this.cdr.detectChanges();
  }

  getTotalPremium(): number {
    return this.contracts.reduce((sum, c) => sum + c.prime, 0);
  }

  getTotalClaims(): number {
    return this.contracts.reduce((sum, c) => sum + c.claimsCount, 0);
  }

  openModal(contract: any) {
    this.selectedContract = contract;
    this.isModalOpen      = true;
  }

  closeModal() {
    this.isModalOpen      = false;
    this.selectedContract = null;
  }

  getContractTypeIcon(type: string): string {
    return type === 'Automobile' ? '🚗' : '🏫';
  }

  getContractTypeColor(type: string): string {
    return type === 'Automobile'
      ? 'bg-blue-50 border-blue-200'
      : 'bg-green-50 border-green-200';
  }

  getStatusClass(status: string): string {
    return status === 'ACTIF'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIF' ? '✓ Actif' : '✗ Inactif';
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