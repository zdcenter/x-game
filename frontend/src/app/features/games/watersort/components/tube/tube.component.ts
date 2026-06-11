import { Component, Input, Output, EventEmitter, computed, signal, effect, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tube',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="tube-wrapper group cursor-pointer flex flex-col items-center justify-end relative h-36 w-10 sm:h-48 sm:w-12 md:h-56 md:w-14"
      [class.selected]="selected"
      (click)="onClick()"
    >
      <!-- Glass Tube -->
      <div class="glass-tube absolute inset-0 rounded-b-full overflow-hidden border-x-2 border-b-2 border-slate-300/30 dark:border-slate-500/30 z-10 pointer-events-none">
        <!-- Highlights -->
        <div class="absolute left-1 top-0 bottom-2 w-1.5 bg-gradient-to-r from-white/30 to-transparent rounded-full"></div>
        <div class="absolute right-0 top-0 bottom-2 w-2 bg-gradient-to-l from-black/10 to-transparent rounded-full"></div>
      </div>
      
      <!-- Liquid Container -->
      <div class="liquid-container absolute bottom-1 left-1 right-1 top-2 rounded-b-full overflow-hidden flex flex-col justify-end">
        <!-- Liquids -->
        @for (liquid of liquidLayers; track $index) {
          <div 
            class="liquid-layer w-full transition-all duration-300 ease-in-out relative flex items-center justify-center overflow-hidden"
            [style.height.%]="liquid.heightPercent"
            [style.background-color]="liquid.isHidden ? null : liquid.color"
            [ngClass]="{
              'bg-slate-300 dark:bg-slate-700 border-t border-slate-400/30 dark:border-slate-800/50': liquid.isHidden,
              'border-t border-black/5': !liquid.isHidden && $index > 0
            }"
          >
            <!-- Surface reflection -->
            <div *ngIf="$index === 0 && !liquid.isHidden" class="absolute top-0 left-0 right-0 h-2 bg-white/20 rounded-full scale-110 -translate-y-1"></div>
            <!-- Mystery Question Mark -->
            <div *ngIf="liquid.isHidden" class="text-slate-500/50 dark:text-slate-400/50 font-bold text-lg select-none">?</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tube-wrapper {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .tube-wrapper.selected {
      transform: translateY(-1rem);
    }
    .glass-tube {
      box-shadow: inset 0 -4px 10px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1);
    }
    .dark .glass-tube {
      box-shadow: inset 0 -4px 10px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.4);
    }
  `]
})
export class TubeComponent implements OnChanges {
  @Input() colors: string[] = [];
  @Input() capacity: number = 4;
  @Input() selected: boolean = false;
  @Input() isBlindMode: boolean = false;
  
  @Output() tubeClick = new EventEmitter<void>();

  liquidLayers: { color: string, heightPercent: number, isHidden: boolean }[] = [];

  ngOnChanges() {
    this.updateLayers();
  }

  onClick() {
    this.tubeClick.emit();
  }

  private updateLayers() {
    // Reverse the colors array because the top of the array is the top of the tube.
    // In CSS we render flex-col justify-end, so the DOM order is top to bottom.
    // So the top layer in DOM should be the last item in the colors array.
    const reversed = [...this.colors].reverse();
    
    // Calculate heights. If there are consecutive same colors, we group them?
    // Let's just render them as individual blocks of 25% height.
    // Actually, rendering them as individual blocks is fine, but if we want seamless, 
    // it's easier to group same colors to avoid 1px gaps between divs.
    
    const layers: { color: string, heightPercent: number, isHidden: boolean }[] = [];
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
          isHidden: false
        });
        currentColor = reversed[i];
        currentCount = 1;
      }
    }
    layers.push({
      color: currentColor,
      heightPercent: currentCount * blockHeight,
      isHidden: false
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
