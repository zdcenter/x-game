import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';

@Component({
  selector: 'app-sudoku-numpad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-9 md:grid-cols-1 gap-1 md:gap-2 w-full max-w-[500px] md:max-w-none mx-auto">
      @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
        <button 
          (click)="store.inputNumber(num)"
          class="aspect-square flex items-center justify-center text-xl md:text-3xl font-black bg-[var(--color-bg-card)] rounded-md md:rounded-xl border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)] hover:text-[var(--color-accent-from)] transition-all shadow md:shadow-md active:scale-95 text-[var(--color-text-main)]"
        >
          {{ num }}
        </button>
      }
    </div>
  `
})
export class SudokuNumpadComponent {
  store = inject(SudokuStore);
}
