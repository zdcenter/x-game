import { Component, EventEmitter, Input, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-hint-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (layout === 'minesweeper') {
      <div class="flex flex-col items-center">
        <span class="text-[8px] lg:text-[10px] font-bold opacity-70 mb-0.5 lg:mb-1 uppercase tracking-widest text-amber-500">
          {{ hintLabel() }}
        </span>
        <button (click)="onClick($event)"
          [title]="tooltipText()"
          class="px-2 lg:px-3 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] text-[10px] lg:text-sm font-bold transition-all flex items-center justify-center gap-1 shadow-inner group active:scale-95 cursor-pointer">
          <ng-container *ngTemplateOutlet="iconTpl"></ng-container>
        </button>
      </div>
    }

    @if (layout === 'sudoku' || layout === 'toolbar-compact') {
      <button 
        (click)="onClick($event)"
        [title]="tooltipText()"
        class="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl font-bold transition-all bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] active:scale-95 text-[10px] sm:text-xs border border-[var(--color-border-card)] text-[var(--color-text-main)] shadow-sm relative overflow-hidden group cursor-pointer">
        <div class="absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity from-amber-500/10 pointer-events-none"></div>
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1 text-amber-500', textClass: 'text-lg sm:text-xl drop-shadow-md' }"></ng-container>
        <span class="w-full text-center tracking-tighter whitespace-nowrap overflow-visible text-[8px] min-[380px]:text-[10px] sm:text-xs leading-none">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'math24') {
      <button class="px-3 sm:px-4 py-2 sm:py-3 border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-sm shrink-0 active:scale-95 cursor-pointer group"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-4 w-4 sm:h-5 sm:w-5' }"></ng-container>
        <span class="text-sm sm:text-base">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'icon') {
      <button class="p-2 sm:p-2.5 border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] rounded-xl transition-all flex items-center justify-center shadow-sm shrink-0 group active:scale-95 cursor-pointer"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5', textClass: 'text-xl' }"></ng-container>
      </button>
    }

    @if (layout === 'compact') {
      <button class="px-2 sm:px-2.5 py-1 sm:py-1.5 border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] rounded-lg font-bold transition-all flex items-center justify-center gap-1 shadow-sm shrink-0 active:scale-95 cursor-pointer group"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="text-xs sm:text-sm">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'text') {
      <button class="text-xs sm:text-sm font-bold text-[var(--color-text-muted)] hover:text-amber-500 transition-colors flex items-center gap-1 group cursor-pointer"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="underline decoration-dashed underline-offset-2 opacity-70 group-hover:opacity-100">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'sokoban') {
      <button class="flex flex-col items-center justify-center w-full h-full px-1 py-2 rounded-xl font-bold shadow-lg transition-all backdrop-blur-sm active:scale-95 text-[10px] sm:text-xs border border-[var(--color-border-card)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] text-[var(--color-text-main)] cursor-pointer group"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1' }"></ng-container>
        <span class="truncate w-full text-center">{{ hintLabel() }}</span>
      </button>
    }

    <ng-template #iconTpl let-sizeClass="sizeClass" let-textClass="textClass">
      <span class="group-hover:scale-110 transition-transform relative inline-flex items-center justify-center {{ textClass || '' }}">
        💡
      </span>
    </ng-template>
  `
})
export class HintButtonComponent {
  @Input() layout: 'math24' | 'sudoku' | 'minesweeper' | 'icon' | 'text' | 'compact' | 'sokoban' | 'toolbar-compact' = 'toolbar-compact';
  @Output() hintApplied = new EventEmitter<void>();

  protected i18n = inject(I18nService);

  readonly hintLabel = computed(() => this.i18n.t('game.hint')());
  readonly tooltipText = computed(() => this.i18n.t('game.hint')());

  onClick(event: MouseEvent) {
    this.hintApplied.emit();
  }
}
