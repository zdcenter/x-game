import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { inject } from '@angular/core';
import { TutorialStep } from '../../../core/config/game-definitions';

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible && steps.length > 0) {
      <!-- Full-screen backdrop -->
      <div class="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm" (click)="onSkip()"></div>

      <!-- Step card (centered) -->
      <div class="fixed inset-0 z-[401] flex items-center justify-center p-4 pointer-events-none">
        <div class="pointer-events-auto w-full max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border-card)]
                    rounded-2xl shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border-card)]">
            <div class="flex items-center gap-2">
              <span class="text-2xl">{{ currentStep().icon ?? '💡' }}</span>
              <h3 class="font-black text-[var(--color-text-main)]">
                {{ i18n.t(currentStep().title)() || currentStep().title }}
              </h3>
            </div>
            <span class="text-xs text-[var(--color-text-muted)] font-mono">
              {{ stepIdx() + 1 }}/{{ steps.length }}
            </span>
          </div>

          <!-- Body -->
          <div class="px-5 py-4">
            <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
              {{ i18n.t(currentStep().description)() || currentStep().description }}
            </p>
          </div>

          <!-- Step dots -->
          <div class="flex justify-center gap-1.5 pb-2">
            @for (s of steps; track $index) {
              <div class="w-1.5 h-1.5 rounded-full transition-all"
                   [class]="$index === stepIdx() ? 'bg-[var(--color-accent-from)] w-4' : 'bg-[var(--color-border-card)]'">
              </div>
            }
          </div>

          <!-- Footer buttons -->
          <div class="flex items-center justify-between px-5 pb-5 gap-3">
            <button (click)="onSkip()"
                    class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors px-2 py-1.5">
              {{ i18n.t('tutorial.skip')() }}
            </button>

            <div class="flex gap-2">
              @if (stepIdx() > 0) {
                <button (click)="prev()"
                        class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold
                               text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
                  {{ i18n.t('tutorial.prev')() }}
                </button>
              }
              <button (click)="next()"
                      class="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                             text-white text-sm font-bold shadow hover:shadow-lg hover:scale-105 active:scale-95 transition-all">
                {{ isLast() ? i18n.t('tutorial.finish')() : i18n.t('tutorial.next')() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class TutorialOverlayComponent {
  @Input() visible = false;
  @Input() steps: (TutorialStep & { icon?: string })[] = [];
  @Output() done = new EventEmitter<void>();

  i18n = inject(I18nService);

  stepIdx = signal(0);
  currentStep = computed(() => this.steps[this.stepIdx()] ?? this.steps[0]);
  isLast = computed(() => this.stepIdx() === this.steps.length - 1);

  next(): void {
    if (this.isLast()) {
      this.done.emit();
    } else {
      this.stepIdx.update(i => i + 1);
    }
  }

  prev(): void {
    this.stepIdx.update(i => Math.max(0, i - 1));
  }

  onSkip(): void {
    this.done.emit();
  }
}
