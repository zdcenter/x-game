import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-tutorial-pointer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Hand pointer: ALWAYS mathematically centered on this cell! -->
    <div class="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none drop-shadow-md text-base sm:text-lg animate-bounce"
         [ngClass]="direction === 'up' ? 'top-full mt-0.5' : 'bottom-full mb-0.5'">
      {{ direction === 'up' ? '👆' : '👇' }}
    </div>

    <!-- Refined Action Micro-Pill (Clean white in light mode, deep slate in dark mode) -->
    <div class="absolute pointer-events-none z-50 whitespace-nowrap animate-fade-in"
         [ngClass]="[
           direction === 'up' ? 'top-full mt-6' : 'bottom-full mb-6',
           align === 'left' ? 'left-0' : (align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2')
         ]">
      <div class="px-2.5 py-0.5 sm:py-1 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-blue-500/50 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-black shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-1 backdrop-blur-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
        <span>{{ text }}</span>
      </div>
    </div>
  `
})
export class InteractiveTutorialPointerComponent {
  @Input() text: string = '';
  @Input() direction: 'up' | 'down' = 'down';
  @Input() align: 'left' | 'center' | 'right' = 'center';
}
