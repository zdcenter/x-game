import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { UiOverlayComponent } from './core/components/ui-overlay/ui-overlay.component';
import { SeoService } from './core/services/seo.service';
import { SettingsService } from './core/services/settings.service';
import { MaintenanceComponent } from './shared/components/maintenance/maintenance.component';
import { AuthStore } from './core/auth/auth.store';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiOverlayComponent, MaintenanceComponent, CookieConsentComponent],
  template: `
    @if (settingsService.settings().site_maintenance === 'true' && !canBypassMaintenance()) {
      <app-maintenance></app-maintenance>
    } @else {
      <router-outlet></router-outlet>
      <app-ui-overlay></app-ui-overlay>
      <app-cookie-consent></app-cookie-consent>
    }
  `
})
export class AppComponent implements OnInit {
  private seoService = inject(SeoService); // Instantiate SEO service globally
  settingsService = inject(SettingsService);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  ngOnInit() {
    this.settingsService.loadSettings().subscribe();
  }

  canBypassMaintenance(): boolean {
    const isAdmin = this.authStore.currentUser()?.role === 'admin';
    const isLoginRoute = this.router.url.startsWith('/admin/login');
    const isAdminRoute = this.router.url.startsWith('/admin');
    // Allow admins or users trying to reach admin login
    return isAdmin || isAdminRoute || isLoginRoute;
  }
}
