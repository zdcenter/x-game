import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdService } from '../../../core/services/ad.service';
import { CoinService } from '../../../core/services/coin.service';
import { SettingsService } from '../../../core/services/settings.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';

@Component({
  selector: 'app-hint-button',
  standalone: true,
  imports: [CommonModule, CoinIconComponent],
  template: `
    @if (layout === 'minesweeper') {
      <div class="flex flex-col items-center">
        <span class="text-[8px] lg:text-[10px] font-bold opacity-70 mb-0.5 lg:mb-1 uppercase tracking-widest"
              [class.text-amber-500]="hasCoinsForHint()"
              [class.text-orange-500]="!hasCoinsForHint()">
          {{ hintLabel() }}
        </span>
        <button (click)="onClick($event)"
          [disabled]="isAdLoading()"
          [title]="tooltipText()"
          class="px-2 lg:px-3 py-1 lg:py-2 rounded-lg lg:rounded-xl border text-[10px] lg:text-sm font-bold transition-all flex items-center justify-center gap-1 shadow-inner group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          [class.border-amber-500/40]="hasCoinsForHint()"
          [class.bg-amber-500/15]="hasCoinsForHint()"
          [class.text-amber-400]="hasCoinsForHint()"
          [class.border-orange-500/30]="!hasCoinsForHint()"
          [class.bg-orange-500/10]="!hasCoinsForHint()"
          [class.text-orange-500]="!hasCoinsForHint()">
          <ng-container *ngTemplateOutlet="iconTpl"></ng-container>
        </button>
      </div>
    }

    @if (layout === 'sudoku') {
      <button 
        (click)="onClick($event)"
        [disabled]="isAdLoading()"
        [title]="tooltipText()"
        class="w-full h-full flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 shadow-sm relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        [class.border-amber-500/40]="hasCoinsForHint()"
        [class.bg-amber-500/15]="hasCoinsForHint()"
        [class.text-amber-400]="hasCoinsForHint()"
        [class.border-orange-500/30]="!hasCoinsForHint()"
        [class.bg-orange-500/10]="!hasCoinsForHint()"
        [class.text-orange-500]="!hasCoinsForHint()">
        <div class="absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity"
             [class.from-amber-500/20]="hasCoinsForHint()"
             [class.from-orange-500/20]="!hasCoinsForHint()"></div>
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1', textClass: 'text-xl sm:text-2xl mb-1 drop-shadow-md' }"></ng-container>
        <span class="text-[10px] sm:text-xs font-bold leading-tight">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'math24') {
      <button class="px-3 sm:px-4 py-2 sm:py-3 border rounded-xl font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              [class.border-amber-500/40]="hasCoinsForHint()"
              [class.bg-amber-500/15]="hasCoinsForHint()"
              [class.text-amber-400]="hasCoinsForHint()"
              [class.border-orange-500/30]="!hasCoinsForHint()"
              [class.bg-orange-500/10]="!hasCoinsForHint()"
              [class.text-orange-400]="!hasCoinsForHint()"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-4 w-4 sm:h-5 sm:w-5' }"></ng-container>
        <span class="text-sm sm:text-base">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'icon') {
      <button class="p-2 sm:p-2.5 border rounded-xl transition-all flex items-center justify-center shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              [class.border-amber-500/40]="hasCoinsForHint()"
              [class.bg-amber-500/15]="hasCoinsForHint()"
              [class.text-amber-400]="hasCoinsForHint()"
              [class.border-orange-500/30]="!hasCoinsForHint()"
              [class.bg-orange-500/10]="!hasCoinsForHint()"
              [class.text-orange-400]="!hasCoinsForHint()"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5', textClass: 'text-xl' }"></ng-container>
      </button>
    }

    @if (layout === 'compact') {
      <button class="px-2 sm:px-2.5 py-1 sm:py-1.5 border rounded-lg font-bold transition-all flex items-center justify-center gap-1 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              [class.border-amber-500/40]="hasCoinsForHint()"
              [class.bg-amber-500/15]="hasCoinsForHint()"
              [class.text-amber-400]="hasCoinsForHint()"
              [class.border-orange-500/30]="!hasCoinsForHint()"
              [class.bg-orange-500/10]="!hasCoinsForHint()"
              [class.text-orange-400]="!hasCoinsForHint()"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="text-xs sm:text-sm">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'text') {
      <button class="text-xs sm:text-sm font-bold text-[var(--color-text-muted)] hover:text-amber-500 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-3 w-3 sm:h-4 sm:w-4' }"></ng-container>
        <span class="underline decoration-dashed underline-offset-2 opacity-70 group-hover:opacity-100">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'sokoban') {
      <button class="flex flex-col items-center justify-center w-full h-full px-1 py-2 rounded-xl font-bold shadow-lg transition-all backdrop-blur-sm active:scale-95 text-[10px] sm:text-xs border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              [class.border-amber-500/40]="hasCoinsForHint()"
              [class.bg-amber-500/15]="hasCoinsForHint()"
              [class.text-amber-400]="hasCoinsForHint()"
              [class.border-orange-500/30]="!hasCoinsForHint()"
              [class.bg-orange-500/10]="!hasCoinsForHint()"
              [class.text-orange-400]="!hasCoinsForHint()"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1' }"></ng-container>
        <span class="truncate w-full text-center">{{ hintLabel() }}</span>
      </button>
    }

    @if (layout === 'toolbar-compact') {
      <button class="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl font-bold transition-all bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] active:scale-95 text-[10px] sm:text-xs border border-[var(--color-border-card)] text-[var(--color-text-main)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              [disabled]="isAdLoading()"
              [title]="tooltipText()"
              (click)="onClick($event)">
        <ng-container *ngTemplateOutlet="iconTpl; context: { sizeClass: 'h-5 w-5 sm:h-6 sm:w-6 mb-1 text-amber-500', textClass: 'text-xl sm:text-xl drop-shadow-md' }"></ng-container>
        <span class="w-full text-center tracking-tighter whitespace-nowrap overflow-visible text-[8px] min-[380px]:text-[10px] sm:text-xs">{{ hintLabel() }}</span>
      </button>
    }

    <ng-template #iconTpl let-sizeClass="sizeClass" let-textClass="textClass">
      @if (isAdLoading()) {
        <svg class="animate-spin text-amber-500 {{ sizeClass || 'h-4 w-4 lg:h-5 lg:w-5' }}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      } @else {
        <span class="group-hover:scale-110 transition-transform relative inline-flex items-center justify-center {{ textClass || '' }}">
          💡
          @if (hasCoinsForHint()) {
            <span class="absolute -top-1 -right-2">
              <app-coin-icon size="xs" />
            </span>
          }
        </span>
      }
    </ng-template>
  `
})
export class HintButtonComponent {
  @Input() layout: 'math24' | 'sudoku' | 'minesweeper' | 'icon' | 'text' | 'compact' | 'sokoban' | 'toolbar-compact' = 'math24';
  @Output() hintApplied = new EventEmitter<void>();

  protected i18n = inject(I18nService);
  private adService = inject(AdService);
  private coinService = inject(CoinService);
  private settingsService = inject(SettingsService);
  isAdLoading = signal(false);

  readonly costHint = computed(() => this.settingsService.coinEconomy().costHint);
  readonly hasCoinsForHint = computed(() => this.coinService.canAfford(this.costHint()));

  readonly hintLabel = computed(() => {
    if (this.hasCoinsForHint()) {
      return (this.i18n.t('game.hint_title')() || '提示') + ` (-${this.costHint()})`;
    }
    return this.i18n.t('game.hint_ad_btn')();
  });

  readonly tooltipText = computed(() => {
    if (this.hasCoinsForHint()) {
      return this.i18n.t('game.coins_consume_hint', { coins: this.costHint() })();
    }
    return this.i18n.t('game.hint_ad_btn')();
  });

  onClick(event: MouseEvent) {
    if (this.isAdLoading()) return;

    // 优先：若有足够金币 (>= 20)，直接扣除金币秒出提示，跳过广告！
    if (this.hasCoinsForHint()) {
      this.isAdLoading.set(true);
      this.coinService.consumeCoins('hint', event).subscribe({
        next: () => {
          this.isAdLoading.set(false);
          this.hintApplied.emit();
        },
        error: () => {
          this.isAdLoading.set(false);
          this.showAdFallback();
        }
      });
      return;
    }

    // 次选：金币不足或未登录，观看激励视频广告获取提示
    this.showAdFallback();
  }

  private showAdFallback() {
    this.isAdLoading.set(true);
    this.adService.showRewardedAd(() => {
      this.isAdLoading.set(false);
      this.hintApplied.emit();
    }, () => {
      this.isAdLoading.set(false);
    });
  }
}
