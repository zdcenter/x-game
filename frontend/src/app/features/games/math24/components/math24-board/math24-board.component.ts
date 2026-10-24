import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store, Math24Card, Operator } from '../../store/math24.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { AdService } from '../../../../../core/services/ad.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Math24Solver } from '../../utils/math24-solver';
import { GameToolbarComponent } from '../../../../../shared/components/game-toolbar/game-toolbar.component';
import { GameMode } from '../../../../../core/models/game.model';

@Component({
  selector: 'app-math24-board',
  standalone: true,
  imports: [CommonModule, GameToolbarComponent],
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-[min(96vw,440px,calc(100dvh-180px))] sm:max-w-[460px] mx-auto h-full gap-2 sm:gap-3 py-1 select-none">
      
      <!-- Level Badge (Single Player only) -->
      @if (store.currentRoomMode() === GameMode.Single) {
        <div class="flex justify-center w-full px-2">
          <div class="px-4 py-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs text-xs sm:text-sm font-black text-blue-400">
            {{ i18n.t('game.level')() }} {{ store.localLevelIndex() + 1 }}
          </div>
        </div>
      }

      <!-- 3x3 Grid Board -->
      <div class="grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-4 w-full aspect-square relative select-none"
           [class.animate-shake]="store.isShaking()">
        
        <!-- Freeze Overlay -->
        @if (freezeRemaining() > 0) {
          <div class="absolute inset-0 z-50 bg-blue-900/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <span class="text-5xl sm:text-7xl animate-pulse drop-shadow-lg">❄️</span>
            <div class="mt-2 text-xl sm:text-2xl font-black text-white tracking-widest">{{ freezeRemaining() }}s</div>
            <div class="text-xs font-bold text-blue-200 mt-1 uppercase">{{ i18n.t('game.frozen')() }}</div>
          </div>
        }

        <!-- Hint Overlay -->
        @if (hintSolution()) {
          <div class="absolute inset-0 z-[60] bg-[var(--color-bg-card)]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.2)] animate-scale-in">
            <div class="text-4xl sm:text-5xl mb-3 animate-bounce drop-shadow-lg">💡</div>
            <div class="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">{{ i18n.t('game.hint_title')() }}</div>
            <div class="w-full max-w-[260px] bg-[var(--color-bg-main)] px-4 py-3 rounded-xl border border-[var(--color-border-card)] shadow-inner mb-4 flex flex-col gap-1.5">
              @for (step of hintSolution(); track $index) {
                <div class="text-lg sm:text-2xl font-black font-mono text-[var(--color-text-main)] text-center w-full whitespace-nowrap overflow-hidden text-ellipsis">
                  {{ step }}
                </div>
              }
            </div>
            <button class="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-md hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm w-full max-w-[180px]"
                    (click)="hintSolution.set(null)">
              {{ i18n.t('game.close')() }}
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
        <div class="w-full h-full flex items-center justify-center p-0.5 sm:p-1">
          <div class="w-full h-full rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]/50 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
            <span class="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--color-accent-from)] font-mono tracking-tight">24</span>
            <span class="text-[10px] sm:text-xs uppercase tracking-widest text-[var(--color-text-muted)] font-bold">Goal</span>
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
      <div class="h-9 sm:h-10 flex items-center justify-center px-4 sm:px-5 py-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)]/70 shadow-xs min-w-[120px] transition-all">
        @if (getPreviewText()) {
          <span class="text-base sm:text-lg font-mono text-blue-400 font-black animate-fade-in">
            {{ getPreviewText() }}
          </span>
        } @else {
          <span class="text-xs sm:text-sm text-[var(--color-text-muted)] font-medium">
            {{ i18n.t('game.math24_tap_hint')() || '点击卡片和符号' }}
          </span>
        }
      </div>

      <!-- Controls -->
      <div class="w-full mt-1 sm:mt-3">
        @if (store.currentRoomMode() === GameMode.Single) {
          <app-game-toolbar
            [layoutStyle]="'compact'"
            [showPrev]="true"
            [showNext]="true"
            [showRestart]="true"
            [showUndo]="true"
            [showHint]="true"
            [disablePrev]="store.localLevelIndex() <= 0"
            hintLayout="toolbar-compact"
            (prevLevel)="store.loadPrevLevel()"
            (nextLevel)="store.loadNextLevel()"
            (undo)="undo()"
            (restart)="reset()"
            (hintApplied)="applyHint()"
          ></app-game-toolbar>
        } @else {
          <!-- PK Mode: Clean Undo & Reset Actions -->
          <div class="flex items-center justify-center gap-3 w-full max-w-[280px] mx-auto">
            <button (click)="undo()"
                    [disabled]="store.currentBoardHistory().length <= 1"
                    class="flex-1 py-2 px-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer">
              <span>↩️</span>
              <span>{{ i18n.t('game.undo')() || '撤销' }}</span>
            </button>
            <button (click)="reset()"
                    [disabled]="store.currentBoardHistory().length <= 1"
                    class="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer">
              <span>🔄</span>
              <span>{{ i18n.t('game.reset')() || '重置' }}</span>
            </button>
          </div>
        }
      </div>

      <!-- Templates -->
      <ng-template #cardTpl let-card="card">
        <div *ngIf="card"
             class="w-full h-full bg-[var(--color-bg-card)] border-2 sm:border-3 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 select-none active:scale-95 hover:scale-[1.02]"
             [ngClass]="{
               'border-blue-500 bg-blue-500/15 ring-2 sm:ring-4 ring-blue-500/30 shadow-blue-500/40 -translate-y-0.5': selectedCard?.id === card.id,
               'border-[var(--color-border-card)] hover:border-[var(--color-border-thick)]': selectedCard?.id !== card.id
             }"
             (click)="selectCard(card)">
          <span class="font-black font-mono text-[var(--color-text-main)] tracking-tight"
                [ngClass]="getCardFontSize(card.value)">
            {{ card.value }}
          </span>
        </div>
      </ng-template>

      <ng-template #opTpl let-op="op">
        <div class="w-full h-full p-0.5 sm:p-1">
          <button class="w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center font-black transition-all duration-200 border-2 sm:border-3 shadow-xs active:scale-90 cursor-pointer"
                  [ngClass]="{
                    'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/40 scale-105 ring-2 ring-blue-400/50': selectedOp === op,
                    'bg-[var(--color-bg-main)] border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-thick)]': selectedOp !== op
                  }"
                  (click)="selectOp(op)">
            <span class="text-3xl sm:text-4xl md:text-5xl font-black leading-none">
              {{ op === '*' ? '×' : (op === '/' ? '÷' : op) }}
            </span>
          </button>
        </div>
      </ng-template>

    </div>
  `
})
export class Math24BoardComponent {
  GameMode = GameMode;
  store = inject(Math24Store);
  i18n = inject(I18nService);
  adService = inject(AdService);
  toastService = inject(ToastService);

  getCardFontSize(val: number): string {
    const num = Math.abs(val);
    if (num < 10) return 'text-5xl sm:text-6xl md:text-7xl';
    if (num < 100) return 'text-3xl sm:text-4xl md:text-5xl';
    return 'text-xl sm:text-2xl md:text-3xl';
  }

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
