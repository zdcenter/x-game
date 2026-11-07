import { Injectable, signal } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

/**
 * Screen Wake Lock Service
 * Keeps device display awake during active gameplay (e.g. Sudoku, Sokoban, Nonogram, Hashi)
 * so long-thinking players are not interrupted by automatic screen lock/dimming.
 */
@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private sentinel: any = null;
  private shouldBeActive = false;
  private isSupported = isBrowser() && 'wakeLock' in navigator;

  readonly isLocked = signal<boolean>(false);

  constructor() {
    if (isBrowser()) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.shouldBeActive) {
          this.acquire();
        }
      });
    }
  }

  /**
   * Request screen to stay awake during active gameplay.
   */
  async requestLock(): Promise<boolean> {
    this.shouldBeActive = true;
    return this.acquire();
  }

  /**
   * Release screen wake lock (when game finished, paused, or user leaves page).
   */
  async releaseLock(): Promise<void> {
    this.shouldBeActive = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (_) {}
      this.sentinel = null;
    }
    this.isLocked.set(false);
  }

  private async acquire(): Promise<boolean> {
    if (!this.isSupported || this.sentinel !== null) {
      return false;
    }

    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.isLocked.set(true);

      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.isLocked.set(false);
      });
      return true;
    } catch (_) {
      // Handled gracefully: Wake lock request can be rejected if battery is critically low
      this.sentinel = null;
      this.isLocked.set(false);
      return false;
    }
  }
}

