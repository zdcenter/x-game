import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/version';

export interface VersionInfo {
  version: string;
  buildTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly hasUpdate = signal<boolean>(false);
  readonly newVersion = signal<string>('');
  readonly isUpdating = signal<boolean>(false);
  readonly currentVersion = environment.version;

  private registration: ServiceWorkerRegistration | null = null;
  private checkTimer: any = null;

  constructor() {
    if (this.isBrowser) {
      this.init();
    }
  }

  private init() {
    // 1. Register Service Worker & attach lifecycle listeners
    this.initServiceWorker();

    // 2. Initial live check after page load settles (3s delay)
    setTimeout(() => {
      this.checkForUpdate();
    }, 3000);

    // 3. Mobile PWA foreground resume listener (Critical for "添加到桌面" standalone apps)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    });

    // 4. Network online event listener
    window.addEventListener('online', () => {
      this.checkForUpdate();
    });

    // 5. Periodic polling (every 3 minutes)
    this.checkTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    }, 3 * 60 * 1000);
  }

  private async initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registered, scope:', this.registration.scope);

      // Check if a service worker is already waiting to activate
      if (this.registration.waiting) {
        this.onWorkerWaiting(this.registration.waiting);
      }

      // Listen for newly installed service worker
      this.registration.addEventListener('updatefound', () => {
        const installingWorker = this.registration?.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed in background and waiting!
            this.onWorkerWaiting(installingWorker);
          }
        });
      });

      // Listen for controllerchange (when new SW claims clients)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed to new version');
      });

      // Listen for message events from sw.js
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_ACTIVATED') {
          console.log('[PWA] New SW activated with version:', event.data.version);
        }
      });
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  }

  private onWorkerWaiting(worker: ServiceWorker) {
    console.log('[PWA] New version is waiting to activate');
    this.hasUpdate.set(true);
  }

  /**
   * Proactively queries /version.json with cache-busting timestamp
   * and triggers registration.update() on Cloudflare Pages.
   */
  async checkForUpdate(): Promise<void> {
    if (!this.isBrowser) return;

    // A. Kick Service Worker to check byte-diff on sw.js
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (e) {
        console.debug('[PWA] SW registration update check failed:', e);
      }
    }

    // B. Live check /version.json
    try {
      const timestamp = Date.now();
      const res = await fetch(`/version.json?_t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (res.ok) {
        const data: VersionInfo = await res.json();
        if (data.version && data.version !== environment.version) {
          console.log(`[PWA] Remote version ${data.version} detected (current: ${environment.version})`);
          this.newVersion.set(data.version);
          this.hasUpdate.set(true);
        }
      }
    } catch (err) {
      console.debug('[PWA] Version check fetch error:', err);
    }
  }

  /**
   * Applies the update immediately:
   * 1. Posts SKIP_WAITING to waiting SW
   * 2. Clears stale CacheStorage caches
   * 3. Performs a hard reload
   */
  async applyUpdate(): Promise<void> {
    if (!this.isBrowser) return;

    this.isUpdating.set(true);

    try {
      // 1. Tell waiting service worker to skip waiting
      if (this.registration?.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear all local CacheStorage caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (err) {
      console.warn('[PWA] Cache purge error before reload:', err);
    }

    // Small delay to ensure SW message is processed before reload
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  dismiss(): void {
    this.hasUpdate.set(false);
  }
}
