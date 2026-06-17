import { Injectable, signal } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  canInstall   = signal(false);  // Android/Desktop: beforeinstallprompt fired
  isIos        = signal(false);  // iOS Safari (no beforeinstallprompt)
  isStandalone = signal(false);  // Already running as installed PWA
  showIosGuide = signal(false);  // Show step-by-step iOS install guide

  private deferredPrompt: any;

  constructor() {
    if (!isBrowser()) return;

    const ua = navigator.userAgent;
    // iOS Safari: matches iPhone/iPad/iPod but not Chrome on iOS (CriOS)
    this.isIos.set(/iphone|ipad|ipod/i.test(ua) && !/CriOS/i.test(ua));

    // Already installed as PWA (standalone display mode or iOS standalone flag)
    this.isStandalone.set(
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
      this.showIosGuide.set(false);
    });
  }

  async install() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`PWA install prompt: ${outcome}`);
    this.deferredPrompt = null;
    this.canInstall.set(false);
  }

  openIosGuide()  { this.showIosGuide.set(true); }
  closeIosGuide() { this.showIosGuide.set(false); }
}
