import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { GameConfig } from '../../core/services/game.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  template: `
    <div class="w-full max-w-6xl mx-auto flex flex-col transition-colors duration-300">
      
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">{{ i18n.t('admin.users.title')() }}</h2>
          <p class="text-slate-400 text-sm mt-1">{{ i18n.t('admin.users.subtitle')() }}</p>
        </div>
        <div class="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
          <span class="text-xs text-slate-500 font-bold uppercase">{{ i18n.t('admin.users.total')() }}</span>
          <span class="text-xl font-mono text-white font-bold">{{ users().length }}</span>
        </div>
      </div>

        @if (errorMsg()) {
          <div class="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-between">
            <span>{{ errorMsg() }}</span>
            <button (click)="errorMsg.set('')" class="hover:text-white">✕</button>
          </div>
        }

        <!-- Data Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50 shadow-inner">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-800/80 text-slate-300 text-sm uppercase tracking-wider border-b border-slate-700">
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.users.col.id')() }}</th>
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.users.col.username')() }}</th>
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.users.col.role')() }}</th>
                <th class="px-6 py-4 font-semibold">{{ i18n.t('admin.users.col.status')() }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ i18n.t('admin.users.col.actions')() }}</th>
              </tr>
            </thead>
            <tbody class="text-slate-200">
              @if (isLoading()) {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400 animate-pulse">
                    {{ i18n.t('admin.users.loading')() }}
                  </td>
                </tr>
              } @else {
                @for (user of users(); track user.id) {
                  <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-4 font-mono text-slate-500">#{{ user.id }}</td>
                    <td class="px-6 py-4 font-bold text-white">{{ user.username }}</td>
                    <td class="px-6 py-4">
                      <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider"
                            [ngClass]="{'bg-purple-500/20 text-purple-400 border border-purple-500/30': user.role === 'admin', 'bg-slate-700 text-slate-400': user.role !== 'admin'}">
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 rounded-full"
                             [ngClass]="{'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]': user.status === 'active', 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]': user.status === 'banned'}">
                        </div>
                        <span [ngClass]="{'text-emerald-400': user.status === 'active', 'text-red-500': user.status === 'banned'}" class="font-bold text-sm uppercase">
                          {{ user.status }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right space-x-3">
                      @if (user.role !== 'admin') {
                        @if (user.status === 'active') {
                          <button (click)="toggleStatus(user, 'banned')" [disabled]="isUpdating()"
                                  class="px-4 py-2 text-xs font-bold rounded bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50">
                            {{ i18n.t('admin.users.action.ban')() }}
                          </button>
                        } @else {
                          <button (click)="toggleStatus(user, 'active')" [disabled]="isUpdating()"
                                  class="px-4 py-2 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50">
                            {{ i18n.t('admin.users.action.unban')() }}
                          </button>
                        }
                      } @else {
                        <span class="text-xs text-slate-500 font-bold uppercase">{{ i18n.t('admin.users.protected')() }}</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);
  i18n = inject(I18nService);
  
  users = signal<User[]>([]);
  isLoading = signal(true);
  isUpdating = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.isLoading.set(true);
    this.adminService.getUsers().subscribe({
      next: (res) => {
        if (res.users) {
          this.users.set(res.users);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to load users: ' + (err.error?.error || err.message));
        this.isLoading.set(false);
      }
    });
  }

  toggleStatus(user: User, newStatus: 'active' | 'banned') {
    this.isUpdating.set(true);
    // Use the expected currentStatus because the updated admin service signature expects currentStatus for toggling
    this.adminService.toggleUserStatus(user.id, user.status).subscribe({
      next: (res) => {
        if (res.message) {
          const updated = this.users().map(u => u.id === user.id ? { ...u, status: newStatus } : u);
          this.users.set(updated);
        }
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Update failed: ' + (err.error?.error || err.message));
        this.isUpdating.set(false);
      }
    });
  }
}
