import { Component, inject, effect, ViewChild, ElementRef, signal, computed, untracked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareService } from '../../../core/services/share.service';
import { ShareImageService } from '../../../core/services/share-image.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { isBrowser, getOrigin } from '../../../core/utils/browser.util';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shareService.isModalOpen()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="shareService.closeModal()"></div>

        <div class="relative bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-card)] bg-[var(--color-bg-card)] flex-none">
            <h3 class="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
              <svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              {{ i18n.t('share.title')() }}
            </h3>
            <button (click)="shareService.closeModal()" class="text-[var(--color-text-muted)] hover:text-red-400 transition-colors p-1 rounded-lg">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

            <!-- 0. Native system share (if supported) -->
            @if (canNativeShare()) {
              <button (click)="triggerNativeShare()"
                class="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-lg hover:shadow-xl active:scale-95 transition-all text-base">
                <!-- iOS/Android style share icon -->
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4m0 0L8 6m4-4v13"/>
                </svg>
                {{ i18n.t('share.system_share')() }}
              </button>
              <div class="flex items-center gap-3 text-[var(--color-text-muted)]">
                <div class="flex-1 h-px bg-[var(--color-border-card)]"></div>
                <span class="text-xs">{{ i18n.t('share.or_copy')() }}</span>
                <div class="flex-1 h-px bg-[var(--color-border-card)]"></div>
              </div>
            }

            <!-- 1. Copy full message -->
            <div class="space-y-2">
              <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed select-all cursor-text">{{ fullMessage() }}</div>
              <button (click)="copyFull()"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 active:scale-95 transition-all">
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                {{ i18n.t('share.copy_all')() }}
              </button>
            </div>

            <!-- 2. Share image (game results only) -->
            @if (shareService.currentShareData()?.isWin !== undefined) {
              <div class="space-y-2">
                <p class="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1">
                  {{ i18n.t('share.share_image')() }}
                </p>
                @if (isGenerating()) {
                  <div class="flex items-center justify-center gap-2 py-10 text-[var(--color-text-muted)] text-sm bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)]">
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {{ i18n.t('share.generating')() }}
                  </div>
                } @else if (imageObjectUrl()) {
                  <img [src]="imageObjectUrl()" alt="share card" class="w-full rounded-xl border border-[var(--color-border-card)] shadow-lg"/>
                  <div class="flex gap-2">
                    <button (click)="downloadImage()"
                      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:bg-[var(--color-border-card)] active:scale-95 transition-all">
                      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      {{ i18n.t('share.download_image')() }}
                    </button>
                    @if (canShareImageFile()) {
                      <button (click)="shareImageFile()"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-md active:scale-95 transition-all">
                        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        {{ i18n.t('share.share_image')() }}
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <!-- 3. QR code -->
            <div class="flex flex-col items-center gap-2 py-2">
              <p class="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {{ i18n.t('share.qr_label')() }}
              </p>
              <div class="bg-white p-3 rounded-xl shadow-inner group relative">
                <canvas #qrcodeCanvas class="w-36 h-36 block"></canvas>
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p class="text-white font-bold text-xs text-center px-3">
                    {{ i18n.t('share.scan')() }}
                  </p>
                </div>
              </div>
              <p class="text-xs text-[var(--color-text-muted)] text-center">
                {{ i18n.t('share.scan_hint')() }}
              </p>
            </div>

            <!-- 4. Admin: social platform shortcuts -->
            @if (isAdmin()) {
              <div class="pt-2 border-t border-[var(--color-border-card)] space-y-2">
                <p class="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1">
                  {{ i18n.t('share.quick_share')() }}
                </p>
                <div class="flex gap-2">
                  <a [href]="twitterUrl()" target="_blank" rel="noopener"
                     class="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-slate-400 hover:bg-slate-800 transition-all text-[var(--color-text-main)]">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span class="text-[10px] font-bold">X</span>
                  </a>
                  <a [href]="telegramUrl()" target="_blank" rel="noopener"
                     class="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-sky-400 hover:bg-sky-900/20 transition-all text-sky-400">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    <span class="text-[10px] font-bold">Telegram</span>
                  </a>
                  <a [href]="whatsappUrl()" target="_blank" rel="noopener"
                     class="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-green-400 hover:bg-green-900/20 transition-all text-green-400">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span class="text-[10px] font-bold">WhatsApp</span>
                  </a>
                  <a [href]="lineUrl()" target="_blank" rel="noopener"
                     class="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-lime-400 hover:bg-lime-900/20 transition-all text-lime-400">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                    <span class="text-[10px] font-bold">Line</span>
                  </a>
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    }
  `
})
export class ShareModalComponent implements OnDestroy {
  shareService = inject(ShareService);
  private shareImageService = inject(ShareImageService);
  protected i18n = inject(I18nService);
  private authStore = inject(AuthStore);

  isAdmin = computed(() => this.authStore.currentUser()?.role === 'admin');
  canNativeShare = computed(() => isBrowser() && !!navigator.share);

  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  isGenerating = signal(false);
  private imageBlob = signal<Blob | null>(null);
  imageObjectUrl = signal<string>('');

  canShareImageFile = signal(false);

  fullMessage = computed(() => {
    const d = this.shareService.currentShareData();
    return d ? `${d.text}\n👉 ${d.url}` : '';
  });

  twitterUrl = computed(() => {
    const d = this.shareService.currentShareData();
    if (!d) return '#';
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(d.text + '\n' + d.url)}`;
  });

  telegramUrl = computed(() => {
    const d = this.shareService.currentShareData();
    if (!d) return '#';
    return `https://t.me/share/url?url=${encodeURIComponent(d.url)}&text=${encodeURIComponent(d.text)}`;
  });

  whatsappUrl = computed(() => {
    const d = this.shareService.currentShareData();
    if (!d) return '#';
    return `https://wa.me/?text=${encodeURIComponent(d.text + '\n' + d.url)}`;
  });

  lineUrl = computed(() => {
    const d = this.shareService.currentShareData();
    if (!d) return '#';
    return `https://line.me/R/msg/text/?${encodeURIComponent(d.text + '\n' + d.url)}`;
  });

  constructor() {
    // QR code generation
    effect(() => {
      const data = this.shareService.currentShareData();
      const isOpen = this.shareService.isModalOpen();
      if (isOpen && data?.url) {
        setTimeout(() => {
          if (this.qrcodeCanvas?.nativeElement) {
            QRCode.toCanvas(this.qrcodeCanvas.nativeElement, data.url, {
              width: 144, margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' }
            });
          }
        }, 60);
      }
    });

    // Share image generation (only for game results)
    effect(() => {
      const data = this.shareService.currentShareData();
      const isOpen = this.shareService.isModalOpen();

      if (isOpen && data && data.isWin !== undefined) {
        untracked(() => this.generateImage(data));
      } else if (!isOpen) {
        untracked(() => this.revokeImageUrl());
      }
    });
  }

  private async generateImage(data: ReturnType<typeof this.shareService.currentShareData>) {
    if (!data) return;
    this.isGenerating.set(true);
    this.revokeImageUrl();

    const origin = getOrigin() || 'https://www.puzzlepk.com';
    const siteDomain = origin.replace(/^https?:\/\//, '');

    const blob = await this.shareImageService.generateCard({
      gameName: data.gameName || data.title.replace(/^Puzzle PK - /, ''),
      gameEmoji: data.gameEmoji,
      isWin: data.isWin!,
      winText: this.i18n.t('game.you_win')() || 'Victory!',
      loseText: this.i18n.t('game.you_lose')() || 'Game Over',
      stats: data.stats,
      siteDomain,
    });

    this.imageBlob.set(blob);
    if (blob) {
      this.imageObjectUrl.set(URL.createObjectURL(blob));
      this.checkCanShare();
    }
    this.isGenerating.set(false);
  }

  private checkCanShare() {
    if (!isBrowser()) { this.canShareImageFile.set(false); return; }
    const blob = this.imageBlob();
    if (!blob) { this.canShareImageFile.set(false); return; }
    try {
      const testFile = new File([], 'test.png', { type: 'image/png' });
      this.canShareImageFile.set(!!(navigator.canShare && navigator.canShare({ files: [testFile] })));
    } catch {
      this.canShareImageFile.set(false);
    }
  }

  async triggerNativeShare() {
    const data = this.shareService.currentShareData();
    if (!data) return;
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      this.shareService.closeModal();
    } catch (err: any) {
      if (err.name === 'AbortError') return; // user cancelled, do nothing
    }
  }

  copyFull() {
    const d = this.shareService.currentShareData();
    if (d) this.shareService.copyFull(d.text, d.url);
  }

  downloadImage() {
    const url = this.imageObjectUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'puzzlepk-result.png';
    a.click();
  }

  async shareImageFile() {
    const blob = this.imageBlob();
    const data = this.shareService.currentShareData();
    if (!blob || !data) return;
    const file = new File([blob], 'puzzlepk-result.png', { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: data.title, text: data.text, url: data.url });
    } catch { /* cancelled */ }
  }

  private revokeImageUrl() {
    const url = this.imageObjectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.imageObjectUrl.set('');
    }
    this.imageBlob.set(null);
  }

  ngOnDestroy() {
    this.revokeImageUrl();
  }
}
