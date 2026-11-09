import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-game-status-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1.5 sm:gap-2 select-none" [class.text-xs]="!compact()" [class.text-[11px]]="compact()">
      <!-- ⏱️ Live Timer Pill -->
      @if (showTimer()) {
        <div class="flex items-center gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 h-7 sm:h-8 justify-center shadow-2xs">
          <span class="text-xs opacity-80 select-none">⏱️</span>
          <span class="font-digital font-mono text-cyan-500 font-bold text-xs sm:text-sm tracking-wider leading-none">
            {{ formattedTime() }}
          </span>
        </div>
      }

      <!-- 🏆/💡 Record Eligibility Status Badge -->
      @if (hintsUsed() === 0) {
        <!-- Eligible for Hall of Fame / Personal Best -->
        @if (!compact()) {
          <span class="inline-flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 sm:py-1 h-7 sm:h-8 rounded-lg shadow-2xs transition-all"
                [title]="eligibleTooltip()">
            <span class="text-xs">🏆</span>
            <span class="text-[11px] sm:text-xs tracking-tight">{{ eligibleLabel() }}</span>
          </span>
        }
      } @else {
        <!-- Assisted / Practice Mode (Used hints) -->
        <span class="inline-flex items-center gap-1 font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 h-7 sm:h-8 rounded-lg shadow-2xs transition-all"
              [title]="assistedTooltip()">
          <span class="text-xs">💡</span>
          <span class="text-[10px] sm:text-[11px] font-bold">{{ assistedLabel() }}</span>
        </span>
      }
    </div>
  `
})
export class GameStatusHudComponent {
  private i18n = inject(I18nService);

  readonly hintsUsed = input<number>(0);
  readonly timeSpent = input<number | undefined>(undefined);
  readonly timerText = input<string | undefined>(undefined);
  readonly showTimer = input<boolean>(true);
  readonly compact = input<boolean>(false);

  readonly formattedTime = computed(() => {
    const text = this.timerText();
    if (text) return text;
    const sec = this.timeSpent() ?? 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  readonly isZh = computed(() => this.i18n.currentLang() === 'zh');

  readonly eligibleLabel = computed(() => {
    return this.isZh() ? '冲榜有效' : 'Rank Eligible';
  });

  readonly eligibleTooltip = computed(() => {
    return this.isZh()
      ? '无提示自主解题，成绩有效计入个人最佳与全网极限纪录'
      : 'Solo solve without hints. Eligible for Personal Best and Hall of Fame records.';
  });

  readonly assistedLabel = computed(() => {
    if (this.compact()) {
      return this.isZh() ? '辅助中' : 'Assisted';
    }
    return this.isZh() ? '娱乐辅助 (不冲榜)' : 'Practice Mode';
  });

  readonly assistedTooltip = computed(() => {
    const count = this.hintsUsed();
    return this.isZh()
      ? `已使用提示辅助（${count}次），本局属于娱乐探索，不计入个人最佳与全网极限纪录`
      : `Used ${count} hint(s). In casual practice mode, not recorded for records.`;
  });
}
