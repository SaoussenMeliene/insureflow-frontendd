import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseNotificationService } from '../../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-declare-claim',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    SidebarComponent,
    HeaderComponent
  ],
  templateUrl: './declare-claim.html',
  styleUrl: './declare-claim.css',
})
export class DeclareClaim implements OnInit, OnDestroy {

  currentStep  = 1;
  stepTitles   = [
    'Informations de base',
    'Détails du sinistre',
    'Informations du véhicule',
    'Récapitulatif'
  ];
  submitted    = false;
  fullName     = '';
  role         = '';
  profileImage = '';
  claimPhotos: File[]   = [];
  previews:    string[] = [];

  notifCount     = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifSub?: Subscription;

  // ✅ Assistant IA
  isGenerating = false;

  private api = environment.apiUrl;

  form = {
    policyNumber:        '',
    incidentDate:        '',
    incidentLocation:    '',
    claimType:           '',
    description:         '',
    clientId:            '',
    clientEmail:         '',
    clientEstimatedCost: '',
    vehicleBrand:        '',
    vehicleModel:        '',
    vehicleYear:         '',
    vehicleCategory:     ''
  };

  claimTypes = [
    { key: 'AUTO',     label: 'Accident automobile',   icon: 'car',    description: 'Collision ou accident routier' },
    { key: 'HOME',     label: 'Dégâts habitation',     icon: 'house',  description: 'Dommages causés à des biens' },
    { key: 'HEALTH',   label: 'Blessure / Santé',      icon: 'heart',  description: 'Sinistre corporel' },
    { key: 'SCOLAIRE', label: 'Multirisques Scolaire', icon: 'school', description: 'Incendie, RC, accidents élèves' },
    { key: 'OTHER',    label: 'Autre sinistre',         icon: 'other',  description: 'Vol, incendie, autre' }
  ];

  vehicleCategories = [
    { value: 'voiture', label: 'Voiture' },
    { value: 'moto',    label: 'Moto' },
    { value: 'camion',  label: 'Camion' },
    { value: 'bus',     label: 'Bus' }
  ];

  constructor(
    private http:            HttpClient,
    private router:          Router,
    private authService:     AuthService,
    private cdr:             ChangeDetectorRef,
    private firebaseService: FirebaseNotificationService,
    public  langService:     LanguageService,
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profileImage = user.profileImage || '';
  }

  ngOnInit() {
    this.notifSub = this.firebaseService.notifications$.subscribe(
      (notifs: any[]) => {
        this.notifications = notifs;
        this.notifCount    = this.firebaseService.getUnreadCount();
        this.cdr.detectChanges();
      }
    );

    const user = this.authService.getUser();
    if (!user?.email) return;

    this.fullName         = user.fullName || '';
    this.role             = user.role     || '';
    this.form.clientEmail = user.email    || '';

    this.http.get<any>(
      `${this.api}/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile: any) => {
        this.form.clientId = String(profile.id || '');
        this.fullName      = profile.fullName || user.fullName;

        if (profile.profileImage) {
          this.profileImage =
            `${this.api}/api/auth/profile-image/${profile.id}?t=${Date.now()}`;

          const savedUser = JSON.parse(
            localStorage.getItem('user') || '{}'
          );
          localStorage.setItem('user', JSON.stringify({
            ...savedUser,
            profileImage: this.profileImage
          }));

          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.form.clientId = String(user.id || '');
      }
    });
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  // ════════════════════════════════════════════
  // ✅ Assistant IA — améliore la description
  // ════════════════════════════════════════════
  generateDescription() {
  if (!this.form.description ||
      this.form.description.trim().length < 5) {
    alert('Écris quelques mots d\'abord !');
    return;
  }

  this.isGenerating = true;

  const token = this.authService.getToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // ✅ Utilise this.api
  this.http.post<any>(
    `${this.api}/api/claims/ai/improve`,
    { description: this.form.description },
    { headers }
  ).subscribe({
    next: (response: any) => {
      this.form.description = response.description;
      this.isGenerating = false;
      this.cdr.detectChanges();
    },
    error: (err: any) => {
      console.error('❌ Erreur IA:', err);
      this.isGenerating = false;
      this.cdr.detectChanges();
    }
  });
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

  selectClaimType(type: string) {
    this.form.claimType = type;
  }

  removePhoto(index: number) {
    this.claimPhotos.splice(index, 1);
    this.previews.splice(index, 1);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files) this.handleFiles(files);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.handleFiles(input.files);
  }

  private handleFiles(files: FileList) {
    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        this.claimPhotos.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previews.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  nextStep() {
    if (this.validateCurrentStep()) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(
          this.form.policyNumber.trim() &&
          this.form.incidentDate &&
          this.form.incidentLocation.trim()
        );
      case 2:
        return !!(
          this.form.description.trim() &&
          this.form.clientId.trim() &&
          this.form.clientEmail.trim() &&
          this.form.clientEstimatedCost &&
          this.form.claimType
        );
      case 3:
        return this.claimPhotos.length > 0 &&
               this.isVehicleInfoValid();
      default:
        return false;
    }
  }

  private isVehicleInfoValid(): boolean {
    const hasAny = !!(
      this.form.vehicleBrand.trim() ||
      this.form.vehicleModel.trim() ||
      this.form.vehicleYear         ||
      this.form.vehicleCategory
    );
    if (!hasAny) return true;
    return !!(
      this.form.vehicleBrand.trim() &&
      this.form.vehicleModel.trim() &&
      this.form.vehicleYear         &&
      this.form.vehicleCategory
    );
  }

  validateForm(): boolean {
    return !!(
      this.form.policyNumber.trim()     &&
      this.form.incidentDate            &&
      this.form.incidentLocation.trim() &&
      this.form.description.trim()      &&
      this.form.clientId.trim()         &&
      this.form.clientEmail.trim()      &&
      this.form.clientEstimatedCost     &&
      this.form.claimType               &&
      this.claimPhotos.length > 0       &&
      this.isVehicleInfoValid()
    );
  }

  get canSubmit(): boolean {
    return this.validateForm();
  }

  submitForm() {
    this.submitted = true;
    if (!this.validateForm()) return;

    const formData = new FormData();

    const claimData = {
      policyNumber:        this.form.policyNumber,
      claimType:           this.form.claimType,
      incidentDate:        this.form.incidentDate,
      incidentLocation:    this.form.incidentLocation,
      description:         this.form.description,
      clientId:            String(this.form.clientId),
      clientEmail:         this.form.clientEmail,
      clientEstimatedCost: this.form.clientEstimatedCost
                             ? parseFloat(this.form.clientEstimatedCost)
                             : null,
      vehicleBrand:        this.form.vehicleBrand,
      vehicleModel:        this.form.vehicleModel,
      vehicleYear:         this.form.vehicleYear
                             ? parseInt(this.form.vehicleYear)
                             : null,
      vehicleCategory:     this.form.vehicleCategory,
      photoUrls:           []
    };

    formData.append('claim',
      new Blob(
        [JSON.stringify(claimData)],
        { type: 'application/json' }
      )
    );

    this.claimPhotos.forEach((photo: File) => {
      formData.append('photos', photo);
    });

    this.http.post(
      `${this.api}/api/claims`,
      formData
    ).subscribe({
      next: (response: any) => {
        alert('Sinistre déclaré avec succès ! Référence : '
          + (response.reference || response.id));
        this.router.navigate(['/client/my-claims']);
      },
      error: (err: any) => {
        console.error('Erreur:', err);
        alert(err.error?.message ||
          'Erreur lors de la soumission du sinistre');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}