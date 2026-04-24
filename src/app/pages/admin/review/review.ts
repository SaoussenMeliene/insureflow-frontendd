import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './review.html',
  styleUrls: ['./review.css']
})
export class ReviewComponent implements OnInit, OnDestroy {

  fullName           = '';
  activeTab: 'pending' | 'all' = 'pending';
  selectedFraudType  = '';
  selectedClaimType  = '';
  isLoading          = true;

  reviews: any[]        = [];
  filteredClaims: any[] = [];

  showReviewModal       = false;
  selectedReviewClaim: any = null;
  reviewerComment       = '';
  rejectionMotif        = '';
  decisionLoading       = false;

  toastMessage = '';
  toastType    = '';
  showToast    = false;

  private paramsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef,
    private route:       ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser?.();
    if (user?.fullName) this.fullName = user.fullName;

    this.paramsSub = this.route.queryParams.subscribe(params => {
      const claimId = params['claimId'];

      // ✅ Reset complet avant chaque navigation
      this.showReviewModal     = false;
      this.selectedReviewClaim = null;
      this.reviews             = [];
      this.filteredClaims      = [];
      this.isLoading           = true;
      this.cdr.detectChanges();

      if (claimId) {
        this.loadReviewsAndOpen(Number(claimId));
      } else {
        this.loadReviews();
      }
    });
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe();
  }

  // ── Charge les reviews ────────────────────────
  loadReviews(): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:8080/api/humanloop/all')
      .subscribe({
        next: (data) => {
          this.reviews   = data;
          this.isLoading = false;
          this.enrichReviewsWithWorkflow();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ── Enrichit reviews avec données orchestrator ─
  enrichReviewsWithWorkflow(): void {
    this.http.get<any[]>(
      'http://localhost:8080/api/orchestrator/workflows'
    ).subscribe({
      next: (workflows: any[]) => {
        const workflowMap = new Map(
          workflows.map(w => [w.claimId, w])
        );

        this.reviews = this.reviews.map(review => {
          const wf = workflowMap.get(review.claimId);
          if (wf) {
            return {
              ...review,
              overallScore:      wf.overallScore      || review.overallScore,
              humanReviewReason: wf.humanReviewReason || review.humanReviewReason,
              fraudType:         wf.fraudType         || review.fraudType
            };
          }
          return review;
        });

        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  // ── Charge reviews + enrichit + ouvre modal ───
  loadReviewsAndOpen(claimId: number): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:8080/api/humanloop/all')
      .subscribe({
        next: (data) => {
          this.reviews   = data;
          this.isLoading = false;

          // ✅ Enrichit AVANT d'ouvrir le modal
          this.http.get<any[]>(
            'http://localhost:8080/api/orchestrator/workflows'
          ).subscribe({
            next: (workflows: any[]) => {
              const workflowMap = new Map(
                workflows.map(w => [w.claimId, w])
              );

              this.reviews = this.reviews.map(review => {
                const wf = workflowMap.get(review.claimId);
                if (wf) {
                  return {
                    ...review,
                    overallScore:      wf.overallScore      || review.overallScore,
                    humanReviewReason: wf.humanReviewReason || review.humanReviewReason,
                    fraudType:         wf.fraudType         || review.fraudType
                  };
                }
                return review;
              });

              this.applyFilters();
              this.cdr.detectChanges();

              // ✅ Cherche la review enrichie
              const review = this.reviews.find(
                r => r.claimId == claimId
              );

              if (review) {
                this.openReviewModal(review);
              } else {
                this.openReviewModalByClaimId(claimId);
              }
            },
            error: () => {
              // Orchestrator inaccessible → ouvre quand même
              this.applyFilters();
              const review = this.reviews.find(
                r => r.claimId == claimId
              );
              if (review) {
                this.openReviewModal(review);
              } else {
                this.openReviewModalByClaimId(claimId);
              }
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.isLoading = false;
          // Si humanloop inaccessible → charge directement via claimId
          this.openReviewModalByClaimId(claimId);
          this.cdr.detectChanges();
        }
      });
  }

  // ── Ouvrir modal — charge claim + workflow ────
  openReviewModal(review: any): void {
    this.selectedReviewClaim = review;
    this.reviewerComment     = '';
    this.rejectionMotif      = '';
    this.showReviewModal     = true;
    this.cdr.detectChanges();

    this.http.get<any>(
      `http://localhost:8080/api/claims/${review.claimId}`
    ).subscribe({
      next: (claim: any) => {
        this.http.get<any>(
          `http://localhost:8080/api/orchestrator/workflow/${review.claimId}`
        ).subscribe({
          next: (workflow: any) => {
            this.selectedReviewClaim = {
              ...review,
              photoUrls:          claim.photoUrls         || [],
              vehicleBrand:       claim.vehicleBrand      || null,
              vehicleModel:       claim.vehicleModel      || null,
              vehicleYear:        claim.vehicleYear       || null,
              clientEmail:        claim.clientEmail       || null,
              incidentDate:       claim.incidentDate      || null,
              incidentLocation:   claim.incidentLocation  || null,
              description:        claim.description       || null,
              policyNumber:       claim.policyNumber      || null,
              // ✅ Données orchestrator prioritaires
              overallScore:       workflow.overallScore       || review.overallScore,
              humanReviewReason:  workflow.humanReviewReason  || review.humanReviewReason,
              fraudType:          workflow.fraudType          || review.fraudType,
              fraudScore:         workflow.fraudScore         || review.fraudScore,
              fraudDetected:      workflow.fraudDetected      || false,
              contractDecision:   workflow.contractDecision   || null,
              estimatedCostMin:   workflow.estimatedCostMin   || null,
              estimatedCostMax:   workflow.estimatedCostMax   || null,
              estimationSeverity: workflow.estimationSeverity || null
            };
            this.cdr.detectChanges();
          },
          error: () => {
            this.selectedReviewClaim = {
              ...review,
              photoUrls:        claim.photoUrls        || [],
              vehicleBrand:     claim.vehicleBrand     || null,
              vehicleModel:     claim.vehicleModel     || null,
              vehicleYear:      claim.vehicleYear      || null,
              clientEmail:      claim.clientEmail      || null,
              incidentDate:     claim.incidentDate     || null,
              incidentLocation: claim.incidentLocation || null,
              description:      claim.description      || null,
              policyNumber:     claim.policyNumber     || null
            };
            this.cdr.detectChanges();
          }
        });
      },
      error: () => this.cdr.detectChanges()
    });
  }

  // ── Ouvre modal directement via claimId ───────
  openReviewModalByClaimId(claimId: number): void {
    this.http.get<any>(
      `http://localhost:8080/api/claims/${claimId}`
    ).subscribe({
      next: (claim: any) => {
        this.http.get<any>(
          `http://localhost:8080/api/orchestrator/workflow/${claimId}`
        ).subscribe({
          next: (workflow: any) => {
            this.selectedReviewClaim = {
              claimId:            claimId,
              claimReference:     claim.reference,
              claimType:          claim.claimType,
              policyNumber:       claim.policyNumber,
              description:        claim.description,
              incidentLocation:   claim.incidentLocation,
              incidentDate:       claim.incidentDate,
              photoUrls:          claim.photoUrls    || [],
              vehicleBrand:       claim.vehicleBrand || null,
              vehicleModel:       claim.vehicleModel || null,
              vehicleYear:        claim.vehicleYear  || null,
              clientEmail:        claim.clientEmail  || null,
              createdAt:          claim.createdAt,
              overallScore:       workflow.overallScore      || 0,
              humanReviewReason:  workflow.humanReviewReason || '',
              fraudType:          workflow.fraudType         || '',
              fraudScore:         workflow.fraudScore        || 0,
              fraudDetected:      workflow.fraudDetected     || false,
              contractDecision:   workflow.contractDecision  || null,
              estimatedCostMin:   workflow.estimatedCostMin  || null,
              estimatedCostMax:   workflow.estimatedCostMax  || null,
              estimationSeverity: workflow.estimationSeverity|| null
            };
            this.showReviewModal = true;
            this.cdr.detectChanges();
          },
          error: () => {
            this.selectedReviewClaim = {
              claimId:          claimId,
              claimReference:   claim.reference,
              claimType:        claim.claimType,
              policyNumber:     claim.policyNumber,
              description:      claim.description,
              incidentLocation: claim.incidentLocation,
              incidentDate:     claim.incidentDate,
              photoUrls:        claim.photoUrls || [],
              vehicleBrand:     claim.vehicleBrand || null,
              vehicleModel:     claim.vehicleModel || null,
              vehicleYear:      claim.vehicleYear  || null,
              clientEmail:      claim.clientEmail  || null,
              createdAt:        claim.createdAt,
              overallScore:     0
            };
            this.showReviewModal = true;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => this.cdr.detectChanges()
    });
  }

  closeReviewModal(): void {
    this.showReviewModal     = false;
    this.selectedReviewClaim = null;
    this.cdr.detectChanges();
  }

  // ── Stats ─────────────────────────────────────
  get pendingCount(): number {
    return this.reviews.filter(r => r.status === 'PENDING').length;
  }

  get suspectedFraudCount(): number {
    return this.reviews.filter(
      r => r.humanReviewReason?.includes('Fraude')).length;
  }

  get averageConfidence(): number {
    if (!this.filteredClaims.length) return 0;
    const sum = this.filteredClaims.reduce(
      (acc, c) => acc + ((c.overallScore || 0) * 100), 0);
    return Math.round(sum / this.filteredClaims.length);
  }

  // ── Filtres ───────────────────────────────────
  applyFilters(): void {
    let data = [...this.reviews];
    if (this.activeTab === 'pending') {
      data = data.filter(r => r.status === 'PENDING');
    }
    if (this.selectedClaimType) {
      data = data.filter(r => r.claimType === this.selectedClaimType);
    }
    this.filteredClaims = data;
    this.cdr.detectChanges();
  }

  // ── Filtre les URLs invalides ─────────────────
  getValidPhotos(photoUrls: any[]): string[] {
    if (!photoUrls || !Array.isArray(photoUrls)) return [];
    return photoUrls.filter(url =>
      url &&
      typeof url === 'string' &&
      !url.includes('localhost') &&
      !url.includes('storage/') &&
      (url.startsWith('https://') || url.startsWith('http://'))
    );
  }

  // ── Reconstruit la raison sans le score ───────
  getReason(claim: any): string {
    if (!claim?.humanReviewReason) return '—';
    return claim.humanReviewReason
      .replace(/Score global\s*:\s*[\d.]+\.\s*/i, '')
      .trim() || claim.humanReviewReason;
  }

  // ── Décision APPROVE / REJECT ─────────────────
  makeDecision(finalDecision: string): void {
    if (finalDecision === 'REJECT' && !this.rejectionMotif.trim()) {
      this.showToastMessage('Motif de rejet obligatoire !', 'error');
      return;
    }

    this.decisionLoading = true;
    this.cdr.detectChanges();

    this.http.post<any>(
      `http://localhost:8080/api/humanloop/${this.selectedReviewClaim.id}/decision`,
      {
        reviewerName:    this.fullName,
        finalDecision:   finalDecision,
        reviewerComment: this.reviewerComment,
        rejectionMotif:  this.rejectionMotif
      }
    ).subscribe({
      next: () => {
        this.decisionLoading = false;
        this.showReviewModal = false;
        this.loadReviews();
        this.showToastMessage(
          finalDecision === 'APPROVE' ?
            '✅ Sinistre approuvé !' : '❌ Sinistre rejeté.',
          finalDecision === 'APPROVE' ? 'success' : 'error'
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.decisionLoading = false;
        console.error('Erreur décision :', err);
        this.showToastMessage('Erreur lors de la décision', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Ouvrir photo ──────────────────────────────
  openPhoto(url: string): void {
    window.open(url, '_blank');
  }

  // ── Helpers ───────────────────────────────────
  getFraudLabel(reason: string): string {
    if (!reason) return '';
    if (reason.includes('PRICE_INFLATION'))      return 'PRICE INFLATION';
    if (reason.includes('DESCRIPTION_MISMATCH')) return 'DESCRIPTION MISMATCH';
    if (reason.includes('Fraude'))               return 'FRAUDE SUSPECTÉE';
    return '';
  }

  getConfidenceColor(score: number): string {
    const pct = score * 100;
    if (pct >= 80) return '#10b981';
    if (pct >= 60) return '#f97316';
    return '#ef4444';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('fr-FR');
  }

  showToastMessage(message: string, type: string): void {
    this.toastMessage = message;
    this.toastType    = type;
    this.showToast    = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  logout(): void {
    this.authService.logout?.();
  }
}