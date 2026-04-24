import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-contracts-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contracts.html'
})
export class ContractsComponent implements OnInit {

  fullName       = '';
  reindexLoading = false;
  reindexSuccess = false;
  reindexError   = false;
  chunksIndexed  = 0;

  // ← Pour annuler la requête
  private cancelReindex$ = new Subject<void>();

  autoGuarantees = [
    { label: 'Responsabilité Civile', value: 'Illimitée' },
    { label: 'Vol',                   value: '56 516 DT' },
    { label: 'Incendie',              value: '56 516 DT' },
    { label: 'Dommage collision',     value: '8 477 DT (franchise 5%)' },
    { label: 'Bris de glace',         value: '1 130 DT (franchise 5%)' },
    { label: 'Assistance remorquage', value: 'Premium' },
    { label: 'Voiture remplacement',  value: '15 jours' }
  ];

  schoolGuarantees = [
    { label: 'Incendie Bâtiment',     value: '500 000 DT' },
    { label: 'Incendie Mobilier',     value: '50 000 DT' },
    { label: 'RC Exploitation',       value: '100 000 DT' },
    { label: 'RC Professionnelle',    value: '100 000 DT' },
    { label: 'Individuelle Accident', value: '2 000 DT' },
    { label: 'Frais Médicaux',        value: '300 DT' }
  ];

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) this.fullName = user.fullName || '';
  }

  // ── Lance la réindexation ────────────────────
  reindexContracts() {
    this.reindexLoading = true;
    this.reindexSuccess = false;
    this.reindexError   = false;
    this.cancelReindex$ = new Subject<void>();
    this.cdr.detectChanges();

    this.http.post<any>(
      'http://localhost:8080/api/contract-rag/index', {}
    ).pipe(
      takeUntil(this.cancelReindex$) // ← annule si stop
    ).subscribe({
      next: (data: any) => {
        this.reindexLoading = false;
        this.reindexSuccess = true;
        this.chunksIndexed  = data.chunksIndexed || 0;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.reindexSuccess = false;
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        this.reindexLoading = false;
        this.reindexError   = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.reindexError = false;
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }

  // ── Arrête la réindexation ───────────────────
  stopReindex() {
    this.cancelReindex$.next();
    this.cancelReindex$.complete();
    this.reindexLoading = false;
    this.cdr.detectChanges();
    console.log('Réindexation annulée');
  }

  logout() {
    this.authService.logout();
  }
}