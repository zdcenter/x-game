import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly hasUpdate = signal<boolean>(false);
  readonly newVersion = signal<string>('');
  readonly isUpdating = signal<boolean>(false);
  readonly currentVersion = environment.version;

  private registration: ServiceWorkerRegistration | null = null;
  private checkTimer: any = null;
  private lastCheckTime = 0;

  constructor() {
    if (this.isBrowser) {
      this.init();
    }
  }

  private init() {
    // 1. 注册 Service Worker 并绑定生命周期监听
    this.initServiceWorker();

    // 2. 页面就绪 2 秒后执行初次版本探测
    setTimeout(() => {
      this.checkForUpdate();
    }, 2000);

    // 3. 移动端/iPad PWA 前台恢复多重监听（从桌面切回、切任务切回）
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.triggerForegroundResumeCheck();
      }
    });
    window.addEventListener('pageshow', () => {
      this.triggerForegroundResumeCheck();
    });
    window.addEventListener('focus', () => {
      this.triggerForegroundResumeCheck();
    });

    // 4. 网络上线事件（如断网重连、Wi-Fi 重新唤醒）
    window.addEventListener('online', () => {
      this.checkForUpdate();
    });

    // 5. 路由切换时自动检查（解决玩家在游戏与大厅之间来回切换时自动发现新版本）
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // 10 秒防抖，避免频繁切页面产生无效请求
        if (Date.now() - this.lastCheckTime > 10000) {
          this.checkForUpdate();
        }
      });

    // 6. 周期性心跳探测（前台可见状态下每 90 秒探测一次）
    this.checkTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    }, 90 * 1000);
  }

  /**
   * 切回前台阶梯检查：
   * 移动端从后台恢复时，Wi-Fi/蜂窝网络通常需要 500~1500ms 重新完成握手。
   * 立即检查 1 次，并在 1.5 秒网络稳定后重试 1 次，确保 100% 成功拿到最新版本。
   */
  private triggerForegroundResumeCheck(): void {
    this.checkForUpdate();
    setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    }, 1500);
  }

  private async initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registered, scope:', this.registration.scope);

      // 检查是否有已经就绪等待激活的 Service Worker
      if (this.registration.waiting) {
        this.onWorkerWaiting(this.registration.waiting);
      }

      // 监听新 Service Worker 发现事件
      this.registration.addEventListener('updatefound', () => {
        const installingWorker = this.registration?.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.onWorkerWaiting(installingWorker);
          }
        });
      });

      // 监听 controller 变更
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed to new version');
      });

      // 监听 SW 发送的消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_ACTIVATED') {
          console.log('[PWA] New SW activated with version:', event.data.version);
        }
      });
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  }

  /**
   * 检测当前是否运行在独立的 PWA 模式（桌面快捷方式或主屏幕应用）
   */
  isStandalone(): boolean {
    if (!this.isBrowser) return false;
    return (
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  }

  private async onWorkerWaiting(worker: ServiceWorker) {
    console.log('[PWA] Service Worker waiting event triggered');
    const remoteVer = await this.fetchRemoteVersion();
    // 关键校验：仅当远程版本明确存在且与当前本地运行版本不同时，才提示更新
    if (remoteVer && remoteVer !== environment.version) {
      const dismissedVer = sessionStorage.getItem('pwa_dismissed_version');
      if (dismissedVer !== remoteVer) {
        this.hasUpdate.set(true);
      }
    } else {
      console.log('[PWA] Worker waiting but remote version matches current environment version, auto-activating...');
      // 版本一致时让 worker 静默 skipWaiting 接管，不干扰用户
      worker.postMessage({ type: 'SKIP_WAITING' });
      this.hasUpdate.set(false);
    }
  }

  /**
   * 拉取远程最新版本号元数据
   */
  async fetchRemoteVersion(): Promise<string | null> {
    if (!this.isBrowser) return null;
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
        if (data.version) {
          this.newVersion.set(data.version);
          return data.version;
        }
      }
    } catch (err) {
      console.debug('[PWA] fetchRemoteVersion error:', err);
    }
    return null;
  }

  /**
   * 主动查询 /version.json（带时间戳穿透缓存）并触发 SW 字节对比
   */
  async checkForUpdate(): Promise<void> {
    if (!this.isBrowser) return;
    this.lastCheckTime = Date.now();

    // A. 通知 Service Worker 检测 sw.js 字节是否有变动
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (e) {
        console.debug('[PWA] SW registration update check failed:', e);
      }
    }

    // B. 直连探测 /version.json 最新构建元数据
    const remoteVersion = await this.fetchRemoteVersion();
    if (remoteVersion && remoteVersion !== environment.version) {
      const dismissedVer = sessionStorage.getItem('pwa_dismissed_version');
      if (dismissedVer !== remoteVersion) {
        console.log(`[PWA] Remote version ${remoteVersion} detected (current: ${environment.version})`);
        this.hasUpdate.set(true);
      }
    } else {
      this.hasUpdate.set(false);
    }
  }

  /**
   * 立即应用更新：
   * 1. 向 waiting 中的 SW 发送 SKIP_WAITING
   * 2. 清理陈旧 CacheStorage 缓存
   * 3. 记录已应用版本防重复弹窗
   * 4. 强制重载刷新页面
   */
  async applyUpdate(): Promise<void> {
    if (!this.isBrowser) return;

    this.isUpdating.set(true);
    const ver = this.newVersion();
    if (ver) {
      sessionStorage.setItem('pwa_dismissed_version', ver);
      sessionStorage.setItem('pwa_applied_version', ver);
    }

    try {
      // 1. 通知 waiting 中的 Service Worker 立即接管
      if (this.registration?.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. 清空所有旧的本地 CacheStorage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (err) {
      console.warn('[PWA] Cache purge error before reload:', err);
    }

    // 稍作延时确保 SW 消息处理完毕后重载
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  dismiss(): void {
    const ver = this.newVersion();
    if (ver) {
      sessionStorage.setItem('pwa_dismissed_version', ver);
    }
    this.hasUpdate.set(false);
  }
}
