import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private apiUrl = 'http://localhost:8080/api/contract-rag';

  constructor(private http: HttpClient) {}

  getContract(policyNumber: string) {
    return this.http.get<any>(
      `${this.apiUrl}/contracts/${policyNumber}`
    );
  }
}