import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Claim } from '../../shared/models/claim.model';

@Injectable({ providedIn: 'root' })
export class ClaimService {

  private apiUrl = 'http://localhost:8080/api/claims';

  constructor(private http: HttpClient) {}

  // ── Déclarer sinistre avec photos ────────────
  submitClaim(formData: FormData) {
    return this.http.post<Claim>(
      `${this.apiUrl}/with-photos`, formData
    );
  }

  // ── Mes sinistres ────────────────────────────
  getMyClaims(clientId: string) {
    return this.http.get<Claim[]>(
      `${this.apiUrl}/client/${clientId}`
    );
  }

  // ── Sinistre par ID ──────────────────────────
  getClaimById(id: number) {
    return this.http.get<Claim>(
      `${this.apiUrl}/${id}`
    );
  }

  // ── Tous les sinistres (ADMIN) ───────────────
  getAllClaims() {
    return this.http.get<Claim[]>(this.apiUrl);
  }
}