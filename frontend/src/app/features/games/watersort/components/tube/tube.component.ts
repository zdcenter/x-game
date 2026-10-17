import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getLiquidTheme, LiquidColorTheme } from '../../water-colors.util';

export interface LiquidLayerItem {
  color: string;
  heightPercent: number;
  isHidden: boolean;
  theme: LiquidColorTheme;
}

@Component({
  selector: 'app-tube',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="tube-wrapper group cursor-pointer flex flex-col items-center justify-end relative h-38 w-11 sm:h-50 sm:w-13 md:h-60 md:w-15 select-none"
      [class.selected]="selected"
      [class.completed]="completed"
      (click)="onClick()"
    >
      <!-- 1. Flared Glass Lip / Rim (Top Collar) -->
      <div class="glass-rim absolute -top-1 w-[calc(100%+8px)] h-2.5 rounded-full z-30 pointer-events-none transition-all duration-300">
        <div class="absolute inset-0 rounded-full border border-white/70 dark:border-white/40 bg-gradient-to-b from-white/70 via-white/20 to-transparent shadow-xs"></div>
        <div class="absolute inset-x-1.5 inset-y-0.5 rounded-full bg-slate-900/10 dark:bg-black/25 border border-white/40"></div>
      </div>

      <!-- 2. The Glass Tube Body -->
      <div class="glass-tube absolute inset-0 rounded-b-full overflow-hidden border-2 border-t-0 border-white/60 dark:border-white/35 z-20 pointer-events-none backdrop-blur-[1px]">
        <!-- Vertical Specular Highlight Beam (Left) -->
        <div class="absolute left-1.5 top-1 bottom-3 w-1.5 bg-gradient-to-r from-white/80 via-white/35 to-transparent rounded-full z-20 pointer-events-none"></div>
        <!-- Secondary Edge Reflection (Right) -->
        <div class="absolute right-1 top-1 bottom-4 w-1 bg-gradient-to-l from-white/40 to-transparent rounded-full z-20 pointer-events-none"></div>
        <!-- Curvature Cylinder Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10 dark:to-white/5 pointer-events-none z-10"></div>
        <!-- Thicker Curved Glass Base (U-bend reflection) -->
        <div class="absolute inset-x-0 bottom-0 h-4 rounded-b-full border-b-2 border-white/75 dark:border-white/50 bg-gradient-to-t from-white/30 to-transparent pointer-events-none z-20"></div>
      </div>
      
      <!-- 3. Liquid Container -->
      <div class="liquid-container absolute bottom-1.5 left-1.5 right-1.5 top-2.5 rounded-b-[18px] sm:rounded-b-[22px] md:rounded-b-[24px] overflow-hidden flex flex-col justify-end z-10">
        <!-- Liquids -->
        @for (liquid of liquidLayers; track $index) {
          <div 
            class="liquid-layer w-full transition-all duration-400 ease-out relative flex items-center justify-center overflow-hidden"
            [style.height.%]="liquid.heightPercent"
            [style.background]="liquid.isHidden ? null : liquid.theme.gradient"
            [ngClass]="{
              'bg-slate-300 dark:bg-slate-700 border-t border-slate-400/30 dark:border-slate-800/50': liquid.isHidden
            }"
          >
            <!-- 3D Liquid Cylinder Shading Overlay -->
            @if (!liquid.isHidden) {
              <div class="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-black/20 pointer-events-none"></div>
            }

            <!-- Top Meniscus (The curved elliptical liquid surface at the very top of fluid column) -->
            @if ($index === 0 && !liquid.isHidden) {
              <div class="liquid-meniscus absolute top-0 inset-x-0 h-2.5 rounded-full pointer-events-none -translate-y-1 scale-105"
                   [style.background]="'radial-gradient(ellipse at 50% 50%, ' + liquid.theme.surface + ' 0%, rgba(255,255,255,0.15) 70%, transparent 100%)'">
              </div>
            }

            <!-- Soft divider line between different liquid layers -->
            @if ($index > 0 && !liquid.isHidden) {
              <div class="absolute top-0 inset-x-0 h-[1.5px] bg-black/15 dark:bg-black/30 pointer-events-none"></div>
            }

            <!-- Mystery Question Mark (Blind Mode) -->
            @if (liquid.isHidden) {
              <div class="text-slate-500/60 dark:text-slate-400/60 font-black text-lg select-none drop-shadow-xs">?</div>
            }
          </div>
        }
      </div>

      <!-- 4. Ambient Grounding Shadow (Shelf presence) -->
      <div class="absolute -bottom-2 inset-x-1 h-2 bg-black/20 dark:bg-black/40 rounded-full blur-[3px] pointer-events-none -z-10 group-hover:scale-105 transition-transform"></div>
    </div>
  `,
  styles: [`
    .tube-wrapper {
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
    }
    .tube-wrapper.selected {
      transform: translateY(-1.25rem);
    }
    .glass-tube {
      box-shadow: inset 0 -6px 12px rgba(255,255,255,0.25), inset 0 2px 6px rgba(0,0,0,0.06), 0 10px 24px -4px rgba(0,0,0,0.12);
    }
    :host-context(.dark) .glass-tube,
    .dark .glass-tube {
      box-shadow: inset 0 -6px 12px rgba(255,255,255,0.15), inset 0 2px 6px rgba(0,0,0,0.3), 0 10px 24px -4px rgba(0,0,0,0.4);
    }

    @keyframes tube-complete-glow {
      0%, 100% {
        box-shadow: inset 0 -4px 10px rgba(0,0,0,0.1), 0 0 12px 2px rgba(255,255,255,0.3);
      }
      50% {
        box-shadow: inset 0 -4px 10px rgba(0,0,0,0.1), 0 0 24px 8px rgba(255,255,255,0.7), 0 0 35px 12px rgba(34, 211, 238, 0.4);
      }
    }
    .tube-wrapper.completed .glass-tube {
      border-color: rgba(255,255,255,0.8) !important;
      animation: tube-complete-glow 1.8s ease-in-out infinite;
    }
    .tube-wrapper.completed .liquid-layer {
      filter: brightness(1.15) saturate(1.25);
    }
  `]
})
export class TubeComponent implements OnChanges {
  @Input() colors: string[] = [];
  @Input() capacity: number = 4;
  @Input() selected: boolean = false;
  @Input() isBlindMode: boolean = false;
  @Input() completed: boolean = false;
  
  @Output() tubeClick = new EventEmitter<void>();

  liquidLayers: LiquidLayerItem[] = [];

  ngOnChanges() {
    this.updateLayers();
  }

  onClick() {
    this.tubeClick.emit();
  }

  private updateLayers() {
    const reversed = [...this.colors].reverse();
    
    const layers: LiquidLayerItem[] = [];
    if (reversed.length === 0) {
      this.liquidLayers = [];
      return;
    }

    let currentColor = reversed[0];
    let currentCount = 1;
    const blockHeight = 100 / this.capacity;

    for (let i = 1; i < reversed.length; i++) {
      if (reversed[i] === currentColor) {
        currentCount++;
      } else {
        layers.push({
          color: currentColor,
          heightPercent: currentCount * blockHeight,
          isHidden: false,
          theme: getLiquidTheme(currentColor)
        });
        currentColor = reversed[i];
        currentCount = 1;
      }
    }
    layers.push({
      color: currentColor,
      heightPercent: currentCount * blockHeight,
      isHidden: false,
      theme: getLiquidTheme(currentColor)
    });

    // In blind mode, all layers except the top contiguous block are hidden
    if (this.isBlindMode && layers.length > 1) {
      for (let i = 1; i < layers.length; i++) {
        layers[i].isHidden = true;
      }
    }

    this.liquidLayers = layers;
  }
}
