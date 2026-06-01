import { Component, inject, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore, SudokuCell } from '../../store/sudoku.store';

@Component({
  selector: 'app-sudoku-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'w-full flex justify-center'
  },
  
  templateUrl: './sudoku-board.component.html',
  styleUrl: './sudoku-board.component.css'})
export class SudokuBoardComponent {
  store = inject(SudokuStore);

  isSelected(cell: SudokuCell): boolean {
    const sel = this.store.selectedCell();
    return sel !== null && sel.r === cell.r && sel.c === cell.c;
  }

  isHighlighted(cell: SudokuCell): boolean {
    const sel = this.store.selectedCell();
    if (!sel) return false;
    
    // Highlight row, col, block
    const sameRow = sel.r === cell.r;
    const sameCol = sel.c === cell.c;
    const sameBlock = Math.floor(sel.r / 3) === Math.floor(cell.r / 3) && 
                      Math.floor(sel.c / 3) === Math.floor(cell.c / 3);
    
    return sameRow || sameCol || sameBlock;
  }

  isSameValue(cell: SudokuCell): boolean {
    const sel = this.store.selectedCell();
    if (!sel) return false;
    if (cell.val === 0) return false;
    
    const b = this.store.board();
    const selCell = b[sel.r][sel.c];
    return selCell.val === cell.val;
  }

  getCellBg(cell: SudokuCell): string {
    if (this.isSelected(cell)) {
      return 'var(--color-accent-from)';
    }
    if (this.isSameValue(cell)) {
      return 'var(--color-accent-to)';
    }
    if (this.isHighlighted(cell)) {
      return 'var(--color-bg-card)';
    }
    return 'var(--color-bg-main)';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.store.isFinished()) return;

    if (event.key >= '1' && event.key <= '9') {
      this.store.inputNumber(parseInt(event.key, 10));
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      this.store.erase();
    } else if (event.key === ' ' || event.key.toLowerCase() === 'n') {
      this.store.togglePencilMode();
      event.preventDefault();
    }
    
    // Navigation arrows
    const sel = this.store.selectedCell();
    if (sel) {
      let {r, c} = sel;
      if (event.key === 'ArrowUp') r = (r - 1 + 9) % 9;
      if (event.key === 'ArrowDown') r = (r + 1) % 9;
      if (event.key === 'ArrowLeft') c = (c - 1 + 9) % 9;
      if (event.key === 'ArrowRight') c = (c + 1) % 9;
      
      if (r !== sel.r || c !== sel.c) {
        this.store.selectCell(r, c);
        event.preventDefault();
      }
    }
  }
}
