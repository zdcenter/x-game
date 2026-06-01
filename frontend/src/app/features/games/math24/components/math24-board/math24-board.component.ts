import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store, Math24Card, Operator } from '../../store/math24.store';

@Component({
  selector: 'app-math24-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-full gap-8 py-8">
      
      <!-- Current Cards -->
      <div class="flex flex-wrap justify-center gap-4">
        <div *ngFor="let card of store.boardCards()"
             class="w-24 h-32 md:w-32 md:h-44 bg-slate-800 border-2 rounded-xl shadow-lg flex items-center justify-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-blue-500/20"
             [ngClass]="{
               'border-blue-500 bg-blue-900/30 shadow-blue-500/50': selectedCard?.id === card.id,
               'border-slate-700': selectedCard?.id !== card.id
             }"
             (click)="selectCard(card)">
          <span class="text-4xl md:text-5xl font-bold font-mono text-white">{{ card.value }}</span>
        </div>
      </div>

      <!-- Operators -->
      <div class="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
        <button *ngFor="let op of operators"
                class="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-3xl font-bold transition-all"
                [ngClass]="{
                  'bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110': selectedOp === op,
                  'bg-slate-800 text-slate-300 hover:bg-slate-700': selectedOp !== op
                }"
                (click)="selectOp(op)">
          {{ op === '*' ? '×' : (op === '/' ? '÷' : op) }}
        </button>
      </div>

      <!-- Controls -->
      <div class="flex gap-4 mt-8">
        <button class="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors flex items-center gap-2"
                (click)="undo()"
                [disabled]="store.boardHistory().length <= 1"
                [ngClass]="{'opacity-50 cursor-not-allowed': store.boardHistory().length <= 1}">
          <span>↩️</span> Undo
        </button>
        <button class="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors flex items-center gap-2"
                (click)="reset()">
          <span>🔄</span> Reset
        </button>
      </div>

      <!-- Equation Builder Preview -->
      <div class="mt-4 h-8 text-xl font-mono text-slate-400">
        {{ getPreviewText() }}
      </div>
    </div>
  `
})
export class Math24BoardComponent {
  store = inject(Math24Store);

  operators: Operator[] = ['+', '-', '*', '/'];
  
  selectedCard: Math24Card | null = null;
  selectedOp: Operator | null = null;

  selectCard(card: Math24Card) {
    if (!this.selectedCard) {
      this.selectedCard = card;
    } else if (this.selectedCard.id === card.id) {
      this.selectedCard = null; // deselect
    } else if (this.selectedOp) {
      // Combine
      const success = this.store.combineCards(this.selectedCard, card, this.selectedOp);
      if (success) {
        this.selectedCard = null;
        this.selectedOp = null;
      }
    } else {
      // change selection
      this.selectedCard = card;
    }
  }

  selectOp(op: Operator) {
    if (this.selectedCard) {
      this.selectedOp = this.selectedOp === op ? null : op;
    }
  }

  undo() {
    this.store.undo();
    this.selectedCard = null;
    this.selectedOp = null;
  }

  reset() {
    // Reset to start of history
    const history = this.store.boardHistory();
    if (history.length > 0) {
      const initial = history[0];
      this.store.boardHistory.set([initial]);
      this.store.boardCards.set(initial);
      this.selectedCard = null;
      this.selectedOp = null;
    }
  }

  getPreviewText(): string {
    if (this.selectedCard && this.selectedOp) {
      const opSymbol = this.selectedOp === '*' ? '×' : (this.selectedOp === '/' ? '÷' : this.selectedOp);
      return `${this.selectedCard.value} ${opSymbol} ?`;
    }
    if (this.selectedCard) {
      return `${this.selectedCard.value} ...`;
    }
    return '';
  }
}
