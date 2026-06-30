import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment'; // ← AJOUTÉ

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  fullName     = '';
  profileImage = '';

  private api = environment.apiUrl; // ← AJOUTÉ

  constructor(
    private authService: AuthService,
    private http:        HttpClient,
    private router:      Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.fullName = user?.fullName || 'Utilisateur';

    this.authService.profileImage$.subscribe(url => {
      if (url) this.profileImage = url;
    });

    if (user?.email) {
      this.http.get<any>(
        `${this.api}/api/auth/profile/email/${user.email}` // ← CORRIGÉ
      ).subscribe({
        next: (profile) => {
          this.fullName = profile.fullName || this.fullName;
          if (profile.profileImage) {
            const url = `${this.api}/api/auth/profile-image/${profile.id}?t=${Date.now()}`; // ← CORRIGÉ
            this.profileImage = url;
            this.authService.updateProfileImage(url);
          }
        },
        error: () => {}
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}