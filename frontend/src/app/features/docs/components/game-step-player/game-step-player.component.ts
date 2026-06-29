import { Component, Input, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../../core/i18n/i18n.service';

export interface DemoCell {
  text?: string;
  icon?: string; // e.g. emoji
  classes?: string; // Custom Tailwind classes for the cell (e.g. background color)
  isHighlight?: boolean; // If true, applies a glowing/highlight effect
}

export interface DemoStep {
  descriptionEn: string;
  descriptionZh: string;
  board: DemoCell[][];
}

export interface DemoConfig {
  gameId: string;
  titleEn: string;
  titleZh: string;
  steps: DemoStep[];
}

@Component({
  selector: 'app-game-step-player',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (config) {
      <div class="bg-[var(--color-bg-card)]/60 backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl p-6 flex flex-col xl:flex-row gap-8 items-center xl:items-start my-8 shadow-2xl transition-all duration-500 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        
        <!-- Left Side: Interactive Board Display -->
        <div class="flex-none bg-[var(--color-bg-main)] p-4 rounded-xl border border-[var(--color-border-card)] shadow-inner relative overflow-hidden group">
          
          <!-- Glossy reflection effect -->
          <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl"></div>
          
          <div class="flex flex-col gap-1.5 relative z-10">
            @for (row of currentBoard(); track $index) {
              <div class="flex gap-1.5 justify-center">
                @for (cell of row; track $index) {
                  <!-- Cell -->
                  <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center font-bold text-xl sm:text-2xl select-none transition-all duration-500 transform shadow-sm"
                       [class]="cell.classes || 'bg-[var(--color-border-card)] text-[var(--color-text-main)]'"
                       [class.ring-2]="cell.isHighlight"
                       [class.ring-[var(--color-accent-from)]]="cell.isHighlight"
                       [class.ring-offset-2]="cell.isHighlight"
                       [class.ring-offset-[var(--color-bg-main)]]="cell.isHighlight"
                       [class.scale-105]="cell.isHighlight"
                       [class.z-10]="cell.isHighlight">
                    @if (cell.icon) { <span>{{ cell.icon }}</span> }
                    @if (cell.text) { <span>{{ cell.text }}</span> }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Right Side: Explanations and Stepper -->
        <div class="flex-1 w-full space-y-5 flex flex-col justify-between min-h-[220px]">
          <div>
            <div class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-from)] bg-[var(--color-accent-from)]/10 border border-[var(--color-accent-from)]/20 rounded-full mb-3">
              Interactive Guide
            </div>
            <h3 class="text-2xl font-bold text-transparent bg-clip-text m-0" style="background-image: linear-gradient(to right, var(--color-text-primary), var(--color-text-secondary))">
              {{ isZh() ? config.titleZh : config.titleEn }}
            </h3>
            
            <div class="mt-4 p-4 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]/50 shadow-inner h-[160px] overflow-y-auto flex items-start">
              <p class="text-[var(--color-text-main)] text-base sm:text-lg leading-relaxed m-0 animate-fade-in transition-all duration-300">
                {{ isZh() ? currentStep().descriptionZh : currentStep().descriptionEn }}
              </p>
            </div>
          </div>
          
          <!-- Stepper Controls -->
          <div class="flex items-center justify-between pt-4 border-t border-[var(--color-border-card)]">
            <button (click)="prev()" [disabled]="currentIndex() === 0"
                    class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:bg-[var(--color-border-card)] hover:text-[var(--color-accent-from)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <div class="flex gap-2">
              @for (step of config.steps; track $index) {
                <div class="w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer"
                     (click)="setStep($index)"
                     [class.bg-[var(--color-accent-from)]]="currentIndex() === $index"
                     [class.scale-125]="currentIndex() === $index"
                     [class.bg-[var(--color-border-card)]]="currentIndex() !== $index"
                     [class.hover:bg-[var(--color-text-muted)]]="currentIndex() !== $index">
                </div>
              }
            </div>
            
            <button (click)="next()" [disabled]="currentIndex() === config.steps.length - 1"
                    class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:bg-[var(--color-border-card)] hover:text-[var(--color-accent-from)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
  `]
})
export class GameStepPlayerComponent {
  private _config = signal<DemoConfig | null>(null);

  @Input() set config(val: DemoConfig) {
    this._config.set(val);
    this.currentIndex.set(0); // Reset index when switching games
  }
  
  get config(): DemoConfig {
    return this._config()!;
  }
  
  i18n = inject(I18nService);
  currentIndex = signal(0);
  
  isZh = computed(() => this.i18n.currentLang() === 'zh');
  currentStep = computed(() => this._config()!.steps[this.currentIndex()]);
  currentBoard = computed(() => this.currentStep().board);

  next() {
    if (this.currentIndex() < this.config.steps.length - 1) {
      this.currentIndex.set(this.currentIndex() + 1);
    }
  }

  prev() {
    if (this.currentIndex() > 0) {
      this.currentIndex.set(this.currentIndex() - 1);
    }
  }
  
  setStep(index: number) {
    if (index >= 0 && index < this.config.steps.length) {
      this.currentIndex.set(index);
    }
  }
}
