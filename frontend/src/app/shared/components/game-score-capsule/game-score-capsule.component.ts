import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-game-score-capsule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap justify-between w-full max-w-full">
      <!-- 1. 当前局得分 (Current Score) -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl sm:rounded-2xl px-2 sm:px-3.5 py-1 sm:py-1.5 shadow-[inset_0_1px_2px_rgba(245,158,11,0.15)] transition-all min-w-0">
        <span class="text-base sm:text-2xl drop-shadow-sm select-none shrink-0">{{ scoreIcon }}</span>
        <div class="flex flex-col min-w-0">
          <span class="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none truncate">
            {{ scoreLabel || t('game.score')() }}
          </span>
          <span class="font-extrabold text-base sm:text-2xl tracking-tight text-[var(--color-text-main)] leading-none mt-0.5 truncate tabular-nums">
            {{ score | number:'1.0-0' }}
          </span>
        </div>
      </div>

      <!-- 中间自定义区域 (如 Combo、主题切换、移动步数等) -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 mx-auto">
        <ng-content></ng-content>
      </div>

      <!-- 右侧双胶囊组合：个人最高 + 全网最高 -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
        <!-- 2. 个人最佳 (Personal Best) -->
        <div class="flex items-center gap-1.5 sm:gap-2 bg-[var(--color-bg-card)]/80 hover:bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm transition-all group"
             [title]="(t('game.my_best')() || 'My Best') + ': ' + displayPersonalBest">
          <div class="flex flex-col text-right min-w-0">
            <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] leading-none truncate">
              {{ myBestLabel || t('game.my_best')() }}
            </span>
            <span class="font-extrabold text-xs sm:text-lg tracking-tight text-slate-700 dark:text-slate-200 leading-none mt-0.5 tabular-nums">
              {{ displayPersonalBest | number:'1.0-0' }}
            </span>
          </div>
          <span class="text-sm sm:text-lg select-none group-hover:scale-110 transition-transform">👑</span>
        </div>

        <!-- 3. 全网最高纪录 (World Record) -->
        @if (showWorldRecord) {
          <div class="relative group cursor-pointer"
               (click)="toggleHolderPopover()"
               [title]="holderTooltip">
            <div class="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm transition-all">
              <div class="flex flex-col text-right min-w-0">
                <div class="flex items-center justify-end gap-1">
                  <span class="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none truncate">
                    {{ worldBestLabel || t('game.world_best')() }}
                  </span>
                </div>
                <span class="font-extrabold text-xs sm:text-lg tracking-tight text-amber-600 dark:text-amber-300 leading-none mt-0.5 tabular-nums">
                  {{ (worldBestScore && worldBestScore > 0 ? worldBestScore : displayPersonalBest) | number:'1.0-0' }}
                </span>
              </div>
              <span class="text-sm sm:text-lg drop-shadow-sm select-none group-hover:rotate-12 transition-transform">🏆</span>
            </div>

            <!-- 纪录保持者悬浮提示气泡 (Popover) -->
            @if (showHolder() || isHovered()) {
              <div class="absolute right-0 top-full mt-1.5 z-50 px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xl text-[11px] whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none backdrop-blur-md">
                <div class="flex items-center gap-1.5">
                  <span class="text-amber-500">👑</span>
                  <span class="text-[var(--color-text-muted)]">{{ t('game.record_holder')() }}:</span>
                  <span class="font-bold text-[var(--color-text-main)]">{{ worldRecordHolder || t('game.unclaimed')() }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class GameScoreCapsuleComponent {
  private i18n = inject(I18nService);

  @Input() score = 0;
  @Input() bestScore = 0;
  @Input() worldBestScore: number | null | undefined = null;
  @Input() worldRecordHolder: string | null | undefined = null;
  @Input() scoreIcon = '⭐';
  @Input() scoreColorClass = 'text-amber-500 dark:text-amber-400';
  @Input() scoreLabel = '';
  @Input() myBestLabel = '';
  @Input() worldBestLabel = '';
  @Input() showWorldRecord = true;

  showHolder = signal(false);
  isHovered = signal(false);

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  get displayPersonalBest(): number {
    return Math.max(this.score, this.bestScore);
  }

  get holderTooltip(): string {
    const holder = this.worldRecordHolder || this.t('game.unclaimed')();
    return `${this.t('game.record_holder')()}: ${holder}`;
  }

  toggleHolderPopover() {
    this.showHolder.update(v => !v);
    if (this.showHolder()) {
      setTimeout(() => this.showHolder.set(false), 3000);
    }
  }
}
