import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store, Math24Card, Operator } from '../../store/math24.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { AdService } from '../../../../../core/services/ad.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Math24Solver } from '../../utils/math24-solver';
import { HintButtonComponent } from '../../../../../shared/components/hint-button/hint-button.component';

@Component({
  selector: 'app-math24-board',
  standalone: true,
  imports: [CommonModule, HintButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-[min(90vw,400px,calc(100vh-320px))] mx-auto h-full gap-2 sm:gap-3 py-1 sm:py-2">
      
      <!-- Top controls above board -->
      <div class="flex justify-between items-end w-full px-2 mb-2">
        <!-- Prev Level -->
        <button class="text-[var(--color-text-muted)] hover:text-blue-400 font-bold transition-colors px-2 py-1"
                (click)="store.loadPrevLevel()"
                [disabled]="store.localLevelIndex() <= 0"
                [ngClass]="{'opacity-30 cursor-not-allowed': store.localLevelIndex() <= 0}">
          <span class="mr-1">«</span> <ng-container i18n="@@game.prev_level">game.prev_level</ng-container>
        </button>
        
        <!-- Level Badge -->
        <div class="px-5 py-1.5 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-md text-sm sm:text-base font-black text-blue-400 -translate-y-2">
          <ng-container i18n="@@game.level">game.level</ng-container> {{ store.localLevelIndex() + 1 }}
        </div>

        <!-- Next Level -->
        <button class="text-[var(--color-text-muted)] hover:text-blue-400 font-bold transition-colors px-2 py-1"
                (click)="store.loadNextLevel()">
          <ng-container i18n="@@game.next_level">game.next_level</ng-container> <span class="ml-1">»</span>
        </button>
      </div>

      <!-- 3x3 Grid Board -->
      <div class="grid grid-cols-3 grid-rows-3 gap-3 sm:gap-4 w-full aspect-square relative select-none">
        
        <!-- Freeze Overlay -->
        @if (freezeRemaining() > 0) {
          <div class="absolute inset-0 z-50 bg-blue-900/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <span class="text-6xl sm:text-8xl animate-pulse drop-shadow-lg">❄️</span>
            <div class="mt-4 text-2xl font-black text-white tracking-widest">{{ freezeRemaining() }}s</div>
            <div class="text-sm font-bold text-blue-200 mt-2 uppercase"><ng-container i18n="@@game.frozen">Frozen Penalty</ng-container></div>
          </div>
        }

        <!-- Hint Overlay -->
        @if (hintSolution()) {
          <div class="absolute inset-0 z-[60] bg-[var(--color-bg-card)]/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.2)] animate-scale-in">
            <div class="text-5xl sm:text-6xl mb-4 animate-bounce drop-shadow-lg">💡</div>
            <div class="text-sm font-bold text-orange-500 uppercase tracking-widest mb-2"><ng-container i18n="@@game.hint_title">Hint</ng-container></div>
            <div class="w-full max-w-[280px] bg-[var(--color-bg-main)] px-4 sm:px-6 py-4 rounded-xl border border-[var(--color-border-card)] shadow-inner mb-8 flex flex-col gap-2">
              @for (step of hintSolution(); track $index) {
                <div class="text-2xl sm:text-3xl font-black font-mono text-[var(--color-text-main)] text-center w-full whitespace-nowrap overflow-hidden text-ellipsis">
                  {{ step }}
                </div>
              }
            </div>
            <button class="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all text-sm sm:text-base w-full max-w-[200px]"
                    (click)="hintSolution.set(null)">
              <ng-container i18n="@@game.close">Close</ng-container>
            </button>
          </div>
        }

        <!-- Row 0 -->
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.currentBoardCards()[0] }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '+' }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.currentBoardCards()[1] }"></ng-container>
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
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.currentBoardCards()[2] }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="opTpl; context: { op: '-' }"></ng-container>
        </div>
        <div class="w-full h-full">
          <ng-container *ngTemplateOutlet="cardTpl; context: { card: store.currentBoardCards()[3] }"></ng-container>
        </div>

      </div>

      <!-- Equation Builder Preview -->
      <div class="h-8 text-xl sm:text-2xl font-mono text-[var(--color-text-muted)] font-bold mt-2">
        {{ getPreviewText() }}
      </div>

      <!-- Controls -->
      <div class="flex justify-between w-full px-2 mt-4">
        <!-- Hint Ad Button -->
        <app-hint-button layout="math24" (hintApplied)="applyHint()"></app-hint-button>
        
        <div class="flex gap-2 sm:gap-4">
          <button class="px-4 sm:px-6 py-2 sm:py-3 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] border border-[var(--color-border-card)] rounded-xl font-bold transition-colors flex items-center gap-1 sm:gap-2 shadow-sm text-sm sm:text-base"
                  (click)="undo()"
                  [disabled]="store.currentBoardHistory().length <= 1"
                  [ngClass]="{'opacity-50 cursor-not-allowed': store.currentBoardHistory().length <= 1}">
            <span>↩️</span> <ng-container i18n="@@game.undo">game.undo</ng-container>
          </button>
          <button class="px-4 sm:px-6 py-2 sm:py-3 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] border border-[var(--color-border-card)] rounded-xl font-bold transition-colors flex items-center gap-1 sm:gap-2 shadow-sm text-sm sm:text-base"
                  (click)="reset()">
            <span>🔄</span> <ng-container i18n="@@game.reset">game.reset</ng-container>
          </button>
        </div>
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
  i18n = inject(I18nService);
  adService = inject(AdService);
  toastService = inject(ToastService);

  operators: Operator[] = ['+', '-', '*', '/'];
  
  selectedCard: Math24Card | null = null;
  selectedOp: Operator | null = null;

  freezeRemaining = signal<number>(0);
  hintSolution = signal<string[] | null>(null);
  private freezeInterval: any;

  constructor() {
    effect(() => {
      const target = this.store.freezeUntil();
      if (target > Date.now()) {
        if (this.freezeInterval) clearInterval(this.freezeInterval);
        this.freezeRemaining.set(Math.ceil((target - Date.now()) / 1000));
        this.freezeInterval = setInterval(() => {
          const rem = Math.ceil((target - Date.now()) / 1000);
          if (rem <= 0) {
            this.freezeRemaining.set(0);
            clearInterval(this.freezeInterval);
          } else {
            this.freezeRemaining.set(rem);
          }
        }, 100);
      } else {
        this.freezeRemaining.set(0);
        if (this.freezeInterval) clearInterval(this.freezeInterval);
      }
    });
  }

  selectCard(card: Math24Card) {
    if (this.freezeRemaining() > 0) return;
    if (!this.selectedCard) {
      this.selectedCard = card;
    } else if (this.selectedCard.id === card.id) {
      this.selectedCard = null; // deselect
    } else if (this.selectedOp) {
      // Record existing IDs before combine to identify the result card
      const prevIds = new Set(this.store.currentBoardCards().map(c => c.id));
      this.store.combineCards(this.selectedCard, card, this.selectedOp);
      this.selectedOp = null;

      // Auto-select the result card so the next operation can start immediately
      const newCards = this.store.currentBoardCards();
      if (newCards.length > 1) {
        this.selectedCard = newCards.find(c => !prevIds.has(c.id)) ?? null;
      } else {
        this.selectedCard = null; // final card — win or reset
      }
    } else {
      // change selection
      this.selectedCard = card;
    }
  }

  selectOp(op: Operator) {
    if (this.freezeRemaining() > 0) return;
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
    this.store.reset();
    this.selectedCard = null;
    this.selectedOp = null;
  }

  applyHint() {
    const cards = this.store.currentBoardCards();
    const solution = Math24Solver.solve(cards);
    if (solution) {
      this.hintSolution.set(solution);
    } else {
      this.toastService.show(this.i18n.t('game.no_solution')() || 'No solution', 'error');
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
