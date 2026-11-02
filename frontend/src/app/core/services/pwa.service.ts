import { Injectable, signal, computed } from '@angular/core';
import { isBrowser } from '../utils/browser.util';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  canInstall             = signal(false);  // Android/Desktop: beforeinstallprompt fired
  isIos                  = signal(false);  // iOS Safari (no beforeinstallprompt)
  isStandalone           = signal(false);  // Already running as standalone installed PWA window
  isAppInstalledOnDevice = signal(false);  // System-level detection: PWA already installed on device
  showIosGuide           = signal(false);  // Show step-by-step iOS install guide
  showGeneralGuide       = signal(false);  // Show desktop/android browser install guide
  isPromptDismissed      = signal(false);  // Global prompt dismissed status (user clicked close)

  /**
   * 是否支持主动发起安装流程（只要未以 Standalone 模式运行，且本机系统未检测到已安装，才展示/允许安装）
   */
  readonly canTriggerInstall = computed(() => !this.isStandalone() && !this.isAppInstalledOnDevice());

  private deferredPrompt: any;

  constructor() {
    if (!isBrowser()) return;

    // 1. 检查此前是否临时关闭了底部提示条 (3天内不重复弹浮条，但用户依然可在菜单随时主动安装)
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime) {
      const days = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (days < 3) {
        this.isPromptDismissed.set(true);
      }
    }

    const ua = navigator.userAgent;
    // iOS Safari 检测: iPhone/iPad/iPod 或 iPadOS 13+ 桌面模式 (MacIntel + 多点触控) 且非第三方浏览器壳
    const isAppleIos = (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !/CriOS|FxiOS/i.test(ua);
    this.isIos.set(isAppleIos);

    // 检查是否已经在独立 PWA 窗口中运行 (PWA Standalone)
    const isStandaloneMode = (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches;
    this.isStandalone.set(isStandaloneMode);

    if (isStandaloneMode) {
      this.isAppInstalledOnDevice.set(true);
    }

    // 2. 核心突破：第一时间接管 index.html 头部 0ms 提前捕获的 beforeinstallprompt 事件
    const earlyPrompt = (window as any).__deferredPwaPrompt;
    if (earlyPrompt) {
      this.deferredPrompt = earlyPrompt;
      this.canInstall.set(true);
    }

    // 挂载全局就绪回调，确保后续由浏览器派发时也能立刻响应
    (window as any).__onPwaPromptReady = (e: any) => {
      this.deferredPrompt = e;
      this.canInstall.set(true);
    };

    // 兜底监听常规事件
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isAppInstalledOnDevice.set(true);
      this.showIosGuide.set(false);
      this.showGeneralGuide.set(false);
      try {
        localStorage.setItem('pwa_device_installed', 'true');
      } catch {}
    });

    // 3. 动态探测操作系统中是否已经安装了本应用 (Web Capabilities: getInstalledRelatedApps)
    this.checkInstalledStatus();

    // 4. 切屏/重新聚焦时动态重新探测 (当用户在桌面删除图标后切回浏览器，自动自愈感知并恢复提示)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkInstalledStatus();
      }
    });
    window.addEventListener('focus', () => {
      this.checkInstalledStatus();
    });
  }

  /**
   * 动态探测操作系统中是否已经安装了本应用 (Web Capabilities API)
   * 核心优势：
   * 1. 真实系统级动态探测：如果系统已安装桌面快捷方式，在普通浏览器中也会返回已安装；
   * 2. 卸载自愈感知：如果用户在手机桌面上删除了图标，再次访问时探测返回为空，自动恢复安装提示！
   */
  async checkInstalledStatus() {
    if (!isBrowser()) return;

    if (this.isStandalone()) {
      this.isAppInstalledOnDevice.set(true);
      return;
    }

    // 优先调用现代浏览器标准 API: getInstalledRelatedApps
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps();
        if (Array.isArray(relatedApps) && relatedApps.length > 0) {
          this.isAppInstalledOnDevice.set(true);
          return;
        } else {
          // 用户未安装，或者已在桌面将图标删除卸载！
          this.isAppInstalledOnDevice.set(false);
          try {
            localStorage.removeItem('pwa_device_installed');
          } catch {}
          return;
        }
      } catch (err) {
        console.debug('[PWA] getInstalledRelatedApps check bypassed:', err);
      }
    }
  }

  /**
   * 智能安装总调度器：
   * 无论在任何设备、任何浏览器中，均保证 100% 灵敏响应，绝无点击无反应的痛点！
   */
  async triggerInstall() {
    // 场景 A: Chrome / Edge / 原生支持 beforeinstallprompt
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        if (outcome === 'accepted') {
          this.deferredPrompt = null;
          this.canInstall.set(false);
          this.isAppInstalledOnDevice.set(true);
          try {
            localStorage.setItem('pwa_device_installed', 'true');
          } catch {}
        }
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
        this.openGeneralGuide();
      }
      return;
    }

    // 场景 B: iOS Safari (点击分享 -> 添加到主屏幕)
    if (this.isIos()) {
      this.openIosGuide();
      return;
    }

    // 场景 C: 桌面 Chrome/Edge (未触发 prompt 或已被浏览器设限) 或其它安卓浏览器
    this.openGeneralGuide();
  }

  async install() {
    return this.triggerInstall();
  }

  openIosGuide()  { this.showIosGuide.set(true); }
  closeIosGuide() { this.showIosGuide.set(false); }

  openGeneralGuide()  { this.showGeneralGuide.set(true); }
  closeGeneralGuide() { this.showGeneralGuide.set(false); }

  dismissPrompt() {
    this.isPromptDismissed.set(true);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  }
}


