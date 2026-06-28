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
          <h2 class="text-2xl font-bold">{{ i18n.t('admin.settings.title')() }}</h2>
          <p class="text-[var(--color-text-muted)] mt-1">{{ i18n.t('admin.settings.subtitle')() }}</p>
        </div>
        <div>
          @if (isSaving()) {
            <span class="text-sm font-bold text-[var(--color-accent-from)] animate-pulse">{{ i18n.t('admin.settings.saving')() }}</span>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Site Maintenance -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">{{ i18n.t('admin.settings.maintenance.title')() }}</h3>
              <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.settings.maintenance.desc')() }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.site_maintenance" (ngModelChange)="saveSettings()">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>
          @if (settings.site_maintenance) {
            <div class="mt-4 animate-fade-in">
              <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.settings.maintenance.message_label')() }}</label>
              <textarea [(ngModel)]="settings.maintenance_message" (change)="saveSettings()" rows="2" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent-to)] text-sm" [placeholder]="i18n.t('admin.settings.maintenance.message_placeholder')()"></textarea>
            </div>
          }
        </div>

        <!-- Simulator -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">{{ i18n.t('admin.settings.simulator.title')() }}</h3>
              <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.settings.simulator.desc')() }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.simulator_enabled" (ngModelChange)="saveSettings()">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-from)]"></div>
            </label>
          </div>
        </div>

        <!-- Multiplayer Toggle -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">{{ i18n.t('admin.settings.multiplayer.title')() }}</h3>
              <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.settings.multiplayer.desc')() }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.multiplayer_enabled" (ngModelChange)="saveSettings()">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-from)]"></div>
            </label>
          </div>
        </div>

        <!-- Multi-Round PK Toggle -->
        <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">{{ i18n.t('admin.settings.multi_round.title')() }}</h3>
              <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.settings.multi_round.desc')() }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" [(ngModel)]="settings.pk_multi_round_enabled" (ngModelChange)="saveSettings()">
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-from)]"></div>
            </label>
          </div>
        </div>

      </div>

      <!-- API Integrations -->
      <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
        <h3 class="text-lg font-bold mb-1">🔌 API 集成</h3>
        <p class="text-xs opacity-60 mb-5">配置第三方平台 API Key，用于一键发布内容</p>

        <div class="flex items-end gap-3 max-w-xl">
          <div class="flex-1">
            <label class="block text-xs font-bold opacity-70 mb-1.5">
              👩‍💻 Dev.to API Key
              <a href="https://dev.to/settings/extensions" target="_blank" rel="noopener"
                 class="ml-2 text-[var(--color-accent-from)] opacity-70 hover:opacity-100">
                在哪里获取 ↗
              </a>
            </label>
            <div class="relative">
              <input
                [type]="showDevtoKey() ? 'text' : 'password'"
                [(ngModel)]="devtoApiKey"
                placeholder="Enter your Dev.to API key..."
                class="w-full px-3 py-2 pr-10 text-sm rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-card)] outline-none focus:border-[var(--color-accent-from)] font-mono"
              />
              <button (click)="showDevtoKey.set(!showDevtoKey())"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100">
                {{ showDevtoKey() ? '🙈' : '👁' }}
              </button>
            </div>
          </div>
          <button (click)="saveDevtoKey()"
                  class="px-4 py-2 text-sm font-bold rounded-lg bg-[var(--color-accent-from)]/20 border border-[var(--color-accent-from)]/40 hover:bg-[var(--color-accent-from)]/30 transition-colors whitespace-nowrap">
            保存
          </button>
        </div>
        @if (devtoApiKey) {
          <p class="text-xs text-emerald-500 mt-2 opacity-80">✓ API Key 已配置，可在分发页面使用一键发布</p>
        }
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
  devtoApiKey = '';
  showDevtoKey = signal(false);

  settings: any = {
    site_maintenance: false,
    maintenance_message: '',
    global_announcement: '',
    simulator_enabled: true,
    multiplayer_enabled: true,
    pk_multi_round_enabled: true,
    ad_interstitial_frequency: 3,
    ad_interstitial_daily_limit: 3,
    ad_pc_left_slot: '',
    ad_pc_right_slot: '',
    ad_mobile_lobby_slot: ''
  };

  ngOnInit() {
    this.adminService.getSettings().subscribe({
      next: (res) => {
        this.settings.site_maintenance = res.site_maintenance === 'true';
        this.settings.maintenance_message = res.maintenance_message || '';
        this.settings.global_announcement = res.global_announcement || '';
        this.settings.simulator_enabled = res.simulator_enabled === 'true';
        this.settings.multiplayer_enabled = res.multiplayer_enabled === 'true';
        this.settings.pk_multi_round_enabled = (res.pk_multi_round_enabled ?? 'true') === 'true';
        this.cdr.detectChanges();
      },
      error: () => this.toast.show(this.i18n.t('admin.settings.load_error')(), 'error')
    });

    this.adminService.getSettingsMap().subscribe({
      next: (map) => { this.devtoApiKey = map['devto_api_key'] || ''; this.cdr.detectChanges(); }
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
      multiplayer_enabled: this.settings.multiplayer_enabled ? 'true' : 'false',
      pk_multi_round_enabled: this.settings.pk_multi_round_enabled ? 'true' : 'false'
    };

    this.adminService.updateSettings(payload as Record<string, string>).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.settings.saved')(), 'success');
        this.isSaving.set(false);
      },
      error: () => {
        this.toast.show(this.i18n.t('admin.settings.save_error')(), 'error');
        this.isSaving.set(false);
      }
    });
  }

  saveDevtoKey() {
    this.adminService.updateSettings({ devto_api_key: this.devtoApiKey }).subscribe({
      next: () => this.toast.show('Dev.to API Key 已保存', 'success'),
      error: () => this.toast.show('保存失败', 'error'),
    });
  }
}
