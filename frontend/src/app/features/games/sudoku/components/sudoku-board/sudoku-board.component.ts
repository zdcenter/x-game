import { Component, inject, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore, SudokuCell } from '../../store/sudoku.store';
import { InteractiveTutorialPointerComponent } from '../../../../../shared/components/interactive-tutorial/interactive-tutorial-pointer.component';

@Component({
  selector: 'app-sudoku-board',
  standalone: true,
  imports: [CommonModule, InteractiveTutorialPointerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'w-full flex justify-center'
  },
  
  templateUrl: './sudoku-board.component.html'})
export class SudokuBoardComponent {
  store = inject(SudokuStore);

  isTutorialTarget(r: number, c: number): boolean {
    return this.store.isTutorialTarget(r, c);
  }

  isTutorialClue(r: number, c: number): boolean {
    return this.store.isTutorialClue(r, c);
  }

  isTutorialRay(r: number, c: number): boolean {
    return this.store.isTutorialRay(r, c);
  }

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
    if (this.store.isTutorialActive()) {
      if (this.isTutorialTarget(cell.r, cell.c)) {
        return 'rgba(245, 158, 11, 0.2)';
      }
      if (this.isTutorialClue(cell.r, cell.c)) {
        return 'rgba(14, 165, 233, 0.25)';
      }
      if (this.isTutorialRay(cell.r, cell.c)) {
        return 'rgba(59, 130, 246, 0.08)';
      }
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

    const key = event.key;
    const lowerKey = key.toLowerCase();

    // Hotkey: Z for undo
    if (lowerKey === 'z') {
      if (this.store.canUndo()) {
        this.store.undo();
        event.preventDefault();
        return;
      }
    }

    // Hotkey: R for clear / reset current board
    if (lowerKey === 'r') {
      this.store.clearBoard();
      event.preventDefault();
      return;
    }

    if (key >= '1' && key <= '9') {
      this.store.inputNumber(parseInt(key, 10));
    } else if (key === 'Backspace' || key === 'Delete') {
      this.store.erase();
    } else if (key === ' ' || lowerKey === 'n') {
      this.store.togglePencilMode();
      event.preventDefault();
    }
    
    // Navigation arrows & WASD
    const sel = this.store.selectedCell();
    if (sel) {
      let {r, c} = sel;
      if (key === 'ArrowUp' || lowerKey === 'w') r = (r - 1 + 9) % 9;
      if (key === 'ArrowDown' || lowerKey === 's') r = (r + 1) % 9;
      if (key === 'ArrowLeft' || lowerKey === 'a') c = (c - 1 + 9) % 9;
      if (key === 'ArrowRight' || lowerKey === 'd') c = (c + 1) % 9;
      
      if (r !== sel.r || c !== sel.c) {
        this.store.selectCell(r, c);
        event.preventDefault();
      }
    }
  }
}
