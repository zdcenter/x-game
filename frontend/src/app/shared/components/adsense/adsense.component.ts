import { Component, AfterViewInit, Input, Inject, PLATFORM_ID, ElementRef, OnDestroy, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-adsense',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isValidSlot && !isUnfilled()) {
      <div class="adsense-container w-full flex flex-col items-center justify-center my-4 sm:my-6 py-1"
           [class.hidden]="isUnfilled()">
        @if (showLabel) {
          <span class="text-[10px] sm:text-xs tracking-widest uppercase opacity-50 font-mono select-none mb-1.5 text-[var(--color-text-muted)]">
            ADVERTISEMENT
          </span>
        }
        <!-- Google AdSense Unit -->
        <ins #insTag
             class="adsbygoogle w-full"
             style="display:block"
             [attr.data-ad-client]="parsedClient"
             [attr.data-ad-slot]="parsedSlot"
             [attr.data-ad-format]="adFormat"
             [attr.data-full-width-responsive]="fullWidthResponsive"></ins>
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
    }
    .adsense-container:has(ins[data-ad-status="unfilled"]) {
      display: none !important;
    }
  `]
})
export class AdsenseComponent implements AfterViewInit, OnDestroy {
  // 用户的发布商ID，建议从环境配置读取或传入
  @Input() adClient: string = 'ca-pub-8428944074138941'; 
  @Input() adSlot: string = ''; 
  @Input() adFormat: string = 'auto';
  @Input() fullWidthResponsive: boolean = true;
  @Input() showLabel: boolean = true;

  readonly isUnfilled = signal<boolean>(false);
  readonly isFilled = signal<boolean>(false);
  private observer: MutationObserver | null = null;

  get parsedClient(): string {
    if (this.adSlot && this.adSlot.includes('/')) {
      return this.adSlot.split('/')[0];
    }
    return this.adClient;
  }

  get parsedSlot(): string {
    if (this.adSlot && this.adSlot.includes('/')) {
      return this.adSlot.split('/')[1];
    }
    return this.adSlot?.trim() || '';
  }

  get isValidSlot(): boolean {
    return !!(this.parsedSlot && this.parsedSlot.length > 0);
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
          if (status === 'unfilled') {
            this.isUnfilled.set(true);
            this.isFilled.set(false);
          } else if (status === 'filled') {
            this.isFilled.set(true);
            this.isUnfilled.set(false);
          }
        });
        this.observer.observe(insEl, { attributes: true, attributeFilter: ['data-ad-status'] });
      }

      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
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
