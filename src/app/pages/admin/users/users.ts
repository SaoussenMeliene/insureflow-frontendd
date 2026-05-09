import { Component, OnInit ,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService, AppUser } from '../../../core/services/user';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ← AJOUTER TranslateService
import { LanguageService } from '../../../core/services/language.service';


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,TranslateModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit {
  fullName = '';
  role = '';

  users: AppUser[] = [];
  filteredUsers: AppUser[] = [];

  selectedUser: AppUser | null = null;
  showUserModal = false;

  searchTerm = '';
  selectedStatus = '';

  loading = true;

  userStats = {
    total: 0,
    activeClients: 0,
    admins: 0,
    inactive: 0
  };

  showStatusModal = false;
  userToToggle: AppUser | null = null;

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
     private translate:        TranslateService, // ← AJOUTER
    public  langService:      LanguageService,

  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.fullName = user.fullName || 'Admin';
      this.role = user.role || 'ADMIN';
    }

    this.loadUsers();
  }

loadUsers(): void {
  this.loading = true;
  this.users = [];
  this.filteredUsers = [];
  this.cdr.detectChanges();

  this.userService.getAllUsers().subscribe({
    next: (data) => {
      console.log('Users reçus:', data);

      try {
        const safeData = Array.isArray(data) ? data : [];

        this.users = safeData.map((user: any) => ({
          id: user?.id ?? 0,
          fullName: user?.fullName ?? '',
          email: user?.email ?? '',
          role: user?.role ?? 'CLIENT',
          status: user?.status ?? 'INACTIVE',
          createdAt: user?.createdAt ?? ''
        }));

        this.computeStats();
        this.applyFilters();
      } catch (error) {
        console.error('Erreur traitement users:', error);
        this.users = [];
        this.filteredUsers = [];
        this.computeStats();
      } finally {
        this.loading = false;
        console.log('loading =', this.loading);
        console.log('filteredUsers =', this.filteredUsers);
        this.cdr.detectChanges();
      }
    },
    error: (err) => {
      console.error('Erreur chargement utilisateurs', err);
      this.users = [];
      this.filteredUsers = [];
      this.computeStats();
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}
  toggleLang() {
    this.langService.toggle();
    this.cdr.detectChanges(); // ← force le recalcul des getters
  }
  computeStats(): void {
    const users = Array.isArray(this.users) ? this.users : [];

    this.userStats = {
      total: users.length,
      activeClients: users.filter(u => u?.role === 'CLIENT' && u?.status === 'ACTIVE').length,
      admins: users.filter(u => u?.role === 'ADMIN').length,
      inactive: users.filter(u => u?.status === 'INACTIVE').length
    };
  }

  applyFilters(): void {
    const users = Array.isArray(this.users) ? this.users : [];
    const search = (this.searchTerm || '').toLowerCase().trim();

    this.filteredUsers = users.filter(user => {
      const fullName = (user?.fullName || '').toLowerCase();
      const email = (user?.email || '').toLowerCase();
      const status = user?.status || '';

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        email.includes(search);

      const matchesStatus =
        !this.selectedStatus || status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  openUserModal(user: AppUser): void {
    this.selectedUser = user;
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.selectedUser = null;
    this.showUserModal = false;
  }

  confirmToggleUserStatus(user: AppUser): void {
    this.userToToggle = user;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.userToToggle = null;
  }

  executeToggleUserStatus(): void {
    if (!this.userToToggle) return;

    const newStatus = this.userToToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.userService.updateUserStatus(this.userToToggle.id, newStatus).subscribe({
      next: (updatedUser: AppUser) => {
        this.users = this.users.map(u => u.id === updatedUser.id ? updatedUser : u);

        if (this.selectedUser && this.selectedUser.id === updatedUser.id) {
          this.selectedUser = updatedUser;
        }

        this.computeStats();
        this.applyFilters();
        this.closeStatusModal();

        this.showToastMessage(
          updatedUser.status === 'ACTIVE'
            ? 'Utilisateur activé avec succès.'
            : 'Utilisateur désactivé avec succès.',
          'success'
        );
        this.loadUsers();
      },
      error: (err) => {
        console.error('Erreur mise à jour statut utilisateur', err);
        this.closeStatusModal();
        this.showToastMessage('Erreur lors de la mise à jour du statut.', 'error');
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(part => part.trim().length > 0)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getRoleClass(role: string): string {
    const map: { [key: string]: string } = {
      CLIENT: 'bg-sky-100 text-sky-700',
      ADMIN: 'bg-violet-100 text-violet-700',
      EXPERT: 'bg-amber-100 text-amber-700'
    };
    return map[role] || 'bg-slate-100 text-slate-700';
  }

  getUserStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      INACTIVE: 'bg-rose-100 text-rose-700'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  getUserStatusLabel(status: string): string {
    const map: { [key: string]: string } = {
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif'
    };
    return map[status] || status || '—';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('fr-FR');
  }

  logout(): void {
    this.authService.logout();
  }
}