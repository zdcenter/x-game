import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { UiOverlayComponent } from './core/components/ui-overlay/ui-overlay.component';
import { SeoService } from './core/services/seo.service';
import { SettingsService } from './core/services/settings.service';
import { MaintenanceComponent } from './shared/components/maintenance/maintenance.component';
import { AuthStore } from './core/auth/auth.store';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastService } from './core/services/toast.service';
import { I18nService } from './core/i18n/i18n.service';
import { XpGainBadgeComponent } from './shared/components/xp-gain-badge/xp-gain-badge.component';
import { AchievementUnlockOverlayComponent } from './shared/components/achievement-unlock-overlay/achievement-unlock-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiOverlayComponent, MaintenanceComponent, CookieConsentComponent, XpGainBadgeComponent, AchievementUnlockOverlayComponent],
  template: `
    @if (settingsService.settings().site_maintenance === 'true' && !canBypassMaintenance()) {
      <app-maintenance></app-maintenance>
    } @else {
      <router-outlet></router-outlet>
      <app-ui-overlay></app-ui-overlay>
      <app-cookie-consent></app-cookie-consent>
      <app-xp-gain-badge />
      <app-achievement-unlock-overlay />
    }
  `
})
export class AppComponent implements OnInit {
  private seoService = inject(SeoService); // Instantiate SEO service globally
  settingsService = inject(SettingsService);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private swUpdate = inject(SwUpdate);
  private toastService = inject(ToastService);
  private i18n = inject(I18nService);

  ngOnInit() {
    this.settingsService.loadSettings().subscribe();
    this.checkForUpdates();
    this.authStore.refreshProfile();
  }

  private checkForUpdates() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        // Automatically activate the new version in the background.
        // The next time the user refreshes or opens a new tab, they will see the new version,
        // without needing to close all tabs. This is completely silent and non-intrusive.
        this.swUpdate.activateUpdate();
      });

    // Check for update on load
    this.swUpdate.checkForUpdate();
  }

  canBypassMaintenance(): boolean {
    const isAdmin = this.authStore.currentUser()?.role === 'admin';
    const isLoginRoute = this.router.url.startsWith('/admin/login');
    const isAdminRoute = this.router.url.startsWith('/admin');
    // Allow admins or users trying to reach admin login
    return isAdmin || isAdminRoute || isLoginRoute;
  }
}
