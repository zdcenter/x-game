import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-tutorial-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
         [class.pointer-events-none]="!canInteract()">
      <div class="relative w-full max-w-sm p-6 rounded-3xl bg-[var(--color-bg-card)] border-2 border-emerald-500/40 shadow-2xl text-center flex flex-col items-center gap-4 animate-scale-in pointer-events-auto"
           (click)="$event.stopPropagation()">
        
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
          <button (click)="onPlayClick()"
                  type="button"
                  [disabled]="!canInteract()"
                  class="w-full py-3.5 rounded-2xl font-black text-sm sm:text-base bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-80">
            {{ playBtnText }}
          </button>
          <button (click)="onRetryClick()"
                  type="button"
                  [disabled]="!canInteract()"
                  class="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:border-blue-500/40 transition-all cursor-pointer active:scale-95 disabled:opacity-80">
            {{ retryBtnText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class InteractiveTutorialSuccessComponent implements OnInit {
  @Input() title: string = '🎉 恭喜完成新手教程！';
  @Input() desc: string = '你已掌握了核心推理技巧，现在开始正式挑战吧！';
  @Input() playBtnText: string = '🌟 开始正式挑战';
  @Input() retryBtnText: string = '🔄 再复习一遍';

  @Output() play = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly canInteract = signal<boolean>(false);

  ngOnInit(): void {
    // 🛡️ 400ms 防穿透/幽灵点击守卫 (Ghost Click Shield)
    // 防止用户在点击最后一个棋盘目标格时，触摸抬起或合成 click 事件穿透命中弹窗操作按钮导致弹窗瞬间消失
    setTimeout(() => {
      this.canInteract.set(true);
    }, 400);
  }

  onPlayClick(): void {
    if (!this.canInteract()) return;
    this.play.emit();
  }

  onRetryClick(): void {
    if (!this.canInteract()) return;
    this.retry.emit();
  }
}

