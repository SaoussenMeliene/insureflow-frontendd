import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}/users`);
  }

  getUserById(id: number): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(id: number, status: string): Observable<AppUser> {
    return this.http.patch<AppUser>(`${this.apiUrl}/users/${id}/status`, { status });
  }
}