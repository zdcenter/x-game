import { Component, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareService } from '../../../core/services/share.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shareService.isModalOpen()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
             (click)="shareService.closeModal()"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-scale-in">
          
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
            <h3 class="text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <ng-container i18n="@@share.title">share.title</ng-container>
            </h3>
            <button (click)="shareService.closeModal()" class="text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-black/10">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 flex flex-col items-center">
            
            <p class="text-[var(--color-text-secondary)] text-center mb-6 font-medium whitespace-pre-wrap">
              {{ shareService.currentShareData()?.text }}
            </p>

            <!-- QR Code Container -->
            <div class="bg-white p-3 rounded-xl shadow-inner mb-2 relative group">
              <canvas #qrcodeCanvas class="w-48 h-48"></canvas>
              <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p class="text-white font-bold text-sm text-center px-4">
                  <ng-container i18n="@@share.scan">share.scan</ng-container>
                </p>
              </div>
            </div>
            <p class="text-xs text-[var(--color-text-muted)] text-center mb-6">
              <ng-container i18n="@@share.scan_hint">Scan with any camera or QR reader</ng-container>
            </p>

            <!-- URL Copy Container -->
            <div class="w-full flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl p-2 shadow-sm">
              <div class="flex-1 truncate text-sm text-[var(--color-text-muted)] font-mono px-2 select-all">
                {{ shareService.currentShareData()?.url }}
              </div>
              <button (click)="copyLink()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm shadow-md transition-transform active:scale-95 whitespace-nowrap shrink-0">
                <ng-container i18n="@@share.copy">share.copy</ng-container>
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `
})
export class ShareModalComponent {
  shareService = inject(ShareService);
  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  constructor() {
    effect(() => {
      const data = this.shareService.currentShareData();
      const isOpen = this.shareService.isModalOpen();
      
      if (isOpen && data?.url) {
        // Need to wait for view to be rendered before drawing QR code
        setTimeout(() => {
          if (this.qrcodeCanvas?.nativeElement) {
            QRCode.toCanvas(this.qrcodeCanvas.nativeElement, data.url, {
              width: 192,
              margin: 1,
              color: {
                dark: '#0f172a',  // Slate 900
                light: '#ffffff'
              }
            }, (error) => {
              if (error) console.error('Error generating QR code', error);
            });
          }
        }, 50);
      }
    });
  }

  copyLink() {
    const url = this.shareService.currentShareData()?.url;
    if (url) {
      this.shareService.copyUrl(url);
    }
  }
}
