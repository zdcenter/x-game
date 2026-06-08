import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold"><ng-container i18n="@@admin.settings.title">admin.settings.title</ng-container></h2>
          <p class="text-[var(--color-text-muted)] mt-1"><ng-container i18n="@@admin.settings.subtitle">admin.settings.subtitle</ng-container></p>
        </div>
        <button (click)="saveSettings()" [disabled]="isSaving()" class="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg disabled:opacity-50">
          {{ isSaving() ? i18n.t('admin.settings.saving')() : i18n.t('admin.settings.save')() }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Site Maintenance -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold"><ng-container i18n="@@admin.settings.maintenance.title">admin.settings.maintenance.title</ng-container></h3>
              <p class="text-xs opacity-70 mt-1"><ng-container i18n="@@admin.settings.maintenance.desc">admin.settings.maintenance.desc</ng-container></p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.site_maintenance">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>
          @if (settings.site_maintenance) {
            <div class="mt-4 animate-fade-in">
              <label class="block text-xs font-bold opacity-70 mb-2"><ng-container i18n="@@admin.settings.maintenance.message_label">admin.settings.maintenance.message_label</ng-container></label>
              <textarea [(ngModel)]="settings.maintenance_message" rows="2" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent-to)] text-sm" [placeholder]="i18n.t('admin.settings.maintenance.message_placeholder')()"></textarea>
            </div>
          }
        </div>

        <!-- Simulator -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold"><ng-container i18n="@@admin.settings.simulator.title">admin.settings.simulator.title</ng-container></h3>
              <p class="text-xs opacity-70 mt-1"><ng-container i18n="@@admin.settings.simulator.desc">admin.settings.simulator.desc</ng-container></p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.simulator_enabled">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-from)]"></div>
            </label>
          </div>
        </div>

        <!-- AdSense Configuration -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)] col-span-1 md:col-span-2">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">{{ i18n.t('admin.settings.adsense.title')() }}</h3>
              <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.settings.adsense.desc')() }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.adsense.freq_label')() }}</label>
              <input type="number" [(ngModel)]="settings.ad_interstitial_frequency" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="3">
            </div>
            <div>
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.adsense.daily_limit_label')() }}</label>
              <input type="number" [(ngModel)]="settings.ad_interstitial_daily_limit" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="3">
            </div>
            <div>
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.adsense.pc_left_label')() }}</label>
              <input type="text" [(ngModel)]="settings.ad_pc_left_slot" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="e.g. 1234567890">
            </div>
            <div>
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.adsense.pc_right_label')() }}</label>
              <input type="text" [(ngModel)]="settings.ad_pc_right_slot" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="e.g. 1234567890">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.adsense.mobile_lobby_label')() }}</label>
              <input type="text" [(ngModel)]="settings.ad_mobile_lobby_slot" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="e.g. 1234567890">
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);

  isSaving = signal(false);
  settings: any = {
    site_maintenance: false,
    maintenance_message: '',
    global_announcement: '',
    simulator_enabled: true,
    ad_interstitial_frequency: 3,
    ad_interstitial_daily_limit: 3,
    ad_pc_left_slot: '',
    ad_pc_right_slot: '',
    ad_mobile_lobby_slot: ''
  };

  ngOnInit() {
    this.adminService.getSettings().subscribe({
      next: (res) => {
        // Convert string values to appropriate types for UI
        this.settings.site_maintenance = res.site_maintenance === 'true';
        this.settings.maintenance_message = res.maintenance_message || '';
        this.settings.global_announcement = res.global_announcement || '';
        this.settings.simulator_enabled = res.simulator_enabled === 'true';
        this.settings.ad_interstitial_frequency = parseInt(res.ad_interstitial_frequency || '3', 10);
        this.settings.ad_interstitial_daily_limit = parseInt(res.ad_interstitial_daily_limit || '3', 10);
        this.settings.ad_pc_left_slot = res.ad_pc_left_slot || '';
        this.settings.ad_pc_right_slot = res.ad_pc_right_slot || '';
        this.settings.ad_mobile_lobby_slot = res.ad_mobile_lobby_slot || '';
        this.cdr.detectChanges();
      },
      error: () => this.toast.show('Failed to load settings', 'error')
    });
  }

  saveSettings() {
    this.isSaving.set(true);
    // Convert back to string values
    const payload = {
      site_maintenance: this.settings.site_maintenance ? 'true' : 'false',
      maintenance_message: this.settings.maintenance_message,
      global_announcement: this.settings.global_announcement,
      simulator_enabled: this.settings.simulator_enabled ? 'true' : 'false',
      ad_interstitial_frequency: String(this.settings.ad_interstitial_frequency),
      ad_interstitial_daily_limit: String(this.settings.ad_interstitial_daily_limit),
      ad_pc_left_slot: this.settings.ad_pc_left_slot,
      ad_pc_right_slot: this.settings.ad_pc_right_slot,
      ad_mobile_lobby_slot: this.settings.ad_mobile_lobby_slot
    };

    this.adminService.updateSettings(payload).subscribe({
      next: () => {
        this.toast.show('Settings saved successfully', 'success');
        this.isSaving.set(false);
      },
      error: () => {
        this.toast.show('Failed to save settings', 'error');
        this.isSaving.set(false);
      }
    });
  }
}
