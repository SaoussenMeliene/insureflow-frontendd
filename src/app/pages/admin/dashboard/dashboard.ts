import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HumanloopService } from '../../../core/services/humanloop';
import { ClaimService } from '../../../core/services/claim';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, AdminSidebarComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  sidebarCollapsed = false;
  pendingCount     = 0;
  fullName         = '';
  loading          = true;

  private api = environment.apiUrl;

  stats = {
    totalClaims:    0,
    pendingReview:  0,
    approved:       0,
    rejected:       0,
    automationRate: 0,
    fraudsDetected: 0,
    averageScore:   0
  };

  recentClaims: any[]           = [];
  pipelineRows: any[]           = [];
  workflowMap: Map<number, any> = new Map();

  fraudCounts = {
    NO_FRAUD:               0,
    PRICE_INFLATION:        0,
    DESCRIPTION_MISMATCH:   0,
    INTERNAL_INCONSISTENCY: 0
  };

  constructor(
    private authService:      AuthService,
    private humanloopService: HumanloopService,
    private claimService:     ClaimService,
    private http:             HttpClient,
    private cdr:              ChangeDetectorRef,
    private translate:        TranslateService,
    public  langService:      LanguageService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) this.fullName = user.fullName || '';

    this.translate.onLangChange.subscribe(() => {
      this.cdr.detectChanges();
    });

    forkJoin({
      claims:    this.claimService.getAllClaims(),
      stats:     this.humanloopService.getStats(),
      reviews:   this.humanloopService.getAll(),
      workflows: this.http.get<any[]>(`${this.api}/api/orchestrator/workflows`)
    }).subscribe({
      next: ({ claims, stats, reviews, workflows }: any) => {
        this.workflowMap = new Map(
          (workflows || []).map((w: any) => [w.claimId, w])
        );

        const sorted = [...claims].sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        this.recentClaims = sorted.slice(0, 10);

        const wfList = workflows || [];

        const countFraudType = (type: string) => {
          return wfList.filter((w: any) => {
            const types: string[] = w.fraudTypes ?
              w.fraudTypes.split(',') :
              (w.fraudType ? [w.fraudType] : []);
            return types.includes(type);
          }).length;
        };

        const priceInflation        = countFraudType('PRICE_INFLATION');
        const descMismatch          = countFraudType('DESCRIPTION_MISMATCH');
        const internalInconsistency = countFraudType('INTERNAL_INCONSISTENCY');

        const fraudsDetected = priceInflation + descMismatch + internalInconsistency;

        this.fraudCounts = {
          NO_FRAUD:               Math.max(0, reviews.length - fraudsDetected),
          PRICE_INFLATION:        priceInflation,
          DESCRIPTION_MISMATCH:   descMismatch,
          INTERNAL_INCONSISTENCY: internalInconsistency
        };

        this.pipelineRows = reviews.slice(0, 6);

        const completed = claims.filter((c: any) => c.status === 'COMPLETED').length;
        const autoRate  = claims.length > 0 ?
          Math.round((completed / claims.length) * 100) : 0;

        const avgScore = wfList.length > 0 ?
          Math.round(
            wfList.reduce((acc: number, w: any) => acc + (w.overallScore || 0), 0)
            / wfList.length * 100
          ) / 100 : 0;

        this.stats = {
          totalClaims:    claims.length,
          pendingReview:  claims.filter((c: any) => c.status === 'HUMAN_REQUIRED').length,
          approved:       claims.filter((c: any) => c.status === 'APPROVED').length,
          rejected:       claims.filter((c: any) => c.status === 'REJECTED').length,
          automationRate: autoRate,
          fraudsDetected: fraudsDetected,
          averageScore:   avgScore
        };

        this.pendingCount = this.stats.pendingReview;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur dashboard :', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleLang(): void {
    this.langService.toggle();
    this.cdr.detectChanges();
  }

  get overviewCards() {
    return [
      {
        label:      this.translate.instant('admin.dashboard.totalClaims'),
        value:      this.stats.totalClaims,
        icon:       'folder',
        iconBg:     'bg-sky-100',
        iconColor:  'text-sky-600',
        valueColor: 'text-sky-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.pendingReview'),
        value:      this.stats.pendingReview,
        icon:       'warning',
        iconBg:     'bg-amber-100',
        iconColor:  'text-amber-600',
        valueColor: 'text-amber-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.approved'),
        value:      this.stats.approved,
        icon:       'check',
        iconBg:     'bg-emerald-100',
        iconColor:  'text-emerald-600',
        valueColor: 'text-emerald-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.rejected'),
        value:      this.stats.rejected,
        icon:       'x',
        iconBg:     'bg-rose-100',
        iconColor:  'text-rose-600',
        valueColor: 'text-rose-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.automationRate'),
        value:      this.formatPercentage(this.stats.automationRate),
        icon:       'cpu',
        iconBg:     'bg-teal-100',
        iconColor:  'text-teal-600',
        valueColor: 'text-teal-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.fraudDetected'),
        value:      this.stats.fraudsDetected,
        icon:       'shield',
        iconBg:     'bg-rose-100',
        iconColor:  'text-rose-600',
        valueColor: 'text-rose-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.avgAiScore'),
        value:      this.formatScore(this.stats.averageScore),
        icon:       'sparkles',
        iconBg:     'bg-sky-100',
        iconColor:  'text-sky-600',
        valueColor: 'text-sky-600'
      }
    ];
  }

  get recentActivity() {
    return this.recentClaims.map((claim: any) => {
      const wf          = this.workflowMap.get(claim.id);
      const isProcessed = claim.status !== 'SUBMITTED';
      const score       = isProcessed && wf?.overallScore ?
        `${Math.round(wf.overallScore * 100)}%` : '—';

      const fraudType = isProcessed ? (
        wf?.fraudType ||
        (wf?.humanReviewReason?.includes('PRICE_INFLATION') ?        'PRICE_INFLATION' :
         wf?.humanReviewReason?.includes('DESCRIPTION_MISMATCH') ?   'DESCRIPTION_MISMATCH' :
         wf?.humanReviewReason?.includes('INTERNAL_INCONSISTENCY') ? 'INTERNAL_INCONSISTENCY' :
         wf?.humanReviewReason?.includes('Fraude') ?                  'FRAUD' : 'NO_FRAUD')
      ) : 'NO_FRAUD';

      return {
        reference: claim.reference,
        type:      claim.claimType,
        status:    claim.status,
        score:     score,
        fraud:     fraudType === 'NO_FRAUD' ? '✓' : '✗',
        date:      this.formatDate(claim.createdAt),
        action:    claim.status === 'HUMAN_REQUIRED' ? 'Examiner' : ''
      };
    });
  }

  get fraudCards() {
    return [
      {
        label:      this.translate.instant('admin.dashboard.fraud.noFraud'),
        value:      this.fraudCounts.NO_FRAUD,
        valueColor: 'text-emerald-600'
      },
      {
        label:      this.translate.instant('admin.dashboard.fraud.priceInflation'),
        value:      this.fraudCounts.PRICE_INFLATION,
        valueColor: 'text-rose-500'
      },
      {
        label:      this.translate.instant('admin.dashboard.fraud.descMismatch'),
        value:      this.fraudCounts.DESCRIPTION_MISMATCH,
        valueColor: 'text-amber-500'
      },
      {
        label:      this.translate.instant('admin.dashboard.fraud.internalInconsistency'),
        value:      this.fraudCounts.INTERNAL_INCONSISTENCY,
        valueColor: 'text-yellow-500'
      }
    ];
  }

  getStatusBadge(status: string): string {
    const map: { [k: string]: string } = {
      'SUBMITTED':      'bg-sky-100 text-sky-700',
      'HUMAN_REQUIRED': 'bg-amber-100 text-amber-700',
      'COMPLETED':      'bg-violet-100 text-violet-700',
      'APPROVED':       'bg-emerald-100 text-emerald-700',
      'REJECTED':       'bg-rose-100 text-rose-700'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  getScoreText(score: string): string {
    if (score === '—') return 'text-slate-400';
    const value = parseInt(score, 10);
    if (value >= 85) return 'text-emerald-600';
    if (value >= 60) return 'text-amber-600';
    return 'text-rose-500';
  }

  getStatusLabel(status: string): string {
    return this.translate.instant('status.' + status) || status;
  }

  getFraudLabel(type: string): string {
    const map: { [k: string]: string } = {
      'NO_FRAUD':               '✓',
      'PRICE_INFLATION':        this.translate.instant('admin.dashboard.fraud.priceInflation'),
      'DESCRIPTION_MISMATCH':   this.translate.instant('admin.dashboard.fraud.descMismatch'),
      'INTERNAL_INCONSISTENCY': this.translate.instant('admin.dashboard.fraud.internalInconsistency'),
      'FRAUD':                  '⚠ ' + this.translate.instant('admin.dashboard.fraud.generic')
    };
    return map[type] || '✓';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('fr-FR');
  }

  formatPercentage(value: number): string {
    if (!value) return '0%';
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  }

  formatScore(value: number): string {
    if (!value) return '0.00';
    return Number(value).toFixed(2);
  }

  logout(): void {
    this.authService.logout();
  }
}