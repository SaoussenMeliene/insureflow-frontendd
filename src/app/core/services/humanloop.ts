import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Review } from '../../shared/models/review.model';
import { environment } from '../../../environments/environment'; // ← AJOUTÉ

@Injectable({ providedIn: 'root' })
export class HumanloopService {

  private apiUrl = `${environment.apiUrl}/api/humanloop`; // ← CORRIGÉ

  constructor(private http: HttpClient) {}

  getPending() {
    return this.http.get<any[]>(
      `${this.apiUrl}/pending`
    );
  }

  getAll() {
    return this.http.get<any[]>(
      `${this.apiUrl}/all`
    );
  }

  getStats() {
    return this.http.get<any>(
      `${this.apiUrl}/stats`
    );
  }

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