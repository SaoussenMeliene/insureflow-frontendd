import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, AdminSidebarComponent],
  templateUrl: './claims.html',
  styleUrl: './claims.css'
})
export class ClaimsComponent implements OnInit {

  fullName     = '';
  isLoading    = true;
  searchQuery  = '';
  filterType   = 'all';
  filterStatus = 'all';
  claims: any[] = [];

  showConfirm     = false;
  selectedClaim: any = null;

  showPipeline    = false;
  pipelineSteps: any[] = [];
  pipelineResult: any  = null;
  pipelineLoading = false;

  showDecision    = false;
  reviewerComment = '';
  rejectionMotif  = '';
  decisionLoading = false;
  decisionSent    = false;

  toastMessage = '';
  toastType    = '';
  showToast    = false;
  sidebarCollapsed = false;
  pendingCount     = 0;

  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef,
    private router:      Router,
    private translate:   TranslateService,
    public  langService: LanguageService,
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) this.fullName = user.fullName || '';
    this.loadClaims();
  }

  loadClaims() {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/claims`) // ← CORRIGÉ
      .subscribe({
        next: (data: any[]) => {
          this.claims = data.sort((a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isLoading = false; }
      });
  }

  toggleLang() {
    this.langService.toggle();
    this.cdr.detectChanges();
  }

  get filteredClaims(): any[] {
    return this.claims.filter(c => {
      const matchSearch = !this.searchQuery ||
        c.reference?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchType   = this.filterType === 'all' || c.claimType === this.filterType;
      const matchStatus = this.filterStatus === 'all' || c.status === this.filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }

  openConfirm(claim: any) {
    this.selectedClaim  = claim;
    this.showConfirm    = true;
    this.pipelineResult = null;
    this.cdr.detectChanges();
  }

  cancelConfirm() {
    this.showConfirm   = false;
    this.selectedClaim = null;
    this.cdr.detectChanges();
  }

  confirmPipeline() {
    this.showConfirm     = false;
    this.showPipeline    = true;
    this.pipelineLoading = true;
    this.pipelineResult  = null;
    this.reviewerComment = '';
    this.rejectionMotif  = '';
    this.decisionSent    = false;

    this.pipelineSteps = [
      { label: 'Router Agent — Classification',     status: 'pending', result: '' },
      { label: 'Contract RAG — Validation contrat', status: 'pending', result: '' },
      { label: 'Estimation Agent — Calcul coût',    status: 'pending', result: '' },
      { label: 'Fraud Agent — Détection fraude',    status: 'pending', result: '' }
    ];
    this.cdr.detectChanges();

    this.animateSteps(() => {
      this.http.post<any>(
        `${this.api}/api/orchestrator/process`, // ← CORRIGÉ
        {
          claimId:             this.selectedClaim.id,
          reference:           this.selectedClaim.reference,
          policyNumber:        this.selectedClaim.policyNumber,
          claimType:           this.selectedClaim.claimType,
          description:         this.selectedClaim.description,
          incidentLocation:    this.selectedClaim.incidentLocation,
          incidentDate:        this.selectedClaim.incidentDate,
          photoUrls:           this.selectedClaim.photoUrls || [],
          clientEstimatedCost: this.selectedClaim.clientEstimatedCost,
          vehicleBrand:        this.selectedClaim.vehicleBrand,
          vehicleModel:        this.selectedClaim.vehicleModel,
          vehicleYear:         this.selectedClaim.vehicleYear,
          vehicleCategory:     this.selectedClaim.vehicleCategory
        }
      ).subscribe({
        next: (result: any) => {
          this.pipelineResult  = result;
          this.pipelineLoading = false;
          this.updateStepsWithResult(result);
          this.loadClaims();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur pipeline :', err);
          this.pipelineLoading = false;
          this.pipelineSteps.forEach(s => {
            if (s.status === 'loading' || s.status === 'pending')
              s.status = 'error';
          });
          this.showToastMessage('Erreur lors du pipeline IA', 'error');
          this.cdr.detectChanges();
        }
      });
    });
  }

  private animateSteps(callback: () => void) {
    let i = 0;
    const next = () => {
      if (i < this.pipelineSteps.length) {
        this.pipelineSteps[i].status = 'loading';
        this.cdr.detectChanges();
        setTimeout(() => { i++; next(); }, 800);
      } else {
        callback();
      }
    };
    next();
  }

  private updateStepsWithResult(result: any) {
    if (this.pipelineSteps[0]) {
      this.pipelineSteps[0].status = 'done';
      this.pipelineSteps[0].result = result.routerDecision || result.claimType || '—';
    }
    if (this.pipelineSteps[1]) {
      this.pipelineSteps[1].status = 'done';
      this.pipelineSteps[1].result = result.contractDecision || '—';
    }
    if (this.pipelineSteps[2]) {
      this.pipelineSteps[2].status = 'done';
      this.pipelineSteps[2].result =
        result.estimatedCostMin && result.estimatedCostMax ?
        `${result.estimatedCostMin}-${result.estimatedCostMax} DT` :
        result.estimationSeverity || '—';
    }
    if (this.pipelineSteps[3]) {
      this.pipelineSteps[3].status = 'done';
      this.pipelineSteps[3].result =
        result.fraudDetected ? `⚠ ${result.fraudType}` : '✓ Aucune fraude';
    }
    this.cdr.detectChanges();
  }

  viewPipelineResult(claim: any) {
    this.selectedClaim   = claim;
    this.showPipeline    = true;
    this.pipelineLoading = true;
    this.pipelineResult  = null;
    this.decisionSent    = false;
    this.pipelineSteps   = [
      { label: 'Router Agent — Classification',     status: 'pending', result: '' },
      { label: 'Contract RAG — Validation contrat', status: 'pending', result: '' },
      { label: 'Estimation Agent — Calcul coût',    status: 'pending', result: '' },
      { label: 'Fraud Agent — Détection fraude',    status: 'pending', result: '' }
    ];
    this.cdr.detectChanges();

    this.http.get<any>(
      `${this.api}/api/orchestrator/workflow/${claim.id}` // ← CORRIGÉ
    ).subscribe({
      next: (result: any) => {
        result.workflowStatus = claim.status;
        this.pipelineResult  = result;
        this.pipelineLoading = false;
        this.pipelineSteps = [
          { label: 'Router Agent — Classification',
            status: 'done',
            result: result.routerDecision || claim.claimType || '—' },
          { label: 'Contract RAG — Validation contrat',
            status: 'done',
            result: result.contractDecision || '—' },
          { label: 'Estimation Agent — Calcul coût',
            status: 'done',
            result: result.estimatedCostMin && result.estimatedCostMax ?
              `${result.estimatedCostMin}-${result.estimatedCostMax} DT` :
              result.estimationSeverity || '—' },
          { label: 'Fraud Agent — Détection fraude',
            status: 'done',
            result: result.fraudDetected ?
              `⚠ ${result.fraudType}` :
              result.humanReviewReason?.includes('Fraude') ?
              `⚠ ${result.humanReviewReason.match(/Fraude suspectée : (\w+)/)?.[1] || 'Fraude'}` :
              '✓ Aucune fraude' }
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.pipelineLoading = false;
        this.pipelineSteps.forEach(s => s.status = 'done');
        this.cdr.detectChanges();
      }
    });
  }

  makeDecision(finalDecision: string) {
    if (finalDecision === 'REJECT' && !this.rejectionMotif.trim()) {
      this.showToastMessage('Motif de rejet obligatoire !', 'error');
      return;
    }

    this.decisionLoading = true;
    this.cdr.detectChanges();

    const reviewId = this.pipelineResult?.humanReviewId ||
                     this.pipelineResult?.reviewId;

    if (!reviewId) {
      this.showToastMessage(
        'Aucune révision humaine trouvée pour ce sinistre', 'error');
      this.decisionLoading = false;
      return;
    }

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
        this.decisionSent    = true;
        this.showPipeline    = false;
        this.loadClaims();
        this.showToastMessage(
          finalDecision === 'APPROVE' ?
            '✅ Sinistre approuvé avec succès !' : '❌ Sinistre rejeté.',
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

  closePipeline() {
    this.showPipeline   = false;
    this.pipelineResult = null;
    this.selectedClaim  = null;
    this.cdr.detectChanges();
  }

  goToReview() {
    const claimId = this.selectedClaim?.id;
    this.showPipeline   = false;
    this.pipelineResult = null;
    this.selectedClaim  = null;
    this.cdr.detectChanges();
    this.router.navigate(['/admin/review'], {
      queryParams: { claimId: claimId, t: Date.now() }
    });
  }

  showToastMessage(message: string, type: string) {
    this.toastMessage = message;
    this.toastType    = type;
    this.showToast    = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  getStatusClass(status: string): string {
    const map: { [k: string]: string } = {
      'SUBMITTED':      'bg-blue-100 text-blue-700',
      'COMPLETED':      'bg-green-100 text-green-700',
      'HUMAN_REQUIRED': 'bg-orange-100 text-orange-700',
      'APPROVED':       'bg-emerald-100 text-emerald-700',
      'REJECTED':       'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusLabel(status: string): string {
    const map: { [k: string]: string } = {
      'SUBMITTED':      'Soumis',
      'COMPLETED':      'Complété',
      'HUMAN_REQUIRED': 'Révision',
      'APPROVED':       'Approuvé',
      'REJECTED':       'Rejeté'
    };
    return map[status] || status;
  }

  getScoreColor(score: number): string {
    if (score >= 0.80) return 'text-green-600';
    if (score >= 0.60) return 'text-orange-500';
    return 'text-red-500';
  }

  getStepIcon(status: string): string {
    if (status === 'done')    return '✅';
    if (status === 'loading') return '🔄';
    if (status === 'error')   return '❌';
    return '⏳';
  }

  getScoreBg(score: number): string {
    if (score >= 0.80) return 'bg-green-100 text-green-700';
    if (score >= 0.60) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  }

  logout() {
    this.authService.logout();
  }
}