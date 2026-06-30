import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Claim } from '../../shared/models/claim.model';
import { environment } from '../../../environments/environment'; // ← AJOUTÉ

@Injectable({ providedIn: 'root' })
export class ClaimService {

  private apiUrl = `${environment.apiUrl}/api/claims`; // ← CORRIGÉ

  constructor(private http: HttpClient) {}

  submitClaim(formData: FormData) {
    return this.http.post<Claim>(
      `${this.apiUrl}/with-photos`, formData
    );
  }

  getMyClaims(clientId: string) {
    return this.http.get<Claim[]>(
      `${this.apiUrl}/client/${clientId}`
    );
  }

  getClaimById(id: number) {
    return this.http.get<Claim>(
      `${this.apiUrl}/${id}`
    );
  }

  getAllClaims() {
    return this.http.get<Claim[]>(this.apiUrl);
  }
}