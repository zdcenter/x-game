import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdService } from '../../../core/services/ad.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-hint-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (layout === 'minesweeper') {
      <div class="flex flex-col items-center">
        <span class="text-[8px] lg:text-[10px] font-bold opacity-70 mb-0.5 lg:mb-1 uppercase tracking-widest text-orange-500">{{ i18n.t('game.hint_ad')() }}</span>
        <button (click)="onClick()"
          [disabled]="isAdLoading()"
          class="px-2 lg:px-3 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-orange-500/30 text-[10px] lg:text-sm font-bold bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-1 shadow-inner group disabled:opacity-50 disabled:cursor-not-allowed">
          <ng-container *ngTemplateOutlet="iconTpl"></ng-container>
        </button>
      </div>
    }

    @if (layout === 'sudoku') {
      <button 
        (click)="onClick()"
        [disabled]="isAdLoading()"
        class="w-full h-full flex flex-col items-center justify-center p-1.5 sm:p-2 bg-orange-500/10 rounded-xl border border-orange-500/30 hover:bg-orange-500/20 transition-colors active:scale-95 text-orange-500 shadow-sm relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed">
        <div class="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1', textClass: 'text-xl sm:text-2xl mb-1 drop-shadow-md' }"></ng-container>
        <span class="text-[10px] sm:text-xs font-bold leading-tight">{{ i18n.t('game.hint_ad')() }}</span>
      </button>
    }

    @if (layout === 'math24') {
      <button class="px-3 sm:px-4 py-2 sm:py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isAdLoading()"
              (click)="onClick()">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-4 w-4 sm:h-5 sm:w-5' }"></ng-container>
        <span class="text-sm sm:text-base">{{ i18n.t('game.hint_ad')() }}</span>
      </button>
    }

    @if (layout === 'icon') {
      <button class="p-2 sm:p-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl transition-all flex items-center justify-center shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed group"
              [disabled]="isAdLoading()"
              title="Hint"
              (click)="onClick()">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5', textClass: 'text-xl' }"></ng-container>
      </button>
    }

    @if (layout === 'compact') {
      <button class="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isAdLoading()"
              (click)="onClick()">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="text-xs sm:text-sm">{{ i18n.t('game.hint_ad')() }}</span>
      </button>
    }

    @if (layout === 'text') {
      <button class="text-xs sm:text-sm font-bold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed group"
              [disabled]="isAdLoading()"
              (click)="onClick()">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="underline decoration-dashed underline-offset-2 opacity-70 group-hover:opacity-100">{{ i18n.t('game.hint_ad')() }}</span>
      </button>
    }

    @if (layout === 'sokoban') {
      <button class="flex flex-col items-center justify-center w-full h-full px-1 py-2 rounded-xl font-bold text-orange-400 shadow-lg transition-all bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-sm active:scale-95 text-[10px] sm:text-xs border border-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isAdLoading()"
              (click)="onClick()">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1 text-orange-500' }"></ng-container>
        <span class="truncate w-full text-center">{{ i18n.t('game.hint_ad')() }}</span>
      </button>
    }

    <ng-template #iconTpl let-sizeClass="sizeClass" let-textClass="textClass">
      @if (isAdLoading()) {
        <svg class="animate-spin text-orange-500 {{ sizeClass || 'h-4 w-4 lg:h-5 lg:w-5' }}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      } @else {
        <span class="group-hover:scale-110 transition-transform {{ textClass || '' }}">💡</span>
      }
    </ng-template>
  `
})
export class HintButtonComponent {
  @Input() layout: 'math24' | 'sudoku' | 'minesweeper' | 'icon' | 'text' | 'compact' | 'sokoban' = 'math24';
  @Output() hintApplied = new EventEmitter<void>();

  protected i18n = inject(I18nService);
  private adService = inject(AdService);
  isAdLoading = signal(false);

  onClick() {
    if (this.isAdLoading()) return;
    this.isAdLoading.set(true);
    this.adService.showRewardedAd(() => {
      this.isAdLoading.set(false);
      this.hintApplied.emit();
    }, () => {
      this.isAdLoading.set(false);
    });
  }
}
