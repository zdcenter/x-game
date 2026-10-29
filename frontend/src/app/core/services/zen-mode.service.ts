import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { isBrowser } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class ZenModeService {
  private static readonly STORAGE_KEY = 'zen_mode_preference';
  private router = inject(Router);
  private hadNativeFullscreen = false;

  /** Tracks whether the user is currently on an active game route (e.g. /zh/games/nonogram) */
  readonly isGameRoute = signal<boolean>(false);

  /** User preference persisted in localStorage */
  readonly zenPreference = signal<boolean>(this.loadPreference());

  /**
   * Zen mode is active ONLY when the user is inside a game AND their zen preference is enabled.
   * This guarantees that Lobby, Leaderboard, Daily, Profile, etc. always render the top header!
   */
  readonly isZenMode = computed(() => this.isGameRoute() && this.zenPreference());

  constructor() {
    if (isBrowser()) {
      // Initialize current route check
      this.isGameRoute.set(this.checkIfGameRoute(this.router.url));

      // Listen to navigation events to update route state
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          const isGame = this.checkIfGameRoute(event.urlAfterRedirects || event.url);
          this.isGameRoute.set(isGame);

          // If leaving a game back to the lobby or other pages, exit native browser fullscreen
          if (!isGame && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
            this.hadNativeFullscreen = false;
          }
        });

      // Synchronize body CSS class
      effect(() => {
        if (this.isZenMode()) {
          document.body.classList.add('zen-mode-active');
        } else {
          document.body.classList.remove('zen-mode-active');
        }
      });

      // Browser fullscreen listeners
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && this.hadNativeFullscreen) {
          this.hadNativeFullscreen = false;
          // User exited native browser fullscreen via Esc or browser button
          this.setPreference(false, false);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isZenMode()) {
          this.setPreference(false, false);
        }
      });
    }
  }

  /**
   * Toggles the user's zen mode preference.
   * When inside a game, immediately switches mode and triggers native browser fullscreen if entering.
   */
  toggle(): void {
    const next = !this.zenPreference();
    this.setPreference(next, true);
  }

  /**
   * Helper to detect touch-enabled devices (phones, tablets, iPads)
   */
  isTouchDevice(): boolean {
    if (!isBrowser()) return false;
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  /**
   * Sets the user's zen mode preference and optionally requests/exits native fullscreen on desktop.
   * On touch devices (tablets/phones), we deliberately do NOT invoke browser native requestFullscreen(),
   * because it triggers the intrusive "向下轻扫即可退出全屏" system prompt and edge swipe interference.
   * Instead, CSS In-App Fullscreen provides seamless 100dvh immersion with zero browser popups!
   */
  setPreference(active: boolean, userInitiated = false): void {
    this.zenPreference.set(active);

    if (!isBrowser()) return;

    try {
      localStorage.setItem(ZenModeService.STORAGE_KEY, String(active));
    } catch {}

    if (userInitiated) {
      // Only request browser native fullscreen on non-touch desktop devices
      if (!this.isTouchDevice()) {
        if (active) {
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen()
              .then(() => { this.hadNativeFullscreen = true; })
              .catch(() => { this.hadNativeFullscreen = false; });
          }
        } else {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          this.hadNativeFullscreen = false;
        }
      }
    }
  }

  /**
   * Checks if a URL represents an in-game page (e.g. /zh/games/sudoku, /games/nonogram)
   */
  private checkIfGameRoute(url: string): boolean {
    if (!url) return false;
    return /\/games\/[^\/?#]+/.test(url);
  }

  private loadPreference(): boolean {
    if (!isBrowser()) return false;
    try {
      const stored = localStorage.getItem(ZenModeService.STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
      // Default: Standard mode with clean in-game header, opt-in zen mode for users who desire complete distraction-free full screen
      return false;
    } catch {
      return false;
    }
  }
}
