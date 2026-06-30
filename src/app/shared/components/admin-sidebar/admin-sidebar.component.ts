import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css',
})
export class AdminSidebarComponent implements OnInit {

  @Input()  pendingCount = 0;
  @Output() collapsedChange = new EventEmitter<boolean>();

  fullName  = '';
  collapsed = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.fullName = user?.fullName || 'Admin';

    // Restaure l'état depuis localStorage
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved !== null) {
      this.collapsed = saved === 'true';
      this.collapsedChange.emit(this.collapsed);
    }
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    localStorage.setItem('admin-sidebar-collapsed', String(this.collapsed));
    this.collapsedChange.emit(this.collapsed);
  }

  logout(): void {
    this.authService.logout();
  }
}