import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, Input, HostListener, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Drop2048Store, DropBlock, ComboText } from '../../store/drop2048.store';

@Component({
  selector: 'app-drop2048-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Outer shell: danger glow + stable click overlay (NEVER transforms) -->
    <div class="relative rounded-xl overflow-hidden shadow-2xl mx-auto select-none touch-manipulation"
         [class.danger-1]="dangerLevel === 1"
         [class.danger-2]="dangerLevel === 2"
         [style.width.px]="boardWidth"
         [style.height.px]="boardHeight"
         style="box-sizing: content-box; background: #0a0e1a;">

      <!-- Inner visual layer: this one shakes, but click overlay is NOT inside it -->
      <div class="absolute inset-0" [class.board-shake]="isShaking()">

        <!-- Column guide lines -->
        <div class="absolute inset-0 pointer-events-none z-0 flex" style="padding: 8px; gap: 5px;">
          <div *ngFor="let col of colsArray" class="flex-1 h-full rounded-lg" style="background: rgba(255,255,255,0.025);"></div>
        </div>

        <!-- Inner Score Overlays -->
        <div class="absolute top-4 left-4 z-0 flex flex-col pointer-events-none text-left text-white/20 font-black leading-tight">
          <span class="text-[10px] tracking-widest uppercase">SCORE</span>
          <span class="text-2xl mb-2">{{ store.score() }}</span>
          <span class="text-[10px] tracking-widest uppercase text-cyan-500/50">LEVEL</span>
          <span class="text-2xl text-cyan-400/50">{{ store.level() }}</span>
        </div>

        <div class="absolute top-4 right-4 z-0 flex flex-col items-end pointer-events-none font-black leading-tight">
          <div class="flex flex-col items-end text-white/40 mb-2">
            <span class="text-[10px] tracking-widest uppercase mb-1">NEXT</span>
            <div class="w-12 h-12 flex items-center justify-center text-white text-xl block-3d shadow-md opacity-80"
                 [ngStyle]="getBlockStyle(store.nextVal())"
                 style="border-radius: 8px;">
               {{ store.nextVal() }}
            </div>
          </div>
          <div *ngIf="store.currentRoomMode() === GameMode.Single" class="flex flex-col items-end text-white/20 mt-2">
            <span class="text-[10px] tracking-widest uppercase">BEST</span>
            <span class="text-2xl">{{ store.bestScore() }}</span>
          </div>
        </div>

        <!-- Ghost Block -->
        <div *ngIf="activeBlock && ghostRow >= 0 && ghostRow !== activeBlock.r"
             class="absolute pointer-events-none"
             style="z-index: 5; opacity: 0.22;"
             [style.width.px]="cellSize"
             [style.height.px]="cellSize"
             [style.transform]="'translate(' + colPx(activeBlock.c) + 'px,' + rowPx(ghostRow) + 'px)'">
          <div class="w-full h-full block-3d"
               style="border: 2px dashed rgba(255,255,255,0.55);"
               [ngStyle]="getBlockStyle(activeBlock.val)"></div>
        </div>

        <!-- Active Block -->
        <div *ngIf="activeBlock"
             class="absolute transition-transform duration-100 ease-out z-20 shadow-[0_0_24px_rgba(255,255,255,0.55)]"
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

        <!-- Level Up Badge -->
        <div *ngIf="showLevelUp()"
             class="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div class="level-up-badge px-6 py-3 rounded-2xl font-black text-3xl text-white text-center"
               style="background: linear-gradient(135deg, #f59e0b, #ef4444); box-shadow: 0 0 40px rgba(245,158,11,0.8), 0 0 80px rgba(239,68,68,0.4); text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
            LEVEL {{ levelUpNum() }}!
          </div>
        </div>

      </div><!-- /inner visual layer -->

      <!-- Click controls overlay: OUTSIDE the shaking inner div, always stable -->
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
      text-shadow: 0 2px 4px rgba(0,0,0,0.6);
      font-size: clamp(14px, 2.2vmin, 28px);
      letter-spacing: -0.02em;
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

    /* Screen shake on big merge */
    @keyframes board-shake {
      0%, 100% { transform: translate3d(0, 0, 0); }
      15%  { transform: translate3d(-5px, 2px, 0) rotate(-0.5deg); }
      30%  { transform: translate3d(5px, -2px, 0) rotate(0.5deg); }
      45%  { transform: translate3d(-4px, 1px, 0); }
      60%  { transform: translate3d(4px, -1px, 0); }
      75%  { transform: translate3d(-2px, 1px, 0); }
    }
    .board-shake { animation: board-shake 0.4s cubic-bezier(.36,.07,.19,.97); }

    /* Danger border pulse */
    @keyframes danger-pulse-yellow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0), inset 0 0 0 0 rgba(251,191,36,0); }
      50% { box-shadow: 0 0 12px 3px rgba(251,191,36,0.5), inset 0 0 20px rgba(251,191,36,0.1); }
    }
    @keyframes danger-pulse-red {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0), inset 0 0 0 0 rgba(239,68,68,0); }
      50% { box-shadow: 0 0 18px 5px rgba(239,68,68,0.7), inset 0 0 30px rgba(239,68,68,0.15); }
    }
    .danger-1 {
      outline: 2px solid rgba(251,191,36,0.5);
      animation: danger-pulse-yellow 1.5s ease-in-out infinite;
    }
    .danger-2 {
      outline: 2px solid rgba(239,68,68,0.8);
      animation: danger-pulse-red 0.7s ease-in-out infinite;
    }

    /* Level up badge */
    @keyframes level-up-anim {
      0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
      20%  { opacity: 1; transform: scale(1.15) translateY(0); }
      75%  { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.85) translateY(-10px); }
    }
    .level-up-badge { animation: level-up-anim 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
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

  isShaking = signal(false);
  showLevelUp = signal(false);
  levelUpNum = signal(0);

  constructor(public store: Drop2048Store) {
    effect(() => {
      const trigger = this.store.shakeTrigger();
      if (trigger > 0) {
        this.isShaking.set(false);
        // Force re-trigger animation by resetting in next microtask
        setTimeout(() => {
          this.isShaking.set(true);
          setTimeout(() => this.isShaking.set(false), 420);
        }, 0);
      }
    });

    effect(() => {
      const lv = this.store.levelUpSignal();
      if (lv > 0) {
        this.levelUpNum.set(lv);
        this.showLevelUp.set(true);
        setTimeout(() => this.showLevelUp.set(false), 1600);
      }
    });
  }

  get dangerLevel(): 0 | 1 | 2 {
    if (this.board.length === 0) return 0;
    const topRow = Math.min(...this.board.map(b => b.r));
    if (topRow <= 0) return 2;
    if (topRow <= 2) return 1;
    return 0;
  }

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
    // Vivid saturated palette — top color (bright), bottom color (deep)
    const g: Record<number, [string, string]> = {
      2:    ['#FF5252', '#D50000'],
      4:    ['#00E676', '#00C853'],
      8:    ['#FFD600', '#FF8F00'],
      16:   ['#2196F3', '#0D47A1'],
      32:   ['#E040FB', '#AA00FF'],
      64:   ['#FF6D00', '#E65100'],
      128:  ['#FF9100', '#E65C00'],
      256:  ['#00BFA5', '#00796B'],
      512:  ['#7C4DFF', '#4527A0'],
      1024: ['#F50057', '#B71C1C'],
      2048: ['#FFD740', '#FF6D00'],
    };
    const [c1, c2] = g[val] || ['#78909C', '#455A64'];
    const glowPx = val >= 8 ? Math.min(10 + Math.log2(val) * 2.5, 32) : 4;
    const glowOpacity = val >= 128 ? 'ee' : val >= 32 ? 'cc' : 'aa';
    const shadows = [
      'inset 0 4px 0 rgba(255,255,255,0.38)',
      'inset 0 -5px 0 rgba(0,0,0,0.40)',
      '0 6px 12px rgba(0,0,0,0.5)',
      `0 0 ${glowPx}px ${c1}${glowOpacity}`,
    ].join(', ');
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
