import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { isBrowser } from '../utils/browser.util';

@Injectable({ providedIn: 'root' })
export class WindowSizeService {
  private router = inject(Router);

  readonly size = signal(this.measure());

  private refreshTimers: any[] = [];

  constructor() {
    if (isBrowser()) {
      // 1. 普通 resize 事件：若页面处于后台隐藏状态（document.hidden），忽略瞬态错误尺寸
      window.addEventListener('resize', () => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        this.updateSize();
      });

      // 2. 监听 visualViewport resize
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          if (typeof document !== 'undefined' && document.hidden) return;
          this.updateSize();
        });
      }

      // 3. 屏幕旋转与方向改变
      window.addEventListener('orientationchange', () => {
        this.scheduleMultiRefresh();
      });
      if (window.screen?.orientation) {
        window.screen.orientation.addEventListener('change', () => {
          this.scheduleMultiRefresh();
        });
      }

      // 4. 切后台与从后台恢复（修复 iPadOS / iOS PWA 从桌面切回时尺寸冻结/异常缩小的问题）
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // 从桌面或后台切回前台：WebKit 不会自动派发 window.resize，需多阶梯刷新重新校准视口
          this.scheduleMultiRefresh();
        }
      });

      // 5. 页面重新展示（pageshow / bfcache 恢复）
      window.addEventListener('pageshow', () => {
        this.scheduleMultiRefresh();
      });

      // 6. 窗口重新获取焦点（focus）
      window.addEventListener('focus', () => {
        this.scheduleMultiRefresh();
      });

      // 7. 路由切换时自动重新校准（解决用户在游戏间切进切出时偶尔继承异常尺寸的问题）
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => {
          this.scheduleMultiRefresh();
        });
    }
  }

  /**
   * 立即刷新视口尺寸
   */
  public refresh(): void {
    this.updateSize();
  }

  /**
   * 阶梯式延时多重刷新：
   * iOS / iPadOS PWA 切回前台或旋转时有系统级动效，阶梯刷新可确保在 0~500ms 关键节点精确校准。
   */
  public scheduleMultiRefresh(): void {
    if (!isBrowser()) return;

    // 清除上一次排队的计时器
    this.refreshTimers.forEach(t => clearTimeout(t));
    this.refreshTimers = [];

    // 立即执行一次
    this.updateSize();

    const delays = [50, 150, 300, 500];
    delays.forEach(delay => {
      const timer = setTimeout(() => {
        this.updateSize();
      }, delay);
      this.refreshTimers.push(timer);
    });
  }

  private updateSize(): void {
    if (!isBrowser()) return;

    // 如果处于隐藏状态，拒绝保存后台快照尺寸
    if (typeof document !== 'undefined' && document.hidden) return;

    const next = this.measure();
    const curr = this.size();

    // 仅在尺寸确实改变时更新 signal
    if (next.w !== curr.w || next.h !== curr.h) {
      this.size.set(next);

      // 触发布局重排并派发 resize 事件，同步通知可能自行监听 window resize 的子组件
      try {
        if (typeof document !== 'undefined' && document.body) {
          void document.body.offsetHeight;
        }
        window.dispatchEvent(new Event('resize'));
      } catch {}
    }
  }

  private measure(): { w: number; h: number } {
    if (!isBrowser()) {
      return { w: 1024, h: 768 };
    }

    const docEl = document.documentElement;
    const body = document.body;

    const winW = window.innerWidth || 0;
    const docW = docEl?.clientWidth || 0;
    const bodyW = body?.clientWidth || 0;
    const w = Math.max(winW, docW, bodyW) || 1024;

    const winH = window.innerHeight || 0;
    const docH = docEl?.clientHeight || 0;
    const bodyH = body?.clientHeight || 0;
    const h = Math.max(winH, docH, bodyH) || 768;

    return { w, h };
  }
}
