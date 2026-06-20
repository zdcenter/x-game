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
  templateUrl: './share-modal.component.html',
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
