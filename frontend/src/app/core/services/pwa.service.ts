import { Injectable, signal, computed } from '@angular/core';
import { isBrowser, getRecentGames } from '../utils/browser.util';

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

    // 5. 初始化并监听“最近常玩游戏”动态同步 PWA 桌面 App Shortcuts (长按图标入口)
    this.syncDynamicShortcuts();
    window.addEventListener('recent_games_updated', () => {
      this.syncDynamicShortcuts();
    });
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === 'recent_games') {
        this.syncDynamicShortcuts();
      }
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.syncDynamicShortcuts();
      });
    }
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

  /**
   * 动态同步 PWA 桌面 App Shortcuts（长按桌面图标快捷菜单）
   * 根据该设备最近常玩的 4 款单机游戏，动态更新桌面快捷入口
   */
  async syncDynamicShortcuts(customGames?: string[]): Promise<void> {
    if (!isBrowser()) return;

    try {
      const recent = customGames || getRecentGames();
      const defaultTops = ['minesweeper', 'sudoku', 'tilematch', 'sliding'];
      const topIds: string[] = [];

      for (const id of recent) {
        if (!topIds.includes(id) && GAME_SHORTCUT_CATALOG[id]) {
          topIds.push(id);
        }
        if (topIds.length >= 4) break;
      }

      for (const id of defaultTops) {
        if (!topIds.includes(id)) {
          topIds.push(id);
        }
        if (topIds.length >= 4) break;
      }

      const lang = document.documentElement.lang || 'zh';
      const isZh = lang.startsWith('zh');

      const dynamicShortcuts = topIds.map(id => buildShortcut(id, isZh));

      // 1. 存入 localStorage 备份
      localStorage.setItem('pwa_dynamic_shortcuts', JSON.stringify(dynamicShortcuts));

      // 2. 存入 CacheStorage: 'pwa-dynamic-shortcuts' 供 Service Worker 拦截 /manifest.webmanifest
      if ('caches' in window) {
        try {
          const cache = await caches.open('pwa-dynamic-shortcuts');
          await cache.put(
            new Request('/__pwa__/shortcuts.json'),
            new Response(JSON.stringify(dynamicShortcuts), {
              headers: { 'Content-Type': 'application/json' }
            })
          );
        } catch (e) {
          console.debug('[PWA] Cache storage put shortcut skipped:', e);
        }
      }

      // 3. 发送消息给 Service Worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_DYNAMIC_SHORTCUTS',
          shortcuts: dynamicShortcuts
        });
      }

      // 4. 刷新 DOM 中的 <link id="app-manifest" rel="manifest"> 促使浏览器重新抓取 Manifest
      const manifestLink = document.getElementById('app-manifest') as HTMLLinkElement;
      if (manifestLink) {
        manifestLink.href = `manifest.webmanifest?t=${Date.now()}`;
      }

      console.log('[PWA] Dynamic shortcuts synced successfully:', topIds);
    } catch (err) {
      console.warn('[PWA] Failed to sync dynamic shortcuts:', err);
    }
  }
}

export interface PwaShortcutItem {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: Array<{ src: string; sizes: string; type?: string }>;
}

export interface GameShortcutMeta {
  id: string;
  emoji: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
}

export const GAME_SHORTCUT_CATALOG: Record<string, GameShortcutMeta> = {
  minesweeper: {
    id: 'minesweeper',
    emoji: '💣',
    nameZh: '经典扫雷',
    nameEn: 'Minesweeper',
    descZh: '经典单机避雷脑力挑战',
    descEn: 'Classic Minesweeper Solo Challenge'
  },
  sudoku: {
    id: 'sudoku',
    emoji: '🔢',
    nameZh: '经典数独',
    nameEn: 'Sudoku',
    descZh: '每日逻辑九宫格数独',
    descEn: 'Daily Logic Sudoku Puzzle'
  },
  tilematch: {
    id: 'tilematch',
    emoji: '🐑',
    nameZh: '羊了个羊',
    nameEn: 'Tile Match',
    descZh: '魔性 3D 三消卡牌对决',
    descEn: 'Addictive 3-Tile Match Puzzle'
  },
  sliding: {
    id: 'sliding',
    emoji: '🧩',
    nameZh: '数字华容道',
    nameEn: 'Number Sliding',
    descZh: '经典数字方块拼图解谜',
    descEn: 'Classic Number Klotski Sliding'
  },
  classic2048: {
    id: 'classic2048',
    emoji: '🔢',
    nameZh: '经典2048',
    nameEn: 'Classic 2048',
    descZh: '合成 2048 极限数字方块',
    descEn: 'Merge to 2048 Brain Teaser'
  },
  nonogram: {
    id: 'nonogram',
    emoji: '🎨',
    nameZh: '数织涂色',
    nameEn: 'Nonogram',
    descZh: '逻辑像素点阵数织线索',
    descEn: 'Picture Logic Nonogram Pixel Art'
  },
  sokoban: {
    id: 'sokoban',
    emoji: '📦',
    nameZh: '经典推箱子',
    nameEn: 'Sokoban',
    descZh: '益智推箱进库解谜闯关',
    descEn: 'Warehouse Box Pusher Challenge'
  },
  block: {
    id: 'block',
    emoji: '🟦',
    nameZh: '方块消除',
    nameEn: 'Block Puzzle',
    descZh: '10x10 经典方块消行消列',
    descEn: '10x10 Line Clear Block Puzzle'
  },
  hexa: {
    id: 'hexa',
    emoji: '⬡',
    nameZh: '六边形消除',
    nameEn: 'Hexa Puzzle',
    descZh: '蜂窝方块多向连线消除',
    descEn: 'Hexagonal Grid Clear Puzzle'
  },
  lightsout: {
    id: 'lightsout',
    emoji: '💡',
    nameZh: '点灯游戏',
    nameEn: 'Lights Out',
    descZh: '全亮或全灭矩阵翻转解谜',
    descEn: 'Binary Matrix Lights Out'
  },
  tents: {
    id: 'tents',
    emoji: '⛺',
    nameZh: '帐篷与树',
    nameEn: 'Tents and Trees',
    descZh: '为每棵树搭一顶专属帐篷',
    descEn: 'Camp Tents Around Trees'
  },
  connect: {
    id: 'connect',
    emoji: '🔗',
    nameZh: '一笔画连线',
    nameEn: 'Connect Lines',
    descZh: '无交叉配对彩点连线',
    descEn: 'Color Connect Numberlink'
  },
  watersort: {
    id: 'watersort',
    emoji: '🧪',
    nameZh: '水排序',
    nameEn: 'Water Sort',
    descZh: '试管色彩归位逻辑倒水',
    descEn: 'Color Water Sorting Puzzle'
  },
  codebreaker: {
    id: 'codebreaker',
    emoji: '🔢',
    nameZh: '密码破译 (1A2B)',
    nameEn: 'Codebreaker',
    descZh: '猜数字推理破译终极密码',
    descEn: 'Mastermind 1A2B Logic Deduction'
  },
  gomoku: {
    id: 'gomoku',
    emoji: '⚫',
    nameZh: '经典五子棋',
    nameEn: 'Gomoku',
    descZh: '五子连珠人机博弈对弈',
    descEn: 'Classic Five in a Row vs AI'
  },
  hashi: {
    id: 'hashi',
    emoji: '🌉',
    nameZh: '数桥 (Hashi)',
    nameEn: 'Hashiwokakero',
    descZh: '跨越岛屿架设连通桥梁',
    descEn: 'Bridge the Islands Puzzle'
  },
  math24: {
    id: 'math24',
    emoji: '🃏',
    nameZh: '经典24点',
    nameEn: '24 Points',
    descZh: '加减乘除心算速度挑战',
    descEn: 'Math 24 Mental Arithmetic'
  },
  drop2048: {
    id: 'drop2048',
    emoji: '⬇️',
    nameZh: '下落2048',
    nameEn: 'Drop 2048',
    descZh: '重力下落街机消除合成',
    descEn: 'Gravity Drop 2048 Arcade'
  },
  tetris: {
    id: 'tetris',
    emoji: '🧱',
    nameZh: '俄罗斯方块',
    nameEn: 'Tetris',
    descZh: '七彩方块极速消行',
    descEn: 'Classic Falling Blocks'
  },
  idiom: {
    id: 'idiom',
    emoji: '🀄',
    nameZh: '成语接龙',
    nameEn: 'Idiom Solitaire',
    descZh: '成语填字益智脑力博弈',
    descEn: 'Chinese Idiom Word Chain'
  }
};

function buildShortcut(gameId: string, isZh: boolean): PwaShortcutItem {
  const meta = GAME_SHORTCUT_CATALOG[gameId] || {
    id: gameId,
    emoji: '🎮',
    nameZh: gameId,
    nameEn: gameId,
    descZh: '益智解谜单机对局',
    descEn: 'Play puzzle game'
  };

  const name = isZh ? `${meta.nameZh} ${meta.emoji}` : `${meta.nameEn} ${meta.emoji}`;
  const shortName = isZh ? meta.nameZh.replace('经典', '') : meta.nameEn;
  const description = isZh ? meta.descZh : meta.descEn;

  return {
    name,
    short_name: shortName,
    description,
    url: `/games/${gameId}?from=pwa_shortcut`,
    icons: [
      { src: 'assets/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: 'assets/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  };
}


