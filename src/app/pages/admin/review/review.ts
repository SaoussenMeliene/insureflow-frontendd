import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, AdminSidebarComponent],
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
  sidebarCollapsed = false;

  private paramsSub?: Subscription;
  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef,
    private route:       ActivatedRoute,
    private translate:   TranslateService,
    public  langService: LanguageService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser?.();
    if (user?.fullName) this.fullName = user.fullName;

    this.paramsSub = this.route.queryParams.subscribe(params => {
      const claimId = params['claimId'];
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

  loadReviews(): void {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/humanloop/all`) // ← CORRIGÉ
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

  enrichReviewsWithWorkflow(): void {
    this.http.get<any[]>(
      `${this.api}/api/orchestrator/workflows` // ← CORRIGÉ
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

  toggleLang() {
    this.langService.toggle();
    this.cdr.detectChanges();
  }

  loadReviewsAndOpen(claimId: number): void {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/humanloop/all`) // ← CORRIGÉ
      .subscribe({
        next: (data) => {
          this.reviews   = data;
          this.isLoading = false;

          console.log('Toutes les reviews claimIds:', data.map(r => r.claimId));
          console.log('Cherche claimId:', claimId, typeof claimId);
          console.log('Match strict:', data.find(r => r.claimId === claimId));
          console.log('Match loose:', data.find(r => r.claimId == claimId));
          console.log('Toutes les reviews:', data.map(r => ({
            id: r.id, claimId: r.claimId, status: r.status
          })));

          const foundDirect = data.find(r => r.claimId == claimId);
          console.log('Review trouvée directement:', foundDirect);

          this.http.get<any[]>(`${this.api}/api/orchestrator/workflows`) // ← CORRIGÉ
            .subscribe({
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

                const review = this.reviews.find(r => r.claimId == claimId);
                console.log('Review après enrichissement:', review);

                if (review) {
                  this.openReviewModal(review);
                } else {
                  this.openReviewModalByClaimId(claimId);
                }
              },
              error: () => {
                this.applyFilters();
                const review = this.reviews.find(r => r.claimId == claimId);
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
          this.openReviewModalByClaimId(claimId);
          this.cdr.detectChanges();
        }
      });
  }

  openReviewModal(review: any): void {
    this.selectedReviewClaim = review;
    this.reviewerComment     = '';
    this.rejectionMotif      = '';
    this.showReviewModal     = true;
    this.cdr.detectChanges();

    this.http.get<any>(
      `${this.api}/api/claims/${review.claimId}` // ← CORRIGÉ
    ).subscribe({
      next: (claim: any) => {
        this.http.get<any>(
          `${this.api}/api/orchestrator/workflow/${review.claimId}` // ← CORRIGÉ
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
            console.log('selectedReviewClaim final:', this.selectedReviewClaim);
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

  openReviewModalByClaimId(claimId: number): void {
    this.http.get<any[]>(`${this.api}/api/humanloop/all`) // ← CORRIGÉ
      .subscribe({
        next: (reviews) => {
          const existingReview = reviews.find(r => r.claimId == claimId);
          console.log('openReviewModalByClaimId — existingReview:', existingReview);

          if (existingReview) {
            this.openReviewModal(existingReview);
          } else {
            this.http.get<any>(`${this.api}/api/claims/${claimId}`) // ← CORRIGÉ
              .subscribe({
                next: (claim: any) => {
                  this.selectedReviewClaim = {
                    claimId:          claimId,
                    claimReference:   claim.reference,
                    claimType:        claim.claimType,
                    policyNumber:     claim.policyNumber,
                    description:      claim.description,
                    incidentLocation: claim.incidentLocation,
                    incidentDate:     claim.incidentDate,
                    photoUrls:        claim.photoUrls    || [],
                    vehicleBrand:     claim.vehicleBrand || null,
                    vehicleModel:     claim.vehicleModel || null,
                    vehicleYear:      claim.vehicleYear  || null,
                    clientEmail:      claim.clientEmail  || null,
                    createdAt:        claim.createdAt,
                    overallScore:     0
                  };
                  this.showReviewModal = true;
                  this.cdr.detectChanges();
                },
                error: () => this.cdr.detectChanges()
              });
          }
        },
        error: () => this.cdr.detectChanges()
      });
  }

  closeReviewModal(): void {
    this.showReviewModal     = false;
    this.selectedReviewClaim = null;
    this.cdr.detectChanges();
  }

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

  getReason(claim: any): string {
    if (!claim?.humanReviewReason) return '—';
    return claim.humanReviewReason
      .replace(/Score global\s*:\s*[\d.]+\.\s*/i, '')
      .trim() || claim.humanReviewReason;
  }

  makeDecision(finalDecision: string): void {
    if (finalDecision === 'REJECT' && !this.rejectionMotif.trim()) {
      this.showToastMessage('Motif de rejet obligatoire !', 'error');
      return;
    }

    const reviewId = this.selectedReviewClaim?.id;
    console.log('makeDecision — reviewId:', reviewId);

    if (!reviewId) {
      this.showToastMessage('❌ Aucune review humanloop pour ce sinistre !', 'error');
      return;
    }

    this.decisionLoading = true;
    this.cdr.detectChanges();

    this.http.post<any>(
      `${this.api}/api/humanloop/${reviewId}/decision`, // ← CORRIGÉ
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

  openPhoto(url: string): void {
    window.open(url, '_blank');
  }

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