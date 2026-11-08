import { Injectable, signal, effect } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class StreamerModeService {
  private static readonly STORAGE_KEY = 'xgame_streamer_mode';

  readonly isStreamerMode = signal<boolean>(this.loadPreference());

  constructor() {
    if (isBrowser()) {
      effect(() => {
        const active = this.isStreamerMode();
        if (active) {
          document.body.classList.add('streamer-mode-active');
        } else {
          document.body.classList.remove('streamer-mode-active');
        }
      });
    }
  }

  private loadPreference(): boolean {
    if (!isBrowser()) return false;
    try {
      return localStorage.getItem(StreamerModeService.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  toggle(): void {
    const next = !this.isStreamerMode();
    this.isStreamerMode.set(next);
    if (isBrowser()) {
      try {
        localStorage.setItem(StreamerModeService.STORAGE_KEY, String(next));
      } catch {}
    }
  }
}

