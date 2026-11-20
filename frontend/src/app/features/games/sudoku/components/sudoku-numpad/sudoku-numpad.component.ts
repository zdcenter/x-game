import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { HapticService } from '../../../../../core/services/haptic.service';

@Component({
  selector: 'app-sudoku-numpad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sudoku-numpad.component.html'
})
export class SudokuNumpadComponent {
  store = inject(SudokuStore);
  haptic = inject(HapticService);

  digitCounts = computed(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const b = this.store.board();
    for (const row of b) {
      for (const cell of row) {
        if (cell.val >= 1 && cell.val <= 9 && !cell.error) {
          counts[cell.val] = (counts[cell.val] || 0) + 1;
        }
      }
    }
    return counts;
  });

  onNumberClick(num: number) {
    this.store.inputNumber(num);
  }
}
