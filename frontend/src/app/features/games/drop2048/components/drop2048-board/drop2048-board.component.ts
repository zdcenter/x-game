import { Component, Input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Drop2048Store, DropBlock, ComboText } from '../../store/drop2048.store';
import { getDrop2048BlockStyle } from '../../store/drop2048-engine';

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

        <!-- Top Ambient Accent Line -->
        <div class="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400/25 to-transparent opacity-60 z-20"></div>

        <!-- Column guide lines -->
        <div class="absolute inset-0 pointer-events-none z-0 flex" [style.padding.px]="padding" [style.gap.px]="gap">
          <div *ngFor="let col of colsArray" class="flex-1 h-full rounded-lg" style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.04);"></div>
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
             class="absolute transition-transform duration-100 ease-out z-20 shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
             [style.width.px]="cellSize"
             [style.height.px]="cellSize"
             [style.transform]="'translate(' + colPx(activeBlock.c) + 'px,' + rowPx(activeBlock.r) + 'px)'">
          <div class="w-full h-full flex items-center justify-center font-black text-white block-3d select-none"
               [style.font-size.px]="getBlockFontSize(activeBlock.val)"
               [ngStyle]="getBlockStyle(activeBlock.val)">
             {{ activeBlock.val === 0 ? '🌈' : activeBlock.val }}
          </div>
        </div>

        <!-- Placed Blocks -->
        <div *ngFor="let block of board"
             class="absolute transition-all duration-300 ease-bounce z-10"
             [class.merge-pop]="block.isMerging"
             [style.width.px]="cellSize"
             [style.height.px]="cellSize"
             [style.transform]="'translate(' + colPx(block.c) + 'px,' + rowPx(block.r) + 'px)'">
          <div class="w-full h-full flex items-center justify-center font-black text-white block-3d select-none relative"
               [style.font-size.px]="getBlockFontSize(block.val)"
               [ngStyle]="getBlockStyle(block.val)">
             {{ block.val === 0 ? '🌈' : block.val }}
             <div *ngIf="block.isLanding"
                  class="absolute inset-0 rounded-xl landing-ring pointer-events-none"></div>

             <!-- Merge Incandescent White Flash Burst -->
             <div *ngIf="block.isMerging"
                  class="absolute inset-0 rounded-xl merge-flash-white pointer-events-none z-30"></div>

             <!-- Merge Expanding Radiant Shockwave Ring -->
             <div *ngIf="block.isMerging"
                  class="absolute inset-0 rounded-xl merge-shockwave-ring pointer-events-none z-20"></div>

             <!-- Merge Diamond Sparkle Starburst -->
             <div *ngIf="block.isMerging"
                  class="absolute inset-0 flex items-center justify-center pointer-events-none z-40 merge-sparkle-center">
               <span class="text-white text-2xl font-black drop-shadow-[0_0_12px_#ffffff]">✦</span>
             </div>
          </div>
        </div>

        <!-- Score & Combo Float Texts -->
        <div *ngFor="let combo of combos"
             class="absolute z-30 font-black pointer-events-none float-up drop-shadow-xl select-none text-center whitespace-nowrap"
             [ngClass]="combo.comboCount >= 1 ? 'text-amber-300 font-mono text-2xl sm:text-3xl' : 'text-yellow-300 text-xl sm:text-2xl'"
             [style.left.px]="colPx(combo.c) + cellSize / 2"
             [style.top.px]="rowPx(combo.r) - cellSize / 3"
             style="transform: translateX(-50%);">
          <div [class.combo-praise-pop]="combo.comboCount >= 1">
            {{ combo.text }}
          </div>
        </div>

        <!-- Level Up Badge -->
        <div *ngIf="showLevelUp()"
             class="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div class="level-up-badge px-6 py-3 rounded-2xl font-black text-3xl text-white text-center"
               style="background: linear-gradient(135deg, #f59e0b, #ef4444); box-shadow: 0 0 40px rgba(245,158,11,0.8), 0 0 80px rgba(239,68,68,0.4); text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
            LEVEL {{ levelUpNum() }}!
          </div>
        </div>

        <!-- Newcomer Micro Guide Hint (Auto fades out after first action) -->
        <div *ngIf="showGuideHint()"
             class="absolute inset-x-4 bottom-16 z-30 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-cyan-400/40 text-center pointer-events-none guide-fade-anim shadow-2xl">
          <div class="flex items-center gap-2 text-cyan-300 font-bold text-xs sm:text-sm mb-1">
            <span class="animate-pulse">👈</span>
            <span>滑动 / 点击选列</span>
            <span class="animate-pulse">👉</span>
          </div>
          <div class="text-[10px] sm:text-xs text-slate-300 font-mono">
            下滑/SPACE 极速落子 · 合成更高数字
          </div>
        </div>

      </div><!-- /inner visual layer -->

      <!-- Revive Explosion Particles (OUTSIDE overflow-hidden for full visibility) -->
      <div *ngFor="let p of particles"
           class="absolute z-[70] rounded-full pointer-events-none spark-anim"
           [style.background-color]="p.color"
           [style.width.px]="p.size"
           [style.height.px]="p.size"
           [style.left.px]="colPx(p.x) + cellSize / 2 - p.size / 2"
           [style.top.px]="rowPx(p.y) + cellSize / 2 - p.size / 2"
           [style.--tx]="p.tx + 'px'"
           [style.--ty]="p.ty + 'px'"
           style="box-shadow: 0 0 10px currentColor, 0 0 24px currentColor, 0 0 48px currentColor;">
      </div>

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
      letter-spacing: -0.04em;
      overflow: hidden;
      max-width: 100%;
      white-space: nowrap;
      line-height: 1;
      padding: 0 2px;
      box-sizing: border-box;
    }

    @keyframes rainbow-pulse {
      0%, 100% { filter: hue-rotate(0deg) brightness(1); transform: scale(1); }
      50% { filter: hue-rotate(180deg) brightness(1.2); transform: scale(1.04); }
    }

    /* Merge burst — Intense dazzling incandescent flash & shockwave */
    @keyframes merge-pop {
      0%   { transform: scale(0.92); filter: brightness(1); }
      18%  { transform: scale(1.28); filter: brightness(3.2) contrast(1.4) drop-shadow(0 0 18px #ffffff) drop-shadow(0 0 32px rgba(251,191,36,0.9)); }
      45%  { transform: scale(0.95); filter: brightness(1.3); }
      75%  { transform: scale(1.04); filter: brightness(1.05); }
      100% { transform: scale(1);    filter: brightness(1); }
    }
    .merge-pop { animation: merge-pop 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }

    /* Merge white flash burst overlay */
    @keyframes merge-flash-white {
      0%   { opacity: 1; transform: scale(1.05); background-color: rgba(255, 255, 255, 0.95); box-shadow: 0 0 25px #ffffff, 0 0 45px rgba(255,255,255,0.8); }
      35%  { opacity: 0.8; transform: scale(1.15); background-color: rgba(255, 255, 255, 0.7); }
      100% { opacity: 0; transform: scale(1.25); background-color: rgba(255, 255, 255, 0); }
    }
    .merge-flash-white { animation: merge-flash-white 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    /* Merge expanding shockwave ring */
    @keyframes merge-shockwave-ring {
      0%   { box-shadow: 0 0 0 0px rgba(255, 255, 255, 1), 0 0 16px 4px rgba(255, 255, 255, 0.9); opacity: 1; }
      100% { box-shadow: 0 0 0 32px rgba(255, 255, 255, 0), 0 0 28px 8px rgba(255, 255, 255, 0); opacity: 0; }
    }
    .merge-shockwave-ring { animation: merge-shockwave-ring 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    /* Merge diamond sparkle center */
    @keyframes merge-sparkle-center {
      0%   { transform: scale(0.2) rotate(0deg); opacity: 0; }
      25%  { transform: scale(1.4) rotate(45deg); opacity: 1; filter: drop-shadow(0 0 10px #ffffff); }
      100% { transform: scale(0.1) rotate(90deg); opacity: 0; }
    }
    .merge-sparkle-center { animation: merge-sparkle-center 0.35s ease-out forwards; }

    /* Score float-up */
    @keyframes float-up {
      0%   { transform: translateY(0)     scale(1);    opacity: 1; }
      20%  { transform: translateY(-16px) scale(1.18); opacity: 1; }
      100% { transform: translateY(-92px) scale(0.8);  opacity: 0; }
    }
    .float-up { animation: float-up 1s ease-out forwards; }

    @keyframes combo-praise-pop {
      0%   { transform: scale(0.7); opacity: 0.8; }
      40%  { transform: scale(1.15); filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4)); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .combo-praise-pop { animation: combo-praise-pop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    /* Landing ripple */
    @keyframes landing-ring {
      0%   { box-shadow: 0 0 0  0px rgba(255,255,255,0.75); opacity: 1; }
      100% { box-shadow: 0 0 0 22px rgba(255,255,255,0);    opacity: 0; }
    }
    .landing-ring { animation: landing-ring 0.4s ease-out forwards; }

    /* Spark particles — revive explosion */
    .spark-anim {
      animation: spark 1.2s cubic-bezier(0.05, 0.9, 0.2, 1) forwards;
      filter: brightness(1.5);
    }
    @keyframes spark {
      0%   { transform: translate(0, 0) scale(1.5); opacity: 1; }
      30%  { opacity: 1; }
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
    /* Guide hint pulse fade */
    @keyframes guide-fade {
      0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
      15%  { opacity: 1; transform: translateY(0) scale(1); }
      85%  { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-8px) scale(0.96); }
    }
    .guide-fade-anim { animation: guide-fade 5s ease-in-out forwards; }
  `]
})
export class Drop2048BoardComponent {
  @Input() board: DropBlock[] = [];
  @Input() activeBlock: { id: string, val: number, c: number, r: number } | null = null;
  @Input() combos: ComboText[] = [];
  @Input() particles: { id: string, x: number, y: number, color: string, size: number, tx?: number, ty?: number }[] = [];
  @Input() ghostRow = -1;

  math = Math;

  isShaking = signal(false);
  showLevelUp = signal(false);
  levelUpNum = signal(0);
  showGuideHint = signal(false);

  constructor(public store: Drop2048Store) {
    // Show guide only once per session/first play
    if (typeof window !== 'undefined' && !sessionStorage.getItem('drop2048_guide_seen')) {
      this.showGuideHint.set(true);
      setTimeout(() => {
        this.dismissGuide();
      }, 5000);
    }

    effect(() => {
      // Once player places blocks or score increases, hide guide immediately
      if (this.board.length > 0 || this.store.score() > 0) {
        this.dismissGuide();
      }
    });
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
  @Input() cellSize = 64;
  readonly gap = 3;
  readonly padding = 6;

  get boardWidth()  { return this.COLS * this.cellSize + (this.COLS - 1) * this.gap + this.padding * 2; }
  get boardHeight() { return this.ROWS * this.cellSize + (this.ROWS - 1) * this.gap + this.padding * 2; }

  get colsArray() { return new Array(this.COLS); }

  /** Pixel X offset for column c */
  colPx(c: number) { return c * (this.cellSize + this.gap) + this.padding; }
  /** Pixel Y offset for row r */
  rowPx(r: number) { return r * (this.cellSize + this.gap) + this.padding; }

  getBlockStyle(val: number): Record<string, string> {
    return getDrop2048BlockStyle(val);
  }

  getBlockFontSize(val: number): number {
    if (val === 0) return Math.round(this.cellSize * 0.44); // 🌈 emoji
    const digits = val.toString().length;
    if (digits <= 2) return Math.round(this.cellSize * 0.40);       // 2 ~ 64
    if (digits === 3) return Math.round(this.cellSize * 0.31);       // 128 ~ 512
    if (digits === 4) return Math.round(this.cellSize * 0.22);       // 1024 ~ 8192
    if (digits === 5) return Math.round(this.cellSize * 0.175);      // 16384 ~ 65536
    return Math.round(this.cellSize * 0.15);                         // 131072+
  }

  dismissGuide() {
    this.showGuideHint.set(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('drop2048_guide_seen', 'true');
    }
  }

  onColumnClick(c: number) {
    this.dismissGuide();
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

