import { Component, AfterViewInit, Input, Inject, PLATFORM_ID, ElementRef, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-adsense',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shouldRender) {
      <div class="adsense-outer-wrapper w-full flex flex-col items-center justify-center my-2 sm:my-3 transition-all duration-300"
           [class.adsense-collapsed]="isUnfilled()">
        
        @if (showLabel && !isUnfilled()) {
          <div class="flex items-center gap-1.5 mb-1.5 select-none opacity-60">
            <span class="text-[9px] sm:text-[10px] tracking-widest uppercase font-mono text-[var(--color-text-muted,#94a3b8)]">
              ADVERTISEMENT
            </span>
          </div>
        }

        <!-- Pre-allocated slot frame (prevents Cumulative Layout Shift - CLS) -->
        <div class="adsense-frame relative w-full flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300"
             [ngClass]="formatContainerClass"
             [style.min-height]="customMinHeightStyle">
          
          <!-- Subtle Loading Skeleton Placeholder (Zero CLS shield: active before ad fills, fades smoothly) -->
          <div class="adsense-skeleton absolute inset-0 flex flex-col items-center justify-center pointer-events-none rounded-xl select-none z-0 transition-opacity duration-500"
               [class.opacity-0]="isFilled()"
               [class.pointer-events-none]="true">
            <div class="skeleton-surface w-full h-full flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--color-border-subtle,rgba(255,255,255,0.06))] bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))]">
              <div class="flex items-center gap-2 mb-2 opacity-50">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase font-mono bg-neutral-200/60 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400">AD</span>
                <span class="text-[10px] font-mono tracking-widest text-neutral-400 dark:text-neutral-500">SPONSORED</span>
              </div>
              <div class="w-2/3 max-w-[180px] h-2 rounded-full bg-neutral-200/50 dark:bg-neutral-700/40 animate-pulse mb-1.5"></div>
              <div class="w-1/3 max-w-[100px] h-1.5 rounded-full bg-neutral-200/30 dark:bg-neutral-700/25 animate-pulse"></div>
            </div>
          </div>

          <!-- Google AdSense Tag (Rendered when valid numeric slot ID is configured) -->
          @if (isValidSlot) {
            <ins #insTag
                 class="adsbygoogle relative z-10 w-full"
                 style="display:block"
                 [attr.data-ad-client]="parsedClient"
                 [attr.data-ad-slot]="parsedSlot"
                 [attr.data-ad-format]="adFormat"
                 [attr.data-full-width-responsive]="fullWidthResponsive"></ins>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { 
      display: block; 
      text-align: center; 
      width: 100%;
    }
    :host(:has(ins[data-ad-status="unfilled"])) {
      display: none !important;
      min-height: 0 !important;
    }
    .adsense-outer-wrapper.adsense-collapsed {
      opacity: 0 !important;
      max-height: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    /* Standard responsive slot dimension reservations (Zero CLS) */
    .adsense-frame-horizontal {
      min-height: 52px;
      max-width: 728px;
    }
    @media (min-width: 640px) {
      .adsense-frame-horizontal {
        min-height: 90px;
      }
    }

    .adsense-frame-rectangle {
      min-height: 250px;
      max-width: 336px;
    }

    .adsense-frame-auto {
      min-height: 52px;
      max-width: 100%;
    }
    @media (min-width: 640px) {
      .adsense-frame-auto {
        min-height: 90px;
      }
    }
  `]
})
export class AdsenseComponent implements AfterViewInit, OnDestroy {
  // Google AdSense Publisher Client ID
  @Input() adClient: string = 'ca-pub-8428944074138941'; 
  @Input() adSlot: string = ''; 
  @Input() adFormat: string = 'auto';
  @Input() fullWidthResponsive: boolean = true;
  @Input() showLabel: boolean = true;
  @Input() minHeight?: string;

  readonly isUnfilled = signal<boolean>(false);
  readonly isFilled = signal<boolean>(false);
  private observer: MutationObserver | null = null;

  get parsedClient(): string {
    if (this.adSlot && this.adSlot.includes('/')) {
      const parts = this.adSlot.split('/');
      if (parts[0].startsWith('ca-pub-')) return parts[0];
      return `ca-pub-${parts[0]}`;
    }
    if (this.adSlot && this.adSlot.startsWith('ca-pub-')) {
      return this.adSlot;
    }
    return this.adClient;
  }

  get parsedSlot(): string {
    if (!this.adSlot) return '';
    const trimmed = this.adSlot.trim();
    if (trimmed.includes('/')) {
      return trimmed.split('/')[1] || '';
    }
    // Pure publisher client IDs (e.g. ca-pub-xxx) are not slot IDs
    if (trimmed.startsWith('ca-pub-')) {
      return '';
    }
    return trimmed;
  }

  /**
   * Google requires a numeric slot ID for manual ad units.
   */
  get isValidSlot(): boolean {
    return !!(this.parsedSlot && /^\d+$/.test(this.parsedSlot));
  }

  /**
   * Render either when a real slot is configured or during review/standby mode with publisher ID.
   */
  get shouldRender(): boolean {
    return !!(this.isValidSlot || (this.adSlot && this.adSlot.trim().length > 0));
  }

  get formatContainerClass(): string {
    if (this.adFormat === 'rectangle') return 'adsense-frame-rectangle';
    if (this.adFormat === 'horizontal') return 'adsense-frame-horizontal';
    return 'adsense-frame-auto';
  }

  get customMinHeightStyle(): string | null {
    return this.minHeight || null;
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private el: ElementRef
  ) {}

  ngAfterViewInit() {
    if (this.isValidSlot && isPlatformBrowser(this.platformId)) {
      const insEl = this.el.nativeElement.querySelector('ins.adsbygoogle');
      if (insEl) {
        this.observer = new MutationObserver(() => {
          const status = insEl.getAttribute('data-ad-status');
          const hasIframe = !!insEl.querySelector('iframe');
          if (status === 'unfilled') {
            this.isUnfilled.set(true);
            this.isFilled.set(false);
          } else if (status === 'filled' || hasIframe) {
            this.isFilled.set(true);
            this.isUnfilled.set(false);
          }
        });
        this.observer.observe(insEl, { 
          attributes: true, 
          attributeFilter: ['data-ad-status', 'data-adsbygoogle-status'],
          childList: true 
        });
      }

      try {
        const isAlreadyProcessed = insEl?.getAttribute('data-adsbygoogle-status') === 'done';
        if (!isAlreadyProcessed) {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
        }
      } catch (e) {
        console.debug('AdSense request error:', e);
        this.isUnfilled.set(true);
      }
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
