import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold"><ng-container i18n="@@admin.announcements.title">admin.announcements.title</ng-container></h2>
          <p class="text-[var(--color-text-muted)] mt-1"><ng-container i18n="@@admin.announcements.subtitle">admin.announcements.subtitle</ng-container></p>
        </div>
        <button (click)="openCreateModal()" class="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          <ng-container i18n="@@admin.announcements.add">admin.announcements.add</ng-container>
        </button>
      </div>

      <!-- Announcements Table -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[var(--color-bg-main)]/50 border-b border-[var(--color-border-card)]">
              <th class="py-4 px-6 text-xs font-bold uppercase tracking-wider opacity-70 w-16">ID</th>
              <th class="py-4 px-6 text-xs font-bold uppercase tracking-wider opacity-70"><ng-container i18n="@@admin.announcements.col.content">admin.announcements.col.content</ng-container></th>
              <th class="py-4 px-6 text-xs font-bold uppercase tracking-wider opacity-70 w-32"><ng-container i18n="@@admin.announcements.col.status">admin.announcements.col.status</ng-container></th>
              <th class="py-4 px-6 text-xs font-bold uppercase tracking-wider opacity-70 w-24 text-center"><ng-container i18n="@@admin.announcements.col.order">admin.announcements.col.order</ng-container></th>
              <th class="py-4 px-6 text-xs font-bold uppercase tracking-wider opacity-70 w-48 text-right"><ng-container i18n="@@admin.announcements.col.actions">admin.announcements.col.actions</ng-container></th>
            </tr>
          </thead>
          <tbody>
            @for (ann of announcements(); track ann.id) {
              <tr class="border-b border-[var(--color-border-card)]/50 hover:bg-[var(--color-bg-main)]/30 transition-colors group">
                <td class="py-4 px-6 text-sm opacity-50 font-mono">#{{ ann.id }}</td>
                <td class="py-4 px-6">
                  <p class="font-medium text-sm truncate max-w-md">{{ ann.content }}</p>
                </td>
                <td class="py-4 px-6">
                  <button (click)="toggleActive(ann)" 
                    class="px-3 py-1 rounded-full text-xs font-bold border transition-colors shadow-sm"
                    [class]="ann.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'">
                    {{ ann.is_active ? i18n.t('admin.announcements.status.active')() : i18n.t('admin.announcements.status.inactive')() }}
                  </button>
                </td>
                <td class="py-4 px-6 text-center text-sm font-mono opacity-80">{{ ann.sort_order }}</td>
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="openEditModal(ann)" class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-transparent hover:border-blue-500/30" [title]="i18n.t('admin.announcements.edit')()">
                      ✏️
                    </button>
                    <button (click)="deleteAnnouncement(ann.id)" class="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors border border-transparent hover:border-rose-500/30" [title]="i18n.t('admin.announcements.delete')()">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="py-12 text-center text-sm opacity-50 italic">
                  No announcements found. Click "Add Announcement" to create one.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit/Create Modal -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
          <div class="p-6 border-b border-[var(--color-border-card)] flex justify-between items-center bg-[var(--color-bg-main)]/50">
            <h3 class="text-xl font-bold">{{ currentAnn()?.id ? i18n.t('admin.announcements.edit')() : i18n.t('admin.announcements.add')() }}</h3>
            <button (click)="closeModal()" class="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>
          <div class="p-6 space-y-5">
            <div>
              <label class="block text-sm font-bold opacity-70 mb-2"><ng-container i18n="@@admin.announcements.col.content">admin.announcements.col.content</ng-container></label>
              <textarea [(ngModel)]="formData.content" rows="3" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent-to)] text-sm" [placeholder]="i18n.t('admin.announcements.placeholder')()"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold opacity-70 mb-2"><ng-container i18n="@@admin.announcements.col.order">admin.announcements.col.order</ng-container></label>
                <input type="number" [(ngModel)]="formData.sort_order" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent-to)] text-sm">
              </div>
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold opacity-70 mb-2"><ng-container i18n="@@admin.announcements.col.status">admin.announcements.col.status</ng-container></label>
                <div class="flex items-center h-[46px]">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" [(ngModel)]="formData.is_active">
                    <div class="w-11 h-6 bg-[var(--color-bg-main)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-[var(--color-border-card)] peer-checked:bg-[var(--color-accent-from)]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="p-6 bg-[var(--color-bg-main)]/50 border-t border-[var(--color-border-card)] flex justify-end gap-3">
            <button (click)="closeModal()" class="px-5 py-2.5 rounded-xl font-bold border border-[var(--color-border-card)] hover:bg-[var(--color-bg-card)] transition-colors text-[var(--color-text-main)]">
              <ng-container i18n="@@admin.announcements.cancel">admin.announcements.cancel</ng-container>
            </button>
            <button (click)="saveAnnouncement()" class="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white hover:brightness-110 transition-all shadow-lg">
              <ng-container i18n="@@admin.announcements.save">admin.announcements.save</ng-container>
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminAnnouncementsComponent implements OnInit {
  private announcementService = inject(AnnouncementService);
  private toast = inject(ToastService);
  i18n = inject(I18nService);

  announcements = signal<Announcement[]>([]);
  isModalOpen = signal(false);
  currentAnn = signal<Announcement | null>(null);

  formData = {
    content: '',
    is_active: true,
    sort_order: 0
  };

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.announcementService.getAdminAnnouncements().subscribe({
      next: (data) => this.announcements.set(data),
      error: () => this.toast.show('Failed to load announcements', 'error')
    });
  }

  openCreateModal() {
    this.currentAnn.set(null);
    this.formData = { content: '', is_active: true, sort_order: 0 };
    this.isModalOpen.set(true);
  }

  openEditModal(ann: Announcement) {
    this.currentAnn.set(ann);
    this.formData = { ...ann };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveAnnouncement() {
    if (!this.formData.content.trim()) {
      this.toast.show('Content cannot be empty', 'error');
      return;
    }

    const ann = this.currentAnn();
    if (ann) {
      // Update
      this.announcementService.updateAnnouncement(ann.id, this.formData).subscribe({
        next: () => {
          this.toast.show('Announcement updated', 'success');
          this.loadAnnouncements();
          this.closeModal();
        },
        error: () => this.toast.show('Failed to update announcement', 'error')
      });
    } else {
      // Create
      this.announcementService.createAnnouncement(this.formData).subscribe({
        next: () => {
          this.toast.show('Announcement created', 'success');
          this.loadAnnouncements();
          this.closeModal();
        },
        error: () => this.toast.show('Failed to create announcement', 'error')
      });
    }
  }

  toggleActive(ann: Announcement) {
    const updatedStatus = !ann.is_active;
    this.announcementService.updateAnnouncement(ann.id, { is_active: updatedStatus }).subscribe({
      next: () => {
        this.toast.show('Status updated', 'success');
        this.loadAnnouncements();
      },
      error: () => this.toast.show('Failed to update status', 'error')
    });
  }

  deleteAnnouncement(id: number) {
    if (confirm('Are you sure you want to delete this announcement?')) {
      this.announcementService.deleteAnnouncement(id).subscribe({
        next: () => {
          this.toast.show('Announcement deleted', 'success');
          this.loadAnnouncements();
        },
        error: () => this.toast.show('Failed to delete announcement', 'error')
      });
    }
  }
}
