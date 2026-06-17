import { Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-bg-main)] text-[var(--color-text-main)] p-4 text-center">
      <div class="text-6xl mb-6">🛠️</div>
      <h1 class="text-3xl font-black mb-4 tracking-widest text-[var(--color-accent-to)]">{{ i18n.t('maintenance.title')() }}</h1>
      
      <p class="text-lg opacity-80 max-w-md mx-auto leading-relaxed mt-4">
        {{ settingsService.settings().maintenance_message || i18n.t('maintenance.default_message')() }}
      </p>
      
      <div class="mt-12 text-sm opacity-50">
        Puzzle PK Platform
      </div>
    </div>
  `
})
export class MaintenanceComponent {
  settingsService = inject(SettingsService);
  i18n = inject(I18nService);
}
