import { Injectable, inject, signal } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';

export interface ShareData {
  title: string;
  text: string;
  url: string;
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
        await navigator.share(data);
        return; // Success
      } catch (err: any) {
        // If the user cancelled, it throws an AbortError. We shouldn't show a fallback for user cancellation.
        if (err.name !== 'AbortError') {
          console.error('Web Share failed', err);
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

  copyUrl(url: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
      }).catch(err => {
        console.error('Failed to copy', err);
        this.toastService.show('Failed to copy', 'error');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.toastService.show(this.i18n.t('share.copied')() || 'Link copied to clipboard!', 'success');
      } catch (err) {
        this.toastService.show('Failed to copy', 'error');
      }
      document.body.removeChild(textArea);
    }
  }
}
