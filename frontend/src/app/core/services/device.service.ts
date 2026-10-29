import { Injectable, computed, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';
import { WindowSizeService } from './window-size.service';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private windowSize?: WindowSizeService;

  constructor() {
    try {
      this.windowSize = inject(WindowSizeService);
    } catch {
      // Graceful fallback when instantiated outside Angular DI context
    }
  }

  /**
   * Current viewport dimensions via reactive signal
   */
  readonly width = computed(() => this.windowSize?.size().w ?? (isBrowser() ? (window.innerWidth || 1024) : 1024));
  readonly height = computed(() => this.windowSize?.size().h ?? (isBrowser() ? (window.innerHeight || 768) : 768));

  /**
   * Whether the device supports multi-touch (phones, tablets, touchscreens)
   */
  readonly isTouch = computed(() => {
    if (!isBrowser()) return false;
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  });

  /**
   * Detects iPad or iPadOS (modern iPads report as Macintosh with multi-touch)
   */
  readonly isIpad = computed(() => {
    if (!isBrowser()) return false;
    const ua = navigator.userAgent;
    const isClassicIpad = /iPad/i.test(ua);
    const isModernIpadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    return isClassicIpad || isModernIpadOS;
  });

  /**
   * Detected device category: 'mobile' | 'tablet' | 'desktop'
   */
  readonly deviceType = computed<DeviceType>(() => {
    if (!isBrowser()) return 'desktop';

    const w = this.width();
    const isIpad = this.isIpad();
    const hasTouch = this.isTouch();
    const ua = navigator.userAgent;

    // 1. Explicit iPad detection
    if (isIpad) {
      return 'tablet';
    }

    // 2. Android Tablet or other tablet UA
    const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    if (isAndroidTablet) {
      return 'tablet';
    }

    // 3. Viewport width breakpoints
    if (w < 640) {
      return 'mobile';
    }

    if (w <= 1040) {
      // 640px ~ 1040px: covers iPad Pro (1032px), iPad Air (820px), iPad mini (768px)
      return 'tablet';
    }

    // For large screens (> 1040px):
    // iPad Pro 12.9" in landscape is 1366px, or iPad Pro 11" landscape is 1194px with touch
    if (isIpad || (hasTouch && w <= 1376 && /iPad|Macintosh/i.test(ua))) {
      return 'tablet';
    }

    return 'desktop';
  });

  /**
   * Helper booleans
   */
  readonly isMobile = computed(() => this.deviceType() === 'mobile');
  readonly isTablet = computed(() => this.deviceType() === 'tablet');
  readonly isDesktop = computed(() => this.deviceType() === 'desktop');

  /**
   * True for both mobile phones and tablets (handheld touch devices)
   */
  readonly isHandheld = computed(() => this.isMobile() || this.isTablet());
}
