import { Component, Input, inject, signal, HostListener } from "@angular/core";
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-game-handheld-score',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1 sm:gap-2 flex-1 justify-center min-w-0 select-none">
      <!-- 1. 当前得分 (SCORE) -->
      <div class="flex flex-col items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/25 min-w-[46px] xs:min-w-[54px] sm:min-w-[70px] shadow-2xs shrink-0"
           [title]="(t('game.score')() || '得分') + ': ' + (score | number:'1.0-0')">
        <span class="text-[8px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none">
          {{ scoreLabel || t('game.score')() || 'SCORE' }}
        </span>
        <span class="font-mono font-black text-xs sm:text-base text-amber-500 leading-tight mt-0.5 tabular-nums">
          {{ score | number:'1.0-0' }}
        </span>
      </div>

      <!-- 2. 中间自定义插槽 (如重开笑脸、主题切换、消行计数、连击等) -->
      <ng-content></ng-content>

      <!-- 3. 个人最佳 (MY BEST / 个人最高 👑) -->
      <div class="flex flex-col items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-[var(--color-bg-sub)]/80 hover:bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] min-w-[50px] xs:min-w-[58px] sm:min-w-[74px] shadow-2xs shrink-0"
           [title]="(t('game.my_best')() || '个人最佳') + ': ' + (displayPersonalBest | number:'1.0-0')">
        <span class="text-[8px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-none flex items-center gap-0.5">
          <span class="text-[9px] sm:text-[11px]">👑</span>
          <span class="truncate">{{ myBestLabel || t('game.my_best')() || '个人' }}</span>
        </span>
        <span class="font-mono font-black text-xs sm:text-base text-[var(--color-text-main)] leading-tight mt-0.5 tabular-nums">
          {{ displayPersonalBest | number:'1.0-0' }}
        </span>
      </div>

      <!-- 4. 全网最高纪录 (WORLD RECORD / 全网纪录 🏆) -->
      @if (showWorldRecord) {
        <div class="relative group cursor-pointer shrink-0 wr-popover-container"
             (click)="toggleHolderPopover($event)"
             [title]="holderTooltip">
          <div class="flex flex-col items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 hover:from-orange-500/25 hover:to-amber-500/20 border border-orange-500/35 min-w-[50px] xs:min-w-[58px] sm:min-w-[74px] shadow-2xs transition-all active:scale-95">
            <span class="text-[8px] sm:text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider leading-none flex items-center gap-0.5">
              <span class="text-[9px] sm:text-[11px]">🏆</span>
              <span class="truncate">{{ worldBestLabel || t('game.world_best')() || '全网' }}</span>
            </span>
            <span class="font-mono font-black text-xs sm:text-base text-orange-600 dark:text-orange-300 leading-tight mt-0.5 tabular-nums">
              {{ displayWorldRecord | number:'1.0-0' }}
            </span>
          </div>

          <!-- 轻触/悬浮气泡：展示全网纪录保持者 -->
          @if (showHolder()) {
            <div class="fixed sm:absolute z-[100] left-1/2 -translate-x-1/2 top-14 sm:top-full sm:mt-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-orange-500/40 shadow-2xl text-[11px] whitespace-nowrap backdrop-blur-xl text-[var(--color-text-main)] flex items-center gap-1.5 pointer-events-auto"
                 (click)="$event.stopPropagation()">
              <span class="text-amber-500 text-sm">🏆</span>
              <span class="text-[var(--color-text-muted)]">{{ t('game.record_holder')() || '纪录保持者' }}:</span>
              <span class="font-black text-orange-500">{{ worldRecordHolder || t('game.unclaimed')() || '虚位以待' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class GameHandheldScoreComponent {
  private i18n = inject(I18nService);

  @Input() score = 0;
  @Input() bestScore = 0;
  @Input() worldBestScore: number | null | undefined = null;
  @Input() worldRecordHolder: string | null | undefined = null;
  @Input() scoreLabel = '';
  @Input() myBestLabel = '';
  @Input() worldBestLabel = '';
  @Input() showWorldRecord = true;

  showHolder = signal(false);

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  get displayPersonalBest(): number {
    return Math.max(this.score || 0, this.bestScore || 0);
  }

  get displayWorldRecord(): number {
    if (this.worldBestScore && this.worldBestScore > 0) {
      return Math.max(this.worldBestScore, this.displayPersonalBest);
    }
    return this.displayPersonalBest;
  }

  get holderTooltip(): string {
    const holder = this.worldRecordHolder || this.t('game.unclaimed')() || '虚位以待';
    return `${this.t('game.world_best')() || '全网纪录'}: ${this.displayWorldRecord} (${this.t('game.record_holder')() || '保持者'}: ${holder})`;
  }

  toggleHolderPopover(event: MouseEvent) {
    event.stopPropagation();
    this.showHolder.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showHolder()) {
      this.showHolder.set(false);
    }
  }
}

