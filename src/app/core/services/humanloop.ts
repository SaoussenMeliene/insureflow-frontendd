import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Review } from '../../shared/models/review.model';

@Injectable({ providedIn: 'root' })
export class HumanloopService {

  private apiUrl = 'http://localhost:8080/api/humanloop';

  constructor(private http: HttpClient) {}

  // ── Cas en attente ───────────────────────────
  getPending() {
    return this.http.get<any[]>(
      `${this.apiUrl}/pending`
    );
  }

  // ── Tous les cas ─────────────────────────────
  getAll() {
    return this.http.get<any[]>(
      `${this.apiUrl}/all`
    );
  }

  // ── Statistiques ─────────────────────────────
  getStats() {
    return this.http.get<any>(
      `${this.apiUrl}/stats`
    );
  }

  // ── Prendre une décision ─────────────────────
  makeDecision(id: number,
               reviewerName: string,
               finalDecision: string,
               reviewerComment: string,
               rejectionMotif?: string) {
    return this.http.post<any>(
      `${this.apiUrl}/${id}/decision`,
      {
        reviewerName,
        finalDecision,
        reviewerComment,
        rejectionMotif
      }
    );
  }
}