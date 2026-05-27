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
  styles: [`
    .cell-border { border-color: var(--color-border-card); }
    .cell-thick-border { border-color: var(--color-text-main); opacity: 0.3; }
  `],
  template: `
    <div class="relative w-full max-w-[500px] aspect-square rounded-xl overflow-hidden bg-[var(--color-border-card)] p-1 shadow-2xl">
      <div class="w-full h-full grid grid-cols-9 grid-rows-9 gap-[1px] bg-[var(--color-border-card)]">
        
        @for (row of store.board(); track r; let r = $index) {
          @for (cell of row; track cell.r + '-' + cell.c; let c = $index) {
            
            <div 
              class="relative flex items-center justify-center cursor-pointer select-none transition-all duration-200"
              [style.background-color]="getCellBg(cell)"
              [class.border-r-[2px]]="(c + 1) % 3 === 0 && c !== 8"
              [class.border-b-[2px]]="(r + 1) % 3 === 0 && r !== 8"
              [style.border-right-color]="((c + 1) % 3 === 0 && c !== 8) ? 'var(--color-border-thick)' : ''"
              [style.border-bottom-color]="((r + 1) % 3 === 0 && r !== 8) ? 'var(--color-border-thick)' : ''"
              [class.text-white]="isSelected(cell) || isSameValue(cell)"
              [class.text-[var(--color-text-main)]]="cell.fixed && !isSelected(cell) && !isSameValue(cell)"
              [class.text-[var(--color-accent-from)]]="!cell.fixed && !cell.error && cell.val !== 0 && !isSelected(cell) && !isSameValue(cell)"
              [class.text-red-500]="cell.error && !isSelected(cell) && !isSameValue(cell)"
              [class.text-red-100]="cell.error && (isSelected(cell) || isSameValue(cell))"
              [class.animate-shake]="cell.error"
              (click)="store.selectCell(r, c)"
            >
              <!-- Big Number -->
              @if (cell.val !== 0) {
                <span class="text-2xl md:text-3xl font-bold" [class.drop-shadow-md]="!cell.fixed && !cell.error">{{ cell.val }}</span>
              } @else {
                <!-- Pencil Notes Grid -->
                <div class="w-full h-full grid grid-cols-3 grid-rows-3 p-[2px]">
                  @for (n of [1,2,3,4,5,6,7,8,9]; track n) {
                    <div class="flex items-center justify-center text-[8px] md:text-[10px] opacity-70 font-semibold"
                         [class.text-[var(--color-text-main)]]="!isSelected(cell) && !isSameValue(cell)"
                         [class.text-white]="isSelected(cell) || isSameValue(cell)">
                      @if (cell.notes.has(n)) {
                        <span>{{ n }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
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
