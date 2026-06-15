import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Drop2048Store, DropBlock, ComboText } from '../../store/drop2048.store';

@Component({
  selector: 'app-drop2048-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative bg-slate-900/80 rounded-xl overflow-hidden shadow-2xl mx-auto select-none touch-manipulation"
         [style.width.px]="boardWidth"
         [style.height.px]="boardHeight"
         style="box-sizing: content-box;">
      
      <!-- Empty Grid (Removed visible boxes) -->
      <div class="absolute inset-0"
           [style.padding.px]="padding">
      </div>
      
      <!-- Inner Score Overlays -->
      <div class="absolute top-4 left-4 z-0 flex flex-col pointer-events-none text-left text-white/20 font-black leading-tight">
        <span class="text-[10px] tracking-widest uppercase">SCORE</span>
        <span class="text-2xl mb-2">{{ store.score() }}</span>

        <span class="text-[10px] tracking-widest uppercase text-cyan-500/50">LEVEL</span>
        <span class="text-2xl text-cyan-400/50">{{ store.level() }}</span>
      </div>
      
      <div class="absolute top-4 right-4 z-0 flex flex-col items-end pointer-events-none font-black leading-tight">
        
        <!-- NEXT Block -->
        <div class="flex flex-col items-end text-white/40 mb-2">
          <span class="text-[10px] tracking-widest uppercase mb-1">NEXT</span>
          <div class="w-12 h-12 flex items-center justify-center text-white text-xl block-3d shadow-md opacity-80"
               [ngClass]="getColorClass(store.nextVal())"
               style="border-radius: 8px;">
             {{ store.nextVal() }}
          </div>
        </div>

        <!-- BEST Score -->
        <div *ngIf="store.currentRoomMode() === GameMode.Single" class="flex flex-col items-end text-white/20 mt-2">
          <span class="text-[10px] tracking-widest uppercase">BEST</span>
          <span class="text-2xl">{{ store.bestScore() }}</span>
        </div>
      </div>

      <!-- Active Block -->
      <div *ngIf="activeBlock"
           class="absolute transition-transform duration-100 ease-out z-20 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
           [style.width.px]="cellSize"
           [style.height.px]="cellSize"
           [style.transform]="'translate(' + (activeBlock.c * (cellSize + gap) + padding) + 'px, ' + (activeBlock.r * (cellSize + gap) + padding) + 'px)'">
        <div class="w-full h-full flex items-center justify-center font-black text-white text-3xl block-3d"
             [ngClass]="getColorClass(activeBlock.val)">
           {{ activeBlock.val }}
        </div>
      </div>

      <!-- Placed Blocks -->
      <div *ngFor="let block of board"
           class="absolute transition-all duration-300 ease-bounce z-10"
           [class.animate-pulse]="block.isNew"
           [style.width.px]="cellSize"
           [style.height.px]="cellSize"
           [style.transform]="'translate(' + (block.c * (cellSize + gap) + padding) + 'px, ' + (block.r * (cellSize + gap) + padding) + 'px)'">
        <div class="w-full h-full flex items-center justify-center font-black text-white text-3xl block-3d"
             [ngClass]="getColorClass(block.val)">
           {{ block.val }}
        </div>
      </div>

      <!-- Combo Texts -->
      <div *ngFor="let combo of combos"
           class="absolute z-30 font-black text-3xl text-yellow-400 drop-shadow-md animate-bounce pointer-events-none"
           [style.left.px]="combo.c * (cellSize + gap) + padding + cellSize/4"
           [style.top.px]="combo.r * (cellSize + gap) + padding - cellSize/2">
        {{ combo.text }}
      </div>
      
      <!-- Merge Particles / Sparks -->
      <div *ngFor="let p of particles"
           class="absolute z-50 rounded-full mix-blend-screen pointer-events-none spark-anim"
           [style.background-color]="p.color"
           [style.width.px]="8"
           [style.height.px]="8"
           [style.left.px]="p.x * (cellSize + gap) + padding + cellSize/2 - 4"
           [style.top.px]="p.y * (cellSize + gap) + padding + cellSize/2 - 4"
           [style.--tx]="(math.random() * 100 - 50) + 'px'"
           [style.--ty]="(math.random() * 100 - 50) + 'px'"
           style="box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;">
      </div>
      
      <!-- Click controls overlay -->
      <div class="absolute inset-0 flex z-40">
        <div *ngFor="let col of colsArray; let c = index" 
             class="flex-1 h-full cursor-pointer hover:bg-white/5 active:bg-white/10"
             (click)="onColumnClick(c)">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ease-bounce {
      transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .block-3d {
      border-radius: 12px;
      box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.25), 
                  inset 0 -6px 0 rgba(0, 0, 0, 0.25), 
                  0 4px 6px rgba(0, 0, 0, 0.3);
      text-shadow: 0 2px 2px rgba(0,0,0,0.3);
    }
    .spark-anim {
      animation: spark 0.6s cubic-bezier(0.1, 1, 0.3, 1) forwards;
    }
    @keyframes spark {
      0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(var(--tx), var(--ty)) scale(0);
        opacity: 0;
      }
    }
  `]
})
export class Drop2048BoardComponent {
  GameMode = GameMode;
  @Input() board: DropBlock[] = [];
  @Input() activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  @Input() combos: ComboText[] = [];
  @Input() particles: { id: string, x: number, y: number, color: string }[] = [];

  math = Math;

  constructor(public store: Drop2048Store) {}

  readonly ROWS = 7;
  readonly COLS = 5;
  readonly cellSize = 60;
  readonly gap = 2;
  readonly padding = 6;
  
  get boardWidth() { return this.COLS * this.cellSize + (this.COLS - 1) * this.gap + this.padding * 2; }
  get boardHeight() { return this.ROWS * this.cellSize + (this.ROWS - 1) * this.gap + this.padding * 2; }

  get gridArray() { return new Array(this.ROWS * this.COLS); }
  get colsArray() { return new Array(this.COLS); }

  getColorClass(val: number): string {
    switch (val) {
      case 2: return 'bg-red-500';
      case 4: return 'bg-green-500';
      case 8: return 'bg-yellow-500';
      case 16: return 'bg-blue-500';
      case 32: return 'bg-purple-500';
      case 64: return 'bg-pink-500';
      case 128: return 'bg-orange-500';
      case 256: return 'bg-teal-500';
      case 512: return 'bg-indigo-500';
      case 1024: return 'bg-rose-600';
      case 2048: return 'bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.8)]';
      default: return 'bg-slate-900 border border-white';
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.activeBlock) return;
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      this.store.moveActive(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
      this.store.moveActive(1);
    } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === ' ') {
      this.store.dropActive();
    }
  }

  onColumnClick(c: number) {
    if (this.activeBlock) {
      if (this.activeBlock.c === c) {
        this.store.dropActive();
      } else {
        const delta = c > this.activeBlock.c ? 1 : -1;
        this.store.moveActive(delta);
      }
    }
  }
}
