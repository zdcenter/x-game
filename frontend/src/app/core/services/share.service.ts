import { Injectable, inject, signal } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { isBrowser, getOrigin } from '../utils/browser.util';

export interface ShareData {
  title: string;
  text: string;
  url: string;
  // Optional extras for rich share card
  gameName?: string;
  gameEmoji?: string;
  isWin?: boolean;
  stats?: { icon?: string; label?: string; value: string | number }[];
}

export type ShareResult = 'native' | 'clipboard' | 'modal' | 'aborted';

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private toastService = inject(ToastService);
  private i18n = inject(I18nService);

  /**
   * Reactive signal indicating whether the current browser/device supports Web Share API.
   */
  readonly canNativeShare = signal<boolean>(
    isBrowser() && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );

  // State for the custom share modal
  isModalOpen = signal(false);
  currentShareData = signal<ShareData | null>(null);

  /**
   * Triggers the share functionality.
   * On mobile/supported devices, it opens the native system share dialog (WeChat, QQ, WhatsApp, Telegram, etc.).
   * On unsupported devices or if native share fails, it opens our custom modal with a QR code and copy button.
   */
  async share(data: ShareData): Promise<ShareResult> {
    const cleanUrl = this.normalizeUrl(data.url);
    const payload: { title?: string; text?: string; url?: string } = {
      title: data.title,
      text: data.text,
      url: cleanUrl
    };

    if (this.canNativeShare()) {
      try {
        if (typeof navigator.canShare === 'function') {
          // If browser can't share text + url together, fallback to url only
          if (!navigator.canShare(payload) && navigator.canShare({ url: cleanUrl })) {
            await navigator.share({ url: cleanUrl });
            return 'native';
          }
        }
        await navigator.share(payload);
        return 'native';
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return 'aborted';
        }
        this.openFallbackModal({ ...data, url: cleanUrl });
        return 'modal';
      }
    } else {
      this.openFallbackModal({ ...data, url: cleanUrl });
      return 'modal';
    }
  }

  /**
   * Direct share or copy: if native share is supported, wake it up;
   * otherwise copy url directly to clipboard with toast notification.
   */
  async shareOrCopy(data: ShareData): Promise<ShareResult> {
    const cleanUrl = this.normalizeUrl(data.url);
    if (this.canNativeShare()) {
      return this.share({ ...data, url: cleanUrl });
    }
    await this.copyUrl(cleanUrl);
    return 'clipboard';
  }

  openFallbackModal(data: ShareData) {
    this.currentShareData.set(data);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    setTimeout(() => this.currentShareData.set(null), 300); // Clear after animation
  }

  copyFull(text: string, url: string) {
    const full = `${text}\n👉 ${this.normalizeUrl(url)}`;
    return this.copyText(full);
  }

  copyUrl(url: string) {
    return this.copyText(this.normalizeUrl(url));
  }

  private normalizeUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${getOrigin()}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  copyText(str: string): Promise<boolean> {
    if (!isBrowser()) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(str).then(() => {
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
        return true;
      }).catch(() => {
        return this.copyFallback(str);
      });
    } else {
      return Promise.resolve(this.copyFallback(str));
    }
  }

  private copyFallback(str: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let success = false;
    try {
      success = document.execCommand('copy');
      if (success) {
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
      } else {
        this.toastService.show('Failed to copy', 'error');
      }
    } catch {
      this.toastService.show('Failed to copy', 'error');
    }
    document.body.removeChild(ta);
    return success;
  }
}
