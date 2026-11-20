import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-tutorial-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="relative w-full max-w-sm p-6 rounded-3xl bg-[var(--color-bg-card)] border-2 border-emerald-500/40 shadow-2xl text-center flex flex-col items-center gap-4 animate-scale-in">
        
        <!-- Celebration Icon with Glow -->
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-3xl shadow-[0_0_24px_rgba(16,185,129,0.5)] animate-bounce">
          🎉
        </div>

        <div class="flex flex-col gap-1.5">
          <h3 class="text-xl sm:text-2xl font-black text-[var(--color-text-main)]">
            {{ title }}
          </h3>
          <p class="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
            {{ desc }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="w-full flex flex-col gap-2.5 mt-2">
          <button (click)="play.emit()"
                  type="button"
                  class="w-full py-3.5 rounded-2xl font-black text-sm sm:text-base bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">
            {{ playBtnText }}
          </button>
          <button (click)="retry.emit()"
                  type="button"
                  class="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:border-blue-500/40 transition-all cursor-pointer active:scale-95">
            {{ retryBtnText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class InteractiveTutorialSuccessComponent {
  @Input() title: string = '🎉 恭喜完成新手教程！';
  @Input() desc: string = '你已掌握了核心推理技巧，现在开始正式挑战吧！';
  @Input() playBtnText: string = '🌟 开始正式挑战';
  @Input() retryBtnText: string = '🔄 再复习一遍';

  @Output() play = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
}
