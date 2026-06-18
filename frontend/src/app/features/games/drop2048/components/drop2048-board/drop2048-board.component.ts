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
               [ngStyle]="getBlockStyle(store.nextVal())"
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

      <!-- Ghost Block (drop preview) -->
      <div *ngIf="activeBlock && ghostRow >= 0 && ghostRow !== activeBlock.r"
           class="absolute pointer-events-none"
           style="z-index: 5; opacity: 0.22;"
           [style.width.px]="cellSize"
           [style.height.px]="cellSize"
           [style.transform]="'translate(' + colPx(activeBlock.c) + 'px,' + rowPx(ghostRow) + 'px)'">
        <div class="w-full h-full block-3d"
             style="border: 2px solid rgba(255,255,255,0.4);"
             [ngStyle]="getBlockStyle(activeBlock.val)"></div>
      </div>

      <!-- Active Block -->
      <div *ngIf="activeBlock"
           class="absolute transition-transform duration-100 ease-out z-20 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
           [style.width.px]="cellSize"
           [style.height.px]="cellSize"
           [style.transform]="'translate(' + colPx(activeBlock.c) + 'px,' + rowPx(activeBlock.r) + 'px)'">
        <div class="w-full h-full flex items-center justify-center font-black text-white text-3xl block-3d"
             [ngStyle]="getBlockStyle(activeBlock.val)">
           {{ activeBlock.val }}
        </div>
      </div>

      <!-- Placed Blocks -->
      <div *ngFor="let block of board"
           class="absolute transition-all duration-300 ease-bounce z-10"
           [class.merge-pop]="block.isMerging"
           [style.width.px]="cellSize"
           [style.height.px]="cellSize"
           [style.transform]="'translate(' + colPx(block.c) + 'px,' + rowPx(block.r) + 'px)'">
        <div class="w-full h-full flex items-center justify-center font-black text-white text-3xl block-3d"
             [ngStyle]="getBlockStyle(block.val)">
           {{ block.val }}
           <!-- Landing ripple ring -->
           <div *ngIf="block.isLanding"
                class="absolute inset-0 rounded-xl landing-ring pointer-events-none"></div>
        </div>
      </div>

      <!-- Combo / Score Float Texts -->
      <div *ngFor="let combo of combos"
           class="absolute z-30 font-black pointer-events-none float-up drop-shadow-lg"
           [class.text-3xl]="combo.comboCount < 1"
           [class.text-4xl]="combo.comboCount >= 1"
           [class.text-yellow-300]="combo.comboCount < 1"
           [class.text-orange-400]="combo.comboCount >= 1"
           [style.left.px]="colPx(combo.c) + cellSize / 4"
           [style.top.px]="rowPx(combo.r) - cellSize / 2">
        {{ combo.comboCount >= 1 ? 'COMBO ×' + (combo.comboCount + 1) + '!' : '+' + combo.scoreGained }}
      </div>

      <!-- Merge Particles -->
      <div *ngFor="let p of particles"
           class="absolute z-50 rounded-full mix-blend-screen pointer-events-none spark-anim"
           [style.background-color]="p.color"
           [style.width.px]="p.size"
           [style.height.px]="p.size"
           [style.left.px]="colPx(p.x) + cellSize / 2 - p.size / 2"
           [style.top.px]="rowPx(p.y) + cellSize / 2 - p.size / 2"
           [style.--tx]="(math.random() * 160 - 80) + 'px'"
           [style.--ty]="(math.random() * 160 - 80) + 'px'"
           style="box-shadow: 0 0 8px currentColor, 0 0 18px currentColor;">
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

    /* Merge burst */
    @keyframes merge-pop {
      0%   { transform: scale(1);    filter: brightness(1); }
      25%  { transform: scale(1.42); filter: brightness(1.9) saturate(1.6); }
      65%  { transform: scale(0.92); filter: brightness(1.1); }
      100% { transform: scale(1);    filter: brightness(1); }
    }
    .merge-pop { animation: merge-pop 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }

    /* Score float-up */
    @keyframes float-up {
      0%   { transform: translateY(0)     scale(1);    opacity: 1; }
      20%  { transform: translateY(-16px) scale(1.18); opacity: 1; }
      100% { transform: translateY(-92px) scale(0.8);  opacity: 0; }
    }
    .float-up { animation: float-up 1s ease-out forwards; }

    /* Landing ripple */
    @keyframes landing-ring {
      0%   { box-shadow: 0 0 0  0px rgba(255,255,255,0.75); opacity: 1; }
      100% { box-shadow: 0 0 0 22px rgba(255,255,255,0);    opacity: 0; }
    }
    .landing-ring { animation: landing-ring 0.4s ease-out forwards; }

    /* Spark particles */
    .spark-anim {
      animation: spark 0.65s cubic-bezier(0.1, 1, 0.3, 1) forwards;
    }
    @keyframes spark {
      0%   { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
  `]
})
export class Drop2048BoardComponent {
  GameMode = GameMode;
  @Input() board: DropBlock[] = [];
  @Input() activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  @Input() combos: ComboText[] = [];
  @Input() particles: { id: string, x: number, y: number, color: string, size: number }[] = [];
  @Input() ghostRow = -1;

  math = Math;

  constructor(public store: Drop2048Store) {}

  readonly ROWS = 7;
  readonly COLS = 5;
  readonly cellSize = 60;
  readonly gap = 2;
  readonly padding = 6;

  get boardWidth()  { return this.COLS * this.cellSize + (this.COLS - 1) * this.gap + this.padding * 2; }
  get boardHeight() { return this.ROWS * this.cellSize + (this.ROWS - 1) * this.gap + this.padding * 2; }

  get colsArray() { return new Array(this.COLS); }

  /** Pixel X offset for column c */
  colPx(c: number) { return c * (this.cellSize + this.gap) + this.padding; }
  /** Pixel Y offset for row r */
  rowPx(r: number) { return r * (this.cellSize + this.gap) + this.padding; }

  getBlockStyle(val: number): Record<string, string> {
    const g: Record<number, [string, string]> = {
      2:    ['#ff6b6b', '#c0392b'],
      4:    ['#2ecc71', '#27ae60'],
      8:    ['#f1c40f', '#d68910'],
      16:   ['#5dade2', '#2980b9'],
      32:   ['#a569bd', '#8e44ad'],
      64:   ['#f1948a', '#e74c3c'],
      128:  ['#f39c12', '#d35400'],
      256:  ['#1abc9c', '#148f77'],
      512:  ['#7f8ff4', '#5c6bc0'],
      1024: ['#ec407a', '#c62828'],
      2048: ['#ffca28', '#ff8f00'],
    };
    const [c1, c2] = g[val] || ['#94a3b8', '#64748b'];
    const glowPx = val >= 32 ? Math.min(8 + Math.log2(val) * 2, 28) : 0;
    const glow = glowPx > 0 ? `0 0 ${glowPx}px ${c1}99` : '';
    const shadows = [
      'inset 0 4px 0 rgba(255,255,255,0.25)',
      'inset 0 -6px 0 rgba(0,0,0,0.25)',
      '0 4px 6px rgba(0,0,0,0.3)',
      glow
    ].filter(Boolean).join(', ');
    return { background: `linear-gradient(145deg, ${c1}, ${c2})`, 'box-shadow': shadows };
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
