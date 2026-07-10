import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloatingTextService } from '../../../core/services/floating-text.service';

@Component({
  selector: 'app-floating-text-overlay',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes floatUpFade {
      0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
      }
      20% {
        transform: translate(-50%, -100%) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -250%) scale(1);
        opacity: 0;
      }
    }
    
    .floating-text-item {
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      font-weight: 900;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.8);
      animation: floatUpFade 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    .size-sm { font-size: 1.5rem; }
    .size-md { font-size: 2rem; }
    .size-lg { font-size: 3rem; }
    .size-xl { font-size: 4rem; }
  `],
  template: `
    @for (item of floatingTextService.texts(); track item.id) {
      <div 
        class="floating-text-item"
        [ngClass]="'size-' + item.size"
        [style.left.px]="item.x"
        [style.top.px]="item.y"
        [style.color]="item.color"
      >
        {{ item.text }}
      </div>
    }
  `
})
export class FloatingTextOverlayComponent {
  floatingTextService = inject(FloatingTextService);
}
