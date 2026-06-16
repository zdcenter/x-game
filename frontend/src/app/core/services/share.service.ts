import { Injectable, inject, signal } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';

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

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private toastService = inject(ToastService);
  private i18n = inject(I18nService);

  // State for the custom share modal
  isModalOpen = signal(false);
  currentShareData = signal<ShareData | null>(null);

  /**
   * Triggers the share functionality.
   * On mobile/supported devices, it opens the native share dialog.
   * On unsupported devices, it opens our custom modal with a QR code and copy button.
   */
  async share(data: ShareData) {
    if (navigator.share) {
      try {
        // Only pass the standard Web Share API fields — extra props cause TypeError on iOS Safari
        await navigator.share({ title: data.title, text: data.text, url: data.url });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          this.openFallbackModal(data);
        }
      }
    } else {
      this.openFallbackModal(data);
    }
  }

  private openFallbackModal(data: ShareData) {
    this.currentShareData.set(data);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    setTimeout(() => this.currentShareData.set(null), 300); // Clear after animation
  }

  copyFull(text: string, url: string) {
    const full = `${text}\n👉 ${url}`;
    this.copyText(full);
  }

  copyUrl(url: string) {
    this.copyText(url);
  }

  private copyText(str: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(str).then(() => {
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
      }).catch(() => {
        this.toastService.show('Failed to copy', 'error');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = str;
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
      } catch {
        this.toastService.show('Failed to copy', 'error');
      }
      document.body.removeChild(ta);
    }
  }
}
