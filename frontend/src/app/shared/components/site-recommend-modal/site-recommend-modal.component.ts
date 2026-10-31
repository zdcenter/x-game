import { Component, inject, computed, effect, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteRecommendService, RecommendScript } from '../../../core/services/site-recommend.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { isBrowser } from '../../../core/utils/browser.util';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-site-recommend-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Floating Action Button (FAB) anchored at bottom-right of screen -->
    <div class="fixed bottom-6 right-4 sm:right-6 z-40 flex items-center select-none">
      <button
        (click)="openModal()"
        type="button"
        class="group relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:via-teal-400 hover:to-green-400 text-white font-black text-xs sm:text-sm shadow-[0_8px_25px_rgba(16,185,129,0.38)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.58)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/30 backdrop-blur-md cursor-pointer animate-pulse-gentle"
        [title]="i18n.t('recommend.fab_title')() || '推荐本站给好友，分享宝藏益智游戏！'">
        <span class="text-base sm:text-lg group-hover:scale-125 transition-transform">🎁</span>
        <span class="tracking-wide hidden xs:inline sm:inline">
          {{ i18n.t('recommend.fab_text')() || '推荐本站' }}
        </span>
      </button>
    </div>

    <!-- Modal Backdrop & Dialog -->
    @if (recommendService.isOpen()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity" (click)="closeModal()"></div>

        <!-- Dialog Container -->
        <div class="relative bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in z-10 text-[var(--color-text-main)]">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--color-border-card)] bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                🎁
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-black tracking-tight text-[var(--color-text-main)]">
                  {{ i18n.t('recommend.modal_title')() || '推荐 Puzzle PK · 脑力宇宙' }}
                </h3>
                <p class="text-xs text-[var(--color-text-secondary)]">
                  {{ i18n.t('recommend.modal_subtitle')() || '好游戏值得与好友共享' }}
                </p>
              </div>
            </div>

            <!-- Close Button -->
            <button
              (click)="closeModal()"
              type="button"
              class="w-8 h-8 rounded-full bg-[var(--color-bg-sub)] hover:bg-[var(--color-border-card)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Body Scrollable Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
            
            <!-- Section 1: 场景分享寄语切换 -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-[var(--color-text-main)]">
                  <span>💬</span>
                  <span>{{ i18n.t('recommend.scripts_heading')() || '分享给好友（点击切换寄语）' }}</span>
                </span>
                <span class="text-[11px] text-[var(--color-text-muted)]">
                  {{ i18n.t('recommend.scripts_tip')() || '挑选一句合适的话发给好友' }}
                </span>
              </div>

              <!-- Script Tabs -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                @for (item of scripts; track item.id) {
                  <button
                    (click)="selectScript(item.id)"
                    type="button"
                    class="px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none"
                    [ngClass]="recommendService.activeScriptId() === item.id ?
                      'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-sm scale-[1.02]' :
                      'bg-[var(--color-bg-sub)] text-[var(--color-text-secondary)] border-[var(--color-border-card)] hover:bg-[var(--color-border-card)]'">
                    <span>{{ item.icon }}</span>
                    <span>{{ i18n.t(item.tabKey)() }}</span>
                  </button>
                }
              </div>

              <!-- Active Script Preview Box -->
              <div class="relative rounded-2xl bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] p-4 text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)]">
                <div class="font-semibold text-[var(--color-text-main)] mb-1 flex items-center gap-1.5">
                  <span>{{ currentScriptObj().icon }}</span>
                  <span>{{ i18n.t(currentScriptObj().titleKey)() }}</span>
                </div>
                <div class="whitespace-pre-wrap select-all cursor-text font-normal text-[var(--color-text-main)] bg-[var(--color-bg-card)]/80 p-3 rounded-xl border border-[var(--color-border-card)]">
                  {{ activeScriptMessage() }}
                </div>

                <!-- One-Click Copy Script Button -->
                <div class="mt-3 flex items-center gap-2">
                  <button
                    (click)="copyActiveScript()"
                    type="button"
                    class="flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>📋</span>
                    <span>{{ i18n.t('recommend.copy_script_btn')() || '一键复制发给好友' }}</span>
                  </button>
                  @if (canNativeShare()) {
                    <button
                      (click)="shareActiveScriptNative()"
                      type="button"
                      class="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-500 hover:bg-indigo-400 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="直接调用系统/手机微信分享">
                      <span>📲</span>
                      <span class="hidden sm:inline">{{ i18n.t('recommend.direct_share')() || '直接分享' }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Section 2: 精美邀请海报与二维码 (Poster & QR Code) -->
            <div class="space-y-2.5">
              <span class="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-[var(--color-text-main)]">
                <span>🖼️</span>
                <span>{{ i18n.t('recommend.poster_heading')() || '专属邀请卡片与二维码（长按/下载）' }}</span>
              </span>

              <div class="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg relative overflow-hidden" #posterCard>
                <!-- Subtle Neon Glow Backing -->
                <div class="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                  <div class="flex-1 text-center sm:text-left space-y-2">
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold text-cyan-300">
                      <span>✨</span>
                      <span>Puzzle PK · 益智脑力宇宙</span>
                    </div>
                    <h4 class="text-base sm:text-lg font-black tracking-tight text-white">
                      {{ i18n.t('recommend.poster_slogan')() || '20+ 款精美益智游戏 · 免下载点开即玩' }}
                    </h4>
                    <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {{ i18n.t('recommend.poster_sub')() || '俄罗斯方块 · 扫雷 · 帐篷与树 · 羊了个羊 · 经典2048 · 实时双人PK' }}
                    </p>
                    
                    <!-- Popular Game Badge Strip -->
                    <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold">🧱 俄罗斯方块</span>
                      <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold">💣 扫雷</span>
                      <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold">⛺ 帐篷与树</span>
                      <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold">🐑 羊了个羊</span>
                    </div>
                  </div>

                  <!-- QR Code Canvas Container -->
                  <div class="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white text-slate-900 shadow-xl shrink-0">
                    <canvas #qrcodeCanvas class="w-28 h-28 sm:w-32 sm:h-32 rounded-lg"></canvas>
                    <span class="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                      {{ i18n.t('recommend.scan_play')() || '微信/手机扫码即玩' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Poster Actions: 保存海报、直接发送海报到社交圈、复制官网链接 -->
              <div class="grid grid-cols-3 gap-2 pt-1">
                <button
                  (click)="savePosterImage()"
                  type="button"
                  class="py-2 px-2 sm:px-3 rounded-xl text-xs font-bold bg-[var(--color-bg-sub)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  [title]="i18n.t('recommend.save_poster_btn')() || '保存海报图片到本地相册'">
                  <span>📥</span>
                  <span class="truncate">{{ i18n.t('recommend.save_poster_btn')() || '保存海报' }}</span>
                </button>
                <button
                  (click)="sharePosterImageDirect()"
                  type="button"
                  class="py-2 px-2 sm:px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  [title]="i18n.t('recommend.send_poster_btn')() || '直接发送海报到微信好友/朋友圈'">
                  <span>📤</span>
                  <span class="truncate">{{ i18n.t('recommend.send_poster_btn')() || '发送海报' }}</span>
                </button>
                <button
                  (click)="copyLinkOnly()"
                  type="button"
                  class="py-2 px-2 sm:px-3 rounded-xl text-xs font-bold bg-[var(--color-bg-sub)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  [title]="i18n.t('recommend.copy_link_btn')() || '复制纯净官方网址'">
                  <span>🔗</span>
                  <span class="truncate">{{ i18n.t('recommend.copy_link_btn')() || '复制网址' }}</span>
                </button>
              </div>
            </div>

            <!-- Section 3: 多社交渠道快捷分享 (Social Quick Channels) -->
            <div class="space-y-2 pt-2 border-t border-[var(--color-border-card)]">
              <span class="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                {{ i18n.t('recommend.quick_channels')() || '一键直达社交圈' }}
              </span>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <!-- 微信 -->
                <button (click)="shareToWechat()" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-emerald-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base text-emerald-500">💬</span>
                  <span class="text-[10px]">微信好友</span>
                </button>
                <!-- QQ -->
                <a [href]="qqShareUrl()" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-sky-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base text-sky-500">🐧</span>
                  <span class="text-[10px]">QQ / 空间</span>
                </a>
                <!-- 微博 -->
                <a [href]="weiboShareUrl()" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-rose-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base text-rose-500">📢</span>
                  <span class="text-[10px]">新浪微博</span>
                </a>
                <!-- WhatsApp -->
                <a [href]="whatsappUrl()" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-green-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base text-green-500">🟢</span>
                  <span class="text-[10px]">WhatsApp</span>
                </a>
                <!-- X / Twitter -->
                <a [href]="twitterUrl()" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-slate-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base">𝕏</span>
                  <span class="text-[10px]">X / 推特</span>
                </a>
                <!-- Telegram -->
                <a [href]="telegramUrl()" target="_blank" rel="noopener noreferrer" class="p-2 rounded-xl bg-[var(--color-bg-sub)] hover:bg-blue-500/10 border border-[var(--color-border-card)] flex flex-col items-center gap-1 text-xs font-medium cursor-pointer transition-all">
                  <span class="text-base text-blue-500">✈️</span>
                  <span class="text-[10px]">Telegram</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>
    }

    <!-- 微信内右上角分享指引遮罩 (在微信内置浏览器内唤起) -->
    @if (showWechatMask()) {
      <div class="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex flex-col items-end p-6 cursor-pointer select-none"
           (click)="showWechatMask.set(false)">
        <div class="text-right text-white space-y-2 max-w-xs animate-bounce">
          <span class="text-4xl inline-block">↗️</span>
          <p class="text-base font-black tracking-tight text-amber-300">
            {{ i18n.t('recommend.wechat_mask_title')() || '点击右上角【 ··· 】' }}
          </p>
          <p class="text-xs text-slate-200 leading-relaxed">
            {{ i18n.t('recommend.wechat_mask_tip')() || '选择【发送给朋友】或【分享到朋友圈】即可即刻开战！' }}
          </p>
        </div>
        <div class="mt-12 w-full flex justify-center">
          <button type="button" class="px-6 py-2 rounded-full border border-white/40 text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer">
            {{ i18n.t('recommend.wechat_mask_close')() || '我知道了' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes pulseGentle {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.04);
      }
    }
    .animate-pulse-gentle {
      animation: pulseGentle 2.6s ease-in-out infinite;
    }
  `]
})
export class SiteRecommendModalComponent {
  recommendService = inject(SiteRecommendService);
  protected i18n = inject(I18nService);
  private authStore = inject(AuthStore);

  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  readonly showWechatMask = signal(false);

  canNativeShare = computed(() => isBrowser() && !!navigator.share);

  isWechatBrowser = computed(() => {
    if (!isBrowser()) return false;
    return /micromessenger/i.test(navigator.userAgent);
  });

  // 四大场景分享寄语
  readonly scripts: RecommendScript[] = [
    {
      id: 'casual',
      icon: '🐟',
      tabKey: 'recommend.tab_casual',
      titleKey: 'recommend.title_casual',
      templateKey: 'recommend.text_casual'
    },
    {
      id: 'pk',
      icon: '⚔️',
      tabKey: 'recommend.tab_pk',
      titleKey: 'recommend.title_pk',
      templateKey: 'recommend.text_pk'
    },
    {
      id: 'family',
      icon: '👨‍👩‍👧',
      tabKey: 'recommend.tab_family',
      titleKey: 'recommend.title_family',
      templateKey: 'recommend.text_family'
    },
    {
      id: 'minimal',
      icon: '🌟',
      tabKey: 'recommend.tab_minimal',
      titleKey: 'recommend.title_minimal',
      templateKey: 'recommend.text_minimal'
    }
  ];

  currentScriptObj = computed(() => {
    const id = this.recommendService.activeScriptId();
    return this.scripts.find(s => s.id === id) || this.scripts[0];
  });

  activeScriptMessage = computed(() => {
    const obj = this.currentScriptObj();
    const url = this.recommendService.inviteUrl();
    const rawTpl = this.i18n.t(obj.templateKey)();
    if (!rawTpl || rawTpl === obj.templateKey) {
      // 优雅默认兜底
      switch (obj.id) {
        case 'casual':
          return `发现了一个超好玩的免费益智游戏网站！完全免下载、无广告干扰，浏览器点开就能玩。俄罗斯方块、扫雷、2048、消消乐全都有，随时随地放松一下，快来和我一起玩！👉 ${url}`;
        case 'pk':
          return `来跟我比一场益智游戏吧！这个在线对决平台很有趣，24点、数独、连线实时联机，还能互相切磋，快来看看谁更厉害！🔥👉 ${url}`;
        case 'family':
          return `推荐这个绿色纯净的脑力训练小站，没有任何不良信息，全是经典的数学推理和逻辑思维小游戏，特别适合锻炼专注力和思维力！💡👉 ${url}`;
        case 'minimal':
        default:
          return `分享一个好玩的免费在线益智游戏平台：20+款经典益智游戏，单人休闲和好友切磋都可以，免下载点开即玩，非常适合闲暇时放松！✨👉 ${url}`;
      }
    }
    return rawTpl.replace('{link}', url).replace('{url}', url);
  });

  // 社交分享链接
  twitterUrl = computed(() => {
    const text = this.activeScriptMessage();
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  });

  telegramUrl = computed(() => {
    const url = this.recommendService.inviteUrl();
    const text = this.activeScriptMessage();
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  });

  whatsappUrl = computed(() => {
    const text = this.activeScriptMessage();
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  qqShareUrl = computed(() => {
    const url = this.recommendService.inviteUrl();
    const title = this.i18n.t('recommend.poster_slogan')() || 'Puzzle PK 脑力竞技宇宙 · 20+ 款精美益智游戏';
    return `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(this.activeScriptMessage())}`;
  });

  weiboShareUrl = computed(() => {
    const url = this.recommendService.inviteUrl();
    const title = this.activeScriptMessage();
    return `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  });

  constructor() {
    // 弹窗打开时渲染专属二维码
    effect(() => {
      const isOpen = this.recommendService.isOpen();
      const url = this.recommendService.inviteUrl();
      if (isOpen && url) {
        setTimeout(() => {
          if (this.qrcodeCanvas?.nativeElement) {
            QRCode.toCanvas(this.qrcodeCanvas.nativeElement, url, {
              width: 128,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' }
            });
          }
        }, 80);
      }
    });
  }

  openModal() {
    this.recommendService.open();
  }

  closeModal() {
    this.recommendService.close();
  }

  selectScript(id: 'casual' | 'pk' | 'family' | 'minimal') {
    this.recommendService.activeScriptId.set(id);
  }

  copyActiveScript() {
    this.recommendService.copyText(
      this.activeScriptMessage(),
      '✨ 推荐内容已复制，快发给好友吧！'
    );
  }

  copyLinkOnly() {
    this.recommendService.copyText(
      this.recommendService.inviteUrl(),
      '🔗 专属推广链接已复制！'
    );
  }

  async shareActiveScriptNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Puzzle PK · 益智脑力宇宙',
          text: this.activeScriptMessage(),
          url: this.recommendService.inviteUrl()
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          this.copyActiveScript();
        }
      }
    } else {
      this.copyActiveScript();
    }
  }

  async shareToWechat() {
    // 1. 若在微信内置浏览器内，弹出右上角优雅指引蒙层
    if (this.isWechatBrowser()) {
      this.showWechatMask.set(true);
      return;
    }

    // 2. 若在手机浏览器（Safari / Chrome / Edge 等），优先唤起原生系统分享面板（内含微信，一键直发）
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Puzzle PK · 益智脑力宇宙',
          text: this.activeScriptMessage(),
          url: this.recommendService.inviteUrl()
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // 用户主动取消面板
      }
    }

    // 3. 电脑端或不支持面板时，复制文本并弹出贴心指引
    this.recommendService.copyText(
      this.activeScriptMessage(),
      '💬 推荐内容已复制，打开微信发给好友即可！'
    );
  }

  // 绘制海报 Canvas（纯净官方网址，绝无任何返利推销参数）
  drawPosterCanvas(): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 背景深邃星空渐变
    const grad = ctx.createLinearGradient(0, 0, 750, 420);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 750, 420);

    // 装饰光晕
    ctx.beginPath();
    ctx.arc(680, 50, 150, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(50, 370, 160, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fill();

    // 品牌文字
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('✨ Puzzle PK · 益智脑力宇宙', 45, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('20+ 款精美益智游戏 · 点开即玩', 45, 125);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('俄罗斯方块 · 扫雷 · 帐篷与树 · 羊了个羊 · 经典2048 · 实时PK', 45, 175);

    // 特色标签
    const tags = ['免下载安装', '绿色无广告', '实时PK对决', '多端自适应'];
    let tagX = 45;
    tags.forEach(t => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(tagX, 210, 115, 34, 8);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(t, tagX + 15, 233);
      tagX += 128;
    });

    // 纯净官方网址展示（绝对不带 ?ref= 等营销后缀，权威让人信赖）
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('🌐 官方在线玩：https://www.puzzlepk.com', 45, 360);

    // 绘制二维码
    if (this.qrcodeCanvas?.nativeElement) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(550, 180, 150, 150, 12);
      ctx.fill();

      ctx.drawImage(this.qrcodeCanvas.nativeElement, 560, 190, 130, 130);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('微信/手机扫码即玩', 625, 350);
      ctx.textAlign = 'start';
    }

    return canvas;
  }

  // 保存海报图片到本地
  savePosterImage() {
    const canvas = this.drawPosterCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `puzzlepk-invite-${Date.now()}.png`;
    a.click();
    this.recommendService.copyText('', '📥 海报图片已成功生成并下载！');
  }

  // 直接发送海报图片到微信好友/朋友圈/社交圈（优先调用手机原生系统分享面板）
  async sharePosterImageDirect() {
    const canvas = this.drawPosterCanvas();
    if (!canvas) return;

    if (navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], 'puzzlepk-invite.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Puzzle PK · 益智脑力宇宙',
              text: this.activeScriptMessage()
            });
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return; // 用户主动取消
      }
    }

    // 若当前浏览器不支持文件分享面板，自动保存海报并友好提示
    this.savePosterImage();
  }
}
