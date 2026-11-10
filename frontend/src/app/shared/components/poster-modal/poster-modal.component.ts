import { Component, Input, Output, EventEmitter, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PosterService } from '../../../core/services/poster.service';
import { ToastService } from '../../../core/services/toast.service';
import { HapticService } from '../../../core/services/haptic.service';
import { isBrowser } from '../../../core/utils/browser.util';

@Component({
  selector: 'app-poster-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
         (click)="onBackdropClick($event)">
      <div class="relative w-full max-w-sm sm:max-w-md max-h-[92vh] flex flex-col items-center bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl p-4 sm:p-5 overflow-hidden animate-scaleUp"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="w-full flex items-center justify-between pb-3 border-b border-[var(--color-border-card)]">
          <div class="flex items-center gap-2">
            <span class="text-xl">📸</span>
            <h3 class="font-bold text-sm sm:text-base text-[var(--color-text-main)]">
              {{ i18n.t('poster.modal_title')() }}
            </h3>
          </div>
          <button (click)="close.emit()"
                  aria-label="Close"
                  class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Poster Preview Image -->
        <div class="relative my-3 w-full flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-xl bg-black/40 border border-white/5 p-1">
          @if (isGenerating()) {
            <div class="py-20 flex flex-col items-center gap-3">
              <span class="text-3xl animate-spin">🔄</span>
              <p class="text-xs text-[var(--color-text-muted)] font-mono">
                {{ i18n.t('poster.generating')() }}
              </p>
            </div>
          } @else if (imageUrl()) {
            <img [src]="imageUrl()"
                 alt="Battle Record Poster"
                 class="max-h-[58vh] sm:max-h-[62vh] w-auto object-contain rounded-lg shadow-lg border border-amber-500/30 select-none touch-manipulation cursor-pointer hover:scale-[1.01] transition-transform" />
          }
        </div>

        <!-- Mobile Long Press Tip -->
        <p class="text-[11px] text-[var(--color-text-muted)] text-center mb-3">
          💡 {{ i18n.t('poster.mobile_tip')() }}
        </p>

        <!-- Action Buttons -->
        <div class="w-full flex items-center gap-2 sm:gap-3">
          @if (canShare()) {
            <button (click)="shareImage()"
                    [disabled]="!imageUrl() || isGenerating()"
                    class="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap">
              <span>📤</span>
              <span>{{ i18n.t('share.share_image')() || '分享海报' }}</span>
            </button>
          }

          <button (click)="copyImage()"
                  [disabled]="!imageUrl() || isGenerating()"
                  class="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[var(--color-bg-main)] text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:border-amber-500/50 hover:bg-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            @if (copied()) {
              <span class="text-emerald-400">✓</span>
              <span class="text-emerald-400">{{ i18n.t('poster.copy_success')() }}</span>
            } @else {
              <span>📋</span>
              <span>{{ i18n.t('poster.copy_image')() }}</span>
            }
          </button>

          <button (click)="downloadImage()"
                  [disabled]="!imageUrl() || isGenerating()"
                  class="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            <span>💾</span>
            <span>{{ i18n.t('poster.download')() }}</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
    .animate-scaleUp {
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class PosterModalComponent {
  i18n = inject(I18nService);
  private posterService = inject(PosterService);
  private toast = inject(ToastService);
  private haptic = inject(HapticService);

  @Input() imageUrl = signal<string>('');
  @Input() isGenerating = signal<boolean>(false);
  @Input() filename: string = 'xgame-battle-record.png';

  @Output() close = new EventEmitter<void>();

  copied = signal<boolean>(false);

  readonly canShare = computed(() => {
    return isBrowser() && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  });

  async shareImage() {
    const url = this.imageUrl();
    if (!url) return;
    this.haptic.vibrateLight();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], this.filename, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: this.i18n.t('poster.modal_title')() || '战绩海报',
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
    this.downloadImage();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    this.close.emit();
  }

  downloadImage() {
    const url = this.imageUrl();
    if (!url) return;
    this.haptic.vibrateLight();
    this.posterService.downloadPoster(url, this.filename);
  }

  async copyImage() {
    const url = this.imageUrl();
    if (!url) return;
    this.haptic.vibrateLight();

    const ok = await this.posterService.copyImageToClipboard(url);
    if (ok) {
      this.copied.set(true);
      this.toast.show(this.i18n.t('poster.copy_success')(), 'success');
      setTimeout(() => this.copied.set(false), 2500);
    } else {
      this.toast.show(this.i18n.t('poster.copy_fail')(), 'info');
      // If clipboard write failed (e.g. mobile Safari), fallback to trigger download
      this.downloadImage();
    }
  }
}
