import { Component, OnInit,ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-declare-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './declare-claim.html',
  styleUrl: './declare-claim.css',
})
export class DeclareClaim implements OnInit {
  currentStep  = 1;
  stepTitles   = ['Informations de base', 'Détails du sinistre', 'Informations du véhicule', 'Récapitulatif'];
  submitted    = false;
  fullName     = '';
  role         = '';
  profileImage = '';
  claimPhotos: File[]   = [];
  previews:    string[] = [];

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
    { key: 'AUTO',   label: 'Accident automobile', icon: 'car',    description: 'Collision ou accident routier' },
    { key: 'HOME',   label: 'Dégâts habitation',   icon: 'house',  description: 'Dommages causés à des biens' },
    { key: 'HEALTH', label: 'Blessure / Santé',    icon: 'heart',  description: 'Sinistre corporel' },
    { key: 'SCOLAIRE', label: 'Multirisques Scolaire', icon: 'school',  description: 'Incendie, RC, accidents élèves' },
    { key: 'OTHER',    label: 'Autre sinistre',         icon: 'other',   description: 'Vol, incendie, autre' }
  ];

  vehicleCategories = [
    { value: 'voiture', label: 'Voiture' },
    { value: 'moto',    label: 'Moto' },
    { value: 'camion',  label: 'Camion' },
    { value: 'bus',     label: 'Bus' }
  ];

  constructor(
    private http:        HttpClient,
    private router:      Router,
    private authService: AuthService,
    private cdr:         ChangeDetectorRef
  ) {
    // ✅ Charge la photo depuis localStorage immédiatement
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profileImage = user.profileImage || '';
  }

 ngOnInit() {
    const user = this.authService.getUser();
    if (!user?.email) return;

    this.fullName         = user.fullName || '';
    this.role             = user.role     || '';
    this.form.clientEmail = user.email    || '';

    this.http.get<any>(
      `http://localhost:8080/api/auth/profile/email/${user.email}`
    ).subscribe({
      next: (profile) => {
        this.form.clientId = String(profile.id || '');
        this.fullName      = profile.fullName || user.fullName;

        if (profile.profileImage) {
          this.profileImage =
            `http://localhost:8080/api/auth/profile-image/${profile.id}?t=${Date.now()}`;

          const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({
            ...savedUser,
            profileImage: this.profileImage
          }));

          this.cdr.detectChanges();  // ✅ AJOUTER
        }
      },
      error: () => {
        this.form.clientId = String(user.id || '');
      }
    });
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
    Array.from(files).forEach(file => {
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
      case 1: return !!(this.form.policyNumber.trim() && this.form.incidentDate && this.form.incidentLocation.trim());
      case 2: return !!(this.form.description.trim() && this.form.clientId.trim() && this.form.clientEmail.trim() && this.form.clientEstimatedCost && this.form.claimType);
      case 3: return this.claimPhotos.length > 0 && this.isVehicleInfoValid();
      default: return false;
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
                             ? parseFloat(this.form.clientEstimatedCost) : null,
      vehicleBrand:        this.form.vehicleBrand,
      vehicleModel:        this.form.vehicleModel,
      vehicleYear:         this.form.vehicleYear
                             ? parseInt(this.form.vehicleYear) : null,
      vehicleCategory:     this.form.vehicleCategory,
      photoUrls:           []
    };

    formData.append('claim',
      new Blob([JSON.stringify(claimData)], { type: 'application/json' })
    );

    this.claimPhotos.forEach(photo => {
      formData.append('photos', photo);
    });

    this.http.post('http://localhost:8080/api/claims', formData)
      .subscribe({
        next: (response: any) => {
          alert('Sinistre déclaré avec succès ! Référence : '
            + (response.reference || response.id));
          this.router.navigate(['/client/my-claims']);
        },
        error: (err: any) => {
          console.error('Erreur:', err);
          alert(err.error?.message || 'Erreur lors de la soumission du sinistre');
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }
}