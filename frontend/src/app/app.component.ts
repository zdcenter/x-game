import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { UiOverlayComponent } from './core/components/ui-overlay/ui-overlay.component';
import { SeoService } from './core/services/seo.service';
import { SettingsService } from './core/services/settings.service';
import { MaintenanceComponent } from './shared/components/maintenance/maintenance.component';
import { AuthStore } from './core/auth/auth.store';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';
import { NavigationStart } from '@angular/router';
import { ToastService } from './core/services/toast.service';
import { I18nService } from './core/i18n/i18n.service';
import { XpGainBadgeComponent } from './shared/components/xp-gain-badge/xp-gain-badge.component';
import { AchievementUnlockOverlayComponent } from './shared/components/achievement-unlock-overlay/achievement-unlock-overlay.component';
import { EditRoomOverlayComponent } from './shared/components/edit-room-overlay/edit-room-overlay.component';
import { EditRoomService } from './core/services/edit-room.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiOverlayComponent, MaintenanceComponent, CookieConsentComponent, XpGainBadgeComponent, AchievementUnlockOverlayComponent, EditRoomOverlayComponent],
  template: `
    @if (settingsService.settings().site_maintenance === 'true' && !canBypassMaintenance()) {
      <app-maintenance></app-maintenance>
    } @else {
      <router-outlet></router-outlet>
      <app-ui-overlay></app-ui-overlay>
      <app-cookie-consent></app-cookie-consent>
      <app-xp-gain-badge />
      <app-achievement-unlock-overlay />
      <!-- 修改房间设置覆盖层：渲染在根级，脱离所有 transform 上下文 -->
      <app-edit-room-overlay
        [isOpen]="editRoomService.isOpen()"
        [gameId]="editRoomService.gameId()"
        [mode]="editRoomService.mode()"
        [difficulty]="editRoomService.difficulty()"
        [target]="editRoomService.target()"
        (apply)="editRoomService.apply($event)"
        (closed)="editRoomService.close()">
      </app-edit-room-overlay>
    }
  `
})
export class AppComponent implements OnInit {
  private seoService = inject(SeoService); // Instantiate SEO service globally
  settingsService = inject(SettingsService);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private toastService = inject(ToastService);
  private i18n = inject(I18nService);
  editRoomService = inject(EditRoomService);

  private readonly LANG_RE = /^\/(en|zh)(\/|$)/;

  constructor() {
    // Subscribe early (before ngOnInit) to also catch the initial navigation.
    // routerLink="/games/X" bypasses LangUrlSerializer (uses createUrlTree, not parse());
    // NavigationStart is the only reliable hook to intercept all bare-path navigations.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(e => {
        const url = e.url.split('?')[0];
        if (url !== '/' && !this.LANG_RE.test(url) && !url.startsWith('/assets/')) {
          const qs = e.url.includes('?') ? e.url.slice(e.url.indexOf('?')) : '';
          this.router.navigateByUrl('/' + this.i18n.currentLang() + url + qs, { replaceUrl: true });
        }
      });
  }

  ngOnInit() {
    this.settingsService.loadSettings().subscribe();
    this.authStore.refreshProfile();
  }

  canBypassMaintenance(): boolean {
    const isAdmin = this.authStore.currentUser()?.role === 'admin';
    const isLoginRoute = this.router.url.startsWith('/admin/login');
    const isAdminRoute = this.router.url.startsWith('/admin');
    // Allow admins or users trying to reach admin login
    return isAdmin || isAdminRoute || isLoginRoute;
  }
}
