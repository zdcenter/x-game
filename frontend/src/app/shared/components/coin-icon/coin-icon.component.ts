import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-coin-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [ngClass]="cssClass"
         [style.width.px]="sizePx"
         [style.height.px]="sizePx"
         class="inline-block shrink-0 align-middle select-none transition-transform"
         viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Unique IDs with prefix to avoid collision if multiple on page -->
        <linearGradient [id]="'coinRim' + uid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFE57F" />
          <stop offset="50%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#B45309" />
        </linearGradient>

        <linearGradient [id]="'coinFace' + uid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FDE047" />
          <stop offset="45%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>

        <linearGradient [id]="'coinStar' + uid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFBEB" />
          <stop offset="55%" stop-color="#FEF08A" />
          <stop offset="100%" stop-color="#F59E0B" />
        </linearGradient>

        <linearGradient [id]="'coinShine' + uid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- 1. Outer Coin Base with subtle border -->
      <circle cx="18" cy="18" r="17" [attr.fill]="'url(#coinRim' + uid + ')'" stroke="#92400E" stroke-width="0.8" />

      <!-- 2. Inner Recessed Face -->
      <circle cx="18" cy="18" r="14.2" [attr.fill]="'url(#coinFace' + uid + ')'" stroke="#B45309" stroke-width="0.9" />

      <!-- 3. Decorative Dotted Rim -->
      <circle cx="18" cy="18" r="12.8" stroke="#FEF08A" stroke-width="0.75" stroke-dasharray="1.8 1.8" opacity="0.85" />

      <!-- 4. Center Embossed Currency Star -->
      <path d="M18 9.5 L20.4 14.8 L26.2 15.4 L21.8 19.3 L23.1 25 L18 22 L12.9 25 L14.2 19.3 L9.8 15.4 L15.6 14.8 Z"
            [attr.fill]="'url(#coinStar' + uid + ')'" stroke="#78350F" stroke-width="0.7" stroke-linejoin="round" />

      <!-- 5. Top Arc Specular Shine -->
      <path d="M7 16 A 12.5 12.5 0 0 1 29 16 A 12.5 10 0 0 0 7 16 Z"
            [attr.fill]="'url(#coinShine' + uid + ')'" opacity="0.55" />
    </svg>
  `
})
export class CoinIconComponent {
  private static nextId = 0;
  readonly uid = ++CoinIconComponent.nextId;

  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number = 'sm';
  @Input() cssClass: string = '';

  get sizePx(): number {
    if (typeof this.size === 'number') return this.size;
    switch (this.size) {
      case 'xs': return 14;
      case 'sm': return 16;
      case 'md': return 20;
      case 'lg': return 26;
      case 'xl': return 36;
      default: return 16;
    }
  }
}
