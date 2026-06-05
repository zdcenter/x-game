import { Component, AfterViewInit, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-adsense',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Google AdSense -->
    <ins class="adsbygoogle"
         style="display:block"
         [attr.data-ad-client]="adClient"
         [attr.data-ad-slot]="adSlot"
         [attr.data-ad-format]="adFormat"
         [attr.data-full-width-responsive]="fullWidthResponsive"></ins>
  `,
  styles: [`
    :host { 
      display: block; 
      text-align: center; 
      margin: 10px 0; 
      min-height: 50px; /* 防止布局抖动 */
    }
  `]
})
export class AdsenseComponent implements AfterViewInit {
  // 用户的发布商ID，建议从环境配置读取或传入
  @Input() adClient: string = 'ca-pub-8428944074138941'; 
  @Input() adSlot: string = ''; 
  @Input() adFormat: string = 'auto';
  @Input() fullWidthResponsive: boolean = true;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }
}
