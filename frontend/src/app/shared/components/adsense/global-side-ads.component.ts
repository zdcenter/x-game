import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../core/services/settings.service';
import { AdsenseComponent } from './adsense.component';

@Component({
  selector: 'app-global-side-ads',
  standalone: true,
  imports: [CommonModule, AdsenseComponent],
  template: `
    <!-- Desktop Left Side Ad (hidden on mobile/tablet) -->
    @if (settings.settings().ad_pc_left_slot) {
      <div class="fixed top-24 left-4 z-40 hidden 2xl:flex w-[160px] flex-col items-center">
        <app-adsense
          [adSlot]="settings.settings().ad_pc_left_slot"
          adFormat="vertical"
          [fullWidthResponsive]="false"
          class="w-[160px] h-[600px] overflow-hidden rounded-xl shadow-lg border border-[var(--color-border-card)]">
        </app-adsense>
      </div>
    }

    <!-- Desktop Right Side Ad (hidden on mobile/tablet) -->
    @if (settings.settings().ad_pc_right_slot) {
      <div class="fixed top-24 right-4 z-40 hidden 2xl:flex w-[160px] flex-col items-center">
        <app-adsense
          [adSlot]="settings.settings().ad_pc_right_slot"
          adFormat="vertical"
          [fullWidthResponsive]="false"
          class="w-[160px] h-[600px] overflow-hidden rounded-xl shadow-lg border border-[var(--color-border-card)]">
        </app-adsense>
      </div>
    }
  `
})
export class GlobalSideAdsComponent {
  settings = inject(SettingsService);
}
