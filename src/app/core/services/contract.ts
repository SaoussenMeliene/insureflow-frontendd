import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // ← AJOUTÉ

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private apiUrl = `${environment.apiUrl}/api/contract-rag`; // ← CORRIGÉ

  constructor(private http: HttpClient) {}

  getContract(policyNumber: string) {
    return this.http.get<any>(
      `${this.apiUrl}/contracts/${policyNumber}`
    );
  }
}