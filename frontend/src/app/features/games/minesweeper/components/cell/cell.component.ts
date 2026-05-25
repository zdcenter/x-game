import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cell, CellState } from '../../store/minesweeper.store';

@Component({
  selector: 'app-cell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button 
      class="w-10 h-10 flex items-center justify-center text-lg font-bold rounded shadow-sm transition-all duration-200 select-none focus:outline-none relative"
      [ngClass]="cellClass"
      (click)="onLeftClick($event)"
      (contextmenu)="onRightClick($event)"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
      (touchcancel)="onTouchCancel($event)"
      (touchmove)="onTouchMove($event)"
    >
      @if (cell.state === CellState.Revealed) {
        @if (cell.neighbors > 0) {
          <span [ngStyle]="{ 'color': neighborColor }">{{ cell.neighbors }}</span>
        }
      } @else if (cell.state === CellState.Exploded) {
        <span class="animate-bounce">💣</span>
      } @else if (cell.state === CellState.Flagged) {
        <span class="drop-shadow-md z-10">🚩</span>
        @if (cell.owner) {
           <div class="absolute inset-0 rounded bg-green-500/20 animate-pulse border border-green-400"></div>
           <span class="absolute -bottom-1 right-0 text-[9px] font-mono leading-none text-green-300 z-20" style="text-shadow: 0 1px 2px black;">
             {{ (cell.owner | slice:0:3) }}
           </span>
        }
      }
    </button>
  `
})
export class CellComponent {
  @Input({ required: true }) cell!: Cell;
  @Output() reveal = new EventEmitter<void>();
  @Output() flag = new EventEmitter<void>();

  // Expose enum to template
  CellState = CellState;

  get cellClass(): string {
    if (this.cell.state === CellState.Revealed) {
      return 'bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-inner scale-95';
    }
    if (this.cell.state === CellState.Exploded) {
      return 'bg-red-500/20 border border-red-500/50 scale-95';
    }
    return 'bg-[var(--color-border-card)] border-[1.5px] border-t-[var(--color-cell-highlight)] border-l-[var(--color-cell-highlight)] border-b-[var(--color-cell-shadow)] border-r-[var(--color-cell-shadow)] shadow-md hover:brightness-110 active:scale-95 cursor-pointer';
  }

  get neighborColor(): string {
    const colors = [
      '', // 0
      '#60a5fa', // 1: blue-400
      '#34d399', // 2: emerald-400
      '#f87171', // 3: red-400
      '#818cf8', // 4: indigo-400
      '#fb923c', // 5: orange-400
      '#2dd4bf', // 6: teal-400
      '#c084fc', // 7: purple-400
      '#a1a1aa'  // 8: zinc-400
    ];
    return colors[this.cell.neighbors] || '#fff';
  }

  onLeftClick(event: MouseEvent) {
    if (event.button === 0) {
      this.reveal.emit();
    }
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.flag.emit();
  }

  private touchTimeout: any;
  private touchFired = false;

  onTouchStart(event: TouchEvent) {
    this.touchFired = false;
    this.touchTimeout = setTimeout(() => {
      this.touchFired = true;
      this.flag.emit();
    }, 400); // 400ms for long press
  }

  onTouchMove(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
    this.touchFired = true; // Prevent tap action if user is scrolling
  }

  onTouchEnd(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
    if (!this.touchFired) {
      event.preventDefault(); // Prevent emulated mouse clicks
      this.reveal.emit();
    } else {
      event.preventDefault();
    }
  }

  onTouchCancel(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
  }
}
