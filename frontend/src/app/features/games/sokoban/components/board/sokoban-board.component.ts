import { Component, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SokobanStore } from '../../store/sokoban.store';

@Component({
  selector: 'app-sokoban-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] shadow-inner overflow-hidden flex items-center justify-center"
         (touchstart)="onTouchStart($event)"
         (touchend)="onTouchEnd($event)">
      
      <div class="grid relative"
           [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
           [style.grid-template-rows]="'repeat(' + rows() + ', minmax(0, 1fr))'"
           [style.width]="boardWidth()"
           [style.height]="boardHeight()">
        
        @for (row of store.myBoard(); track $index; let r = $index) {
          @for (cell of row; track $index; let c = $index) {
            <div class="flex items-center justify-center w-full h-full relative" [ngClass]="getCellClass(cell)">
              @if (cell === '.') {
                <div class="w-1/4 h-1/4 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              }
              @if (cell === '$') {
                <div class="w-[85%] h-[85%] bg-amber-600 rounded shadow-md border border-amber-800 flex items-center justify-center">
                  <div class="w-[70%] h-[70%] border border-amber-700 opacity-50"></div>
                </div>
              }
              @if (cell === '*') {
                <div class="w-[85%] h-[85%] bg-emerald-500 rounded shadow-[0_0_12px_rgba(16,185,129,0.8)] border border-emerald-700 flex items-center justify-center">
                  <div class="w-[70%] h-[70%] border border-emerald-400 opacity-50"></div>
                </div>
              }
              @if (cell === '@' || cell === '+') {
                <div class="w-[80%] h-[80%] bg-blue-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center z-10">
                  <div class="w-[40%] h-[40%] bg-white rounded-full opacity-50"></div>
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
export class SokobanBoardComponent {
  store = inject(SokobanStore);

  rows = computed(() => this.store.myBoard().length || 1);
  cols = computed(() => {
    const b = this.store.myBoard();
    return b.length > 0 ? b[0].length : 1;
  });

  boardRatio = computed(() => this.cols() / this.rows());

  boardWidth = computed(() => {
    if (this.boardRatio() > 1) return '100%';
    return `calc(100% * ${this.boardRatio()})`;
  });

  boardHeight = computed(() => {
    if (this.boardRatio() <= 1) return '100%';
    return `calc(100% / ${this.boardRatio()})`;
  });

  private touchStartX = 0;
  private touchStartY = 0;

  getCellClass(cell: string): string {
    if (cell === '#') return 'bg-slate-700/80 rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-slate-800';
    if (cell === ' ') return 'bg-slate-800/20';
    if (cell === '.') return 'bg-slate-800/20';
    if (cell === '$') return 'bg-slate-800/20';
    if (cell === '*') return 'bg-emerald-900/20';
    if (cell === '@' || cell === '+') return 'bg-slate-800/20';
    return 'bg-transparent';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== 'playing' || this.store.isDead()) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.store.move('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.store.move('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.store.move('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.store.move('right');
        event.preventDefault();
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          this.store.undo();
          event.preventDefault();
        }
        break;
    }
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
          this.store.move(dx > 0 ? 'right' : 'left');
          event.preventDefault();
        }
      } else {
        if (Math.abs(dy) > 30) {
          this.store.move(dy > 0 ? 'down' : 'up');
          event.preventDefault();
        }
      }
    }
  }
}
