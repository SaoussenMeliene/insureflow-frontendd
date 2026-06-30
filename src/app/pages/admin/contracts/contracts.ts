import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';


@Component({
  selector: 'app-contracts-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule,AdminSidebarComponent],
  templateUrl: './contracts.html'
})
export class ContractsComponent implements OnInit {

  fullName       = '';
  reindexLoading = false;
  reindexSuccess = false;
  reindexError   = false;
  chunksIndexed  = 0;
  sidebarCollapsed = false;
  pendingCount     = 0; 
  private cancelReindex$ = new Subject<void>();

  // ── AUTO ──────────────────────────────────────
  autoGuarantees = [
    { label: 'Responsabilité Civile', value: 'Illimitée' },
    { label: 'Vol',                   value: '56 516 DT' },
    { label: 'Incendie',              value: '56 516 DT' },
    { label: 'Dommage collision',     value: '8 477 DT (franchise 5%)' },
    { label: 'Bris de glace',         value: '1 130 DT (franchise 5%)' },
    { label: 'Assistance remorquage', value: 'Premium' },
    { label: 'Voiture remplacement',  value: '15 jours' }
  ];

  // ── SCOLAIRE ──────────────────────────────────
  schoolGuarantees = [
    { label: 'Incendie Bâtiment',     value: '500 000 DT' },
    { label: 'Incendie Mobilier',     value: '50 000 DT' },
    { label: 'RC Exploitation',       value: '100 000 DT' },
    { label: 'RC Professionnelle',    value: '100 000 DT' },
    { label: 'Individuelle Accident', value: '2 000 DT' },
    { label: 'Frais Médicaux',        value: '300 DT' }
  ];

  // ── HOME ──────────────────────────────────────
  homeGuarantees = [
    { label: 'Incendie et explosion', value: '200 000 DT' },
    { label: 'Vol et cambriolage',    value: '50 000 DT' },
    { label: 'Dégâts des eaux',       value: '30 000 DT' },
    { label: 'RC habitation',         value: '100 000 DT' }
  ];

  // ── HEALTH ────────────────────────────────────
  healthGuarantees = [
    { label: 'Décès accidentel',      value: '50 000 DT' },
    { label: 'Invalidité permanente', value: '50 000 DT' },
    { label: 'Frais médicaux',        value: '10 000 DT' },
    { label: 'Hospitalisation',       value: '5 000 DT' }
  ];

  // ── OTHER ─────────────────────────────────────
  otherGuarantees = [
    { label: 'RC exploitation',       value: '100 000 DT' },
    { label: 'Vol et cambriolage',    value: '50 000 DT' },
    { label: 'Bris de machine',       value: '30 000 DT' },
    { label: "Pertes d'exploitation", value: '20 000 DT' }
  ];

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef,
    private translate:   TranslateService,
    public  langService: LanguageService,
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) this.fullName = user.fullName || '';
  }

  toggleLang() {
    this.langService.toggle();
    this.cdr.detectChanges();
  }

 


  logout() {
    this.authService.logout();
  }
}