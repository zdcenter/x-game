import { Injectable, signal, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class ZenModeService {
  readonly isZenMode = signal<boolean>(false);
  private hadNativeFullscreen = false;

  constructor() {
    if (isBrowser()) {
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && this.hadNativeFullscreen) {
          this.hadNativeFullscreen = false;
          this.setZenMode(false);
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isZenMode()) {
          this.setZenMode(false);
        }
      });
    }
  }

  toggle() {
    this.setZenMode(!this.isZenMode());
  }

  setZenMode(active: boolean) {
    console.log('[ZenMode] Toggling zen mode to:', active);
    this.isZenMode.set(active);
    if (!isBrowser()) return;

    if (active) {
      document.body.classList.add('zen-mode-active');
      // Attempt browser fullscreen if available
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => { this.hadNativeFullscreen = true; })
          .catch(() => { this.hadNativeFullscreen = false; });
      }
    } else {
      document.body.classList.remove('zen-mode-active');
      this.hadNativeFullscreen = false;
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }
}
