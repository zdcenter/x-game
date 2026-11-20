import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractiveTutorialStep } from './interactive-tutorial.model';

@Component({
  selector: 'app-interactive-tutorial-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="stepInfo"
         class="w-full max-w-[500px] mb-2 p-3 sm:p-3.5 rounded-2xl bg-[var(--color-bg-card)] border-2 border-blue-500/30 dark:border-blue-400/30 shadow-[0_8px_24px_rgba(37,99,235,0.08)] flex flex-col gap-2 relative z-30 transition-all select-none">
      
      <!-- Top Row: Step Title & Dots & Skip -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-xs tracking-wide">
            {{ title || stepInfo.defaultTitle }}
          </span>
          <!-- Step Dots -->
          <div class="flex items-center gap-1.5">
            <span *ngFor="let s of dotList"
                  class="w-2.5 h-2.5 rounded-full transition-all"
                  [ngClass]="currentStep === s ? 'bg-blue-600 dark:bg-blue-400 scale-125 shadow-[0_0_8px_rgba(37,99,235,0.6)]' : (currentStep > s ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')">
            </span>
          </div>
        </div>

        <button (click)="skip.emit()"
                type="button"
                class="text-xs font-bold text-[var(--color-text-muted)] hover:text-rose-500 transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-rose-500/10">
          {{ skipText || '跳过教程' }} ›
        </button>
      </div>

      <!-- Formula Pill & Badge (Visual Rule) -->
      <div *ngIf="stepInfo.formula"
           class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 flex items-center justify-between gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
        <span class="font-mono text-xs sm:text-sm tracking-wide font-black truncate">{{ stepInfo.formula }}</span>
        <span *ngIf="stepInfo.formulaBadge"
              class="px-2 py-0.5 rounded-lg bg-blue-600/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 border border-blue-500/20">
          {{ stepInfo.formulaBadge }}
        </span>
      </div>

      <!-- The "Why" Clue Explanation -->
      <p class="text-xs sm:text-[13px] text-[var(--color-text-main)] font-medium leading-relaxed">
        {{ reasonText || stepInfo.defaultDesc }}
      </p>

      <!-- The "Action" Instruction -->
      <div class="px-2.5 py-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center gap-1.5">
        <span class="animate-bounce shrink-0">👉</span>
        <span class="leading-snug">{{ actionText || stepInfo.defaultAction }}</span>
      </div>
    </div>
  `
})
export class InteractiveTutorialBoardComponent {
  @Input() stepInfo: InteractiveTutorialStep | null = null;
  @Input() currentStep: number = 0;
  @Input() totalSteps: number = 4;
  @Input() title: string = '';
  @Input() reasonText: string = '';
  @Input() actionText: string = '';
  @Input() skipText: string = '';

  @Output() skip = new EventEmitter<void>();

  get dotList(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i);
  }
}
