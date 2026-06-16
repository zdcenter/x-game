import { Injectable, signal } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({ providedIn: 'root' })
export class WindowSizeService {
  readonly size = signal({
    w: isBrowser() ? window.innerWidth : 1024,
    h: isBrowser() ? window.innerHeight : 768,
  });

  constructor() {
    if (isBrowser()) {
      window.addEventListener('resize', () => {
        this.size.set({ w: window.innerWidth, h: window.innerHeight });
      });
    }
  }
}
