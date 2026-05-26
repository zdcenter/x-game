import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-sudoku-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-sm mx-auto">
      
      <!-- Top Bar: Back & Timer -->
      <div class="flex justify-between items-center bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border-card)] shadow-lg">
        <button (click)="back.emit()" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Back
        </button>
        <div class="font-mono text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md">
          {{ formatTime(store.timeSpent()) }}
        </div>
      </div>

      <!-- Action Tools -->
      <div class="flex justify-between gap-2">
        <button 
          (click)="store.undo()"
          class="flex-1 flex flex-col items-center justify-center p-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors active:scale-95 text-[var(--color-text-main)]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span class="text-xs font-semibold">Undo</span>
        </button>

        <button 
          (click)="store.erase()"
          class="flex-1 flex flex-col items-center justify-center p-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)] transition-colors active:scale-95 text-[var(--color-text-main)]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="text-xs font-semibold">Erase</span>
        </button>

        <button 
          (click)="store.togglePencilMode()"
          class="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95"
          [class.bg-[var(--color-accent-from)]]="store.pencilMode()"
          [class.border-[var(--color-accent-from)]]="store.pencilMode()"
          [class.text-white]="store.pencilMode()"
          [class.bg-[var(--color-bg-card)]]="!store.pencilMode()"
          [class.border-[var(--color-border-card)]]="!store.pencilMode()"
          [class.text-[var(--color-text-main)]]="!store.pencilMode()"
          [class.hover:bg-[var(--color-bg-main)]]="!store.pencilMode()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" 
               [class.opacity-100]="store.pencilMode()"
               [class.opacity-70]="!store.pencilMode()"
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span class="text-xs font-semibold">Notes (N)</span>
        </button>
      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-3">
        @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
          <button 
            (click)="store.inputNumber(num)"
            class="aspect-square flex items-center justify-center text-3xl font-black bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)] hover:text-[var(--color-accent-from)] transition-all shadow-lg active:scale-95 text-[var(--color-text-main)]"
          >
            {{ num }}
          </button>
        }
      </div>

    </div>
  `
})
export class SudokuControlsComponent {
  store = inject(SudokuStore);
  i18n = inject(I18nService);
  
  @Output() back = new EventEmitter<void>();

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
