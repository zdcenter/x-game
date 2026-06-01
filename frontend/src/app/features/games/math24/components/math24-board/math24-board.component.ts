import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store, Math24Card, Operator } from '../../store/math24.store';

@Component({
  selector: 'app-math24-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-md mx-auto h-full gap-4 sm:gap-8 py-4 sm:py-8">
      
      <!-- 3x3 Grid Board -->
      <div class="grid grid-cols-3 grid-rows-3 gap-3 sm:gap-4 w-full aspect-square relative select-none">
        
        <!-- Row 0 -->
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.boardCards()[0] }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '+' }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.boardCards()[1] }"></ng-container>
        </div>

        <!-- Row 1 -->
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '*' }"></ng-container>
        </div>
        <div class="w-full h-full flex items-center justify-center p-2 sm:p-4">
          <div class="w-full h-full rounded-full bg-[var(--color-border-card)] flex items-center justify-center shadow-inner text-4xl sm:text-5xl font-black text-[var(--color-text-main)] opacity-30">
            24
          </div>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '/' }"></ng-container>
        </div>

        <!-- Row 2 -->
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.boardCards()[2] }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '-' }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.boardCards()[3] }"></ng-container>
        </div>

      </div>

      <!-- Equation Builder Preview -->
      <div class="h-8 text-xl sm:text-2xl font-mono text-[var(--color-text-muted)] font-bold">
        {{ getPreviewText() }}
      </div>

      <!-- Controls -->
      <div class="flex gap-4 mt-2">
        <button class="px-6 py-3 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] border border-[var(--color-border-card)] rounded-xl font-bold transition-colors flex items-center gap-2"
                (click)="undo()"
                [disabled]="store.boardHistory().length <= 1"
                [ngClass]="{'opacity-50 cursor-not-allowed': store.boardHistory().length <= 1}">
          <span>↩️</span> Undo
        </button>
        <button class="px-6 py-3 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] border border-[var(--color-border-card)] rounded-xl font-bold transition-colors flex items-center gap-2"
                (click)="reset()">
          <span>🔄</span> Reset
        </button>
      </div>

      <!-- Templates -->
      <ng-template #cardTpl let-card="card">
        <div *ngIf="card"
             class="w-full h-full bg-[var(--color-bg-card)] border-4 rounded-2xl shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
             [ngClass]="{
               'border-blue-500 bg-blue-900/30 shadow-blue-500/50': selectedCard?.id === card.id,
               'border-[var(--color-border-card)]': selectedCard?.id !== card.id
             }"
             (click)="selectCard(card)">
          <span class="text-5xl sm:text-6xl font-black font-mono text-[var(--color-text-main)]">{{ card.value }}</span>
        </div>
      </ng-template>

      <ng-template #opTpl let-op="op">
        <div class="w-full h-full p-2 sm:p-3">
          <button class="w-full h-full rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold transition-all border-4 shadow-sm active:scale-95"
                  [ngClass]="{
                    'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/50 scale-105': selectedOp === op,
                    'bg-[var(--color-bg-main)] border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-main)]': selectedOp !== op
                  }"
                  (click)="selectOp(op)">
            {{ op === '*' ? '×' : (op === '/' ? '÷' : op) }}
          </button>
        </div>
      </ng-template>

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
