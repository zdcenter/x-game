import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md transition-colors duration-500 p-4 bg-[var(--color-overlay)]">
      
      <!-- Result Card -->
      <div class="relative w-full max-w-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-2xl rounded-3xl p-8 md:p-10 flex flex-col items-center animate-scale-in overflow-hidden">
           
        <!-- Title -->
        <h2 class="text-5xl md:text-6xl font-black mb-2 relative z-10 text-center"
            [ngClass]="{
              'text-amber-500 drop-shadow-md': status === 'win',
              'text-red-500 drop-shadow-md': status === 'lose'
            }">
          {{ title }}
        </h2>
        
        <p class="text-[var(--color-text-muted)] text-sm md:text-base mb-8 relative z-10 font-medium">
          {{ subtitle }}
        </p>

        <!-- Stats Grid -->
        @if (stats && stats.length > 0) {
          <div class="w-full flex justify-center gap-4 mb-10 relative z-10 flex-wrap">
            @for (stat of stats; track stat.label) {
              <div class="bg-[var(--color-bg-card)] backdrop-blur-md px-5 py-3 rounded-2xl border border-[var(--color-border-card)] text-center flex-1 min-w-[100px] shadow-sm">
                <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">{{ stat.label }}</div>
                <div class="text-2xl font-black text-[var(--color-text-main)] font-mono">{{ stat.value }}</div>
              </div>
            }
          </div>
        }

        <!-- Actions -->
        <div class="w-full flex flex-col sm:flex-row gap-3 relative z-10">
          @if (showLeave) {
            <button (click)="leave.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:bg-[var(--color-border-card)] transition-colors">
              {{ i18n.t('game.leave')() || 'Leave' }}
            </button>
          }
          
          @if (showRestart) {
            <button (click)="restart.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
              {{ i18n.t('game.restart')() || 'Play Again' }}
            </button>
          }

          @if (showNextLevel) {
            <button (click)="nextLevel.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transform sm:hover:scale-105 transition-all">
              {{ i18n.t('game.next_level')() }}
            </button>
          }
        </div>
        
        <div class="w-full flex gap-3 mt-3 relative z-10">
            @if (showDismiss) {
              <button (click)="dismiss.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-colors">
                {{ i18n.t('game.dismiss_room')() || 'Dismiss Room' }}
              </button>
            }
        </div>
      </div>
    </div>
  `
})
export class GameResultOverlayComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  audio = inject(AudioService);

  @Input({ required: true }) status!: 'win' | 'lose';
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() promptText?: string;
  @Input() stats?: { label: string, value: string | number }[];

  @Input() showNextLevel = false;
  @Input() showRestart = false;
  @Input() showCancel = false;
  @Input() showDismiss = false;
  @Input() showLeave = false;

  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();

  private audioPlayed = false;

  ngOnInit() {
    this.playEffect();
  }

  // Play effect only once per component lifecycle to avoid double-playing
  private playEffect() {
    if (this.audioPlayed) return;
    this.audioPlayed = true;

    if (this.status === 'win') {
      this.audio.playWin();
    } else {
      this.audio.playLose();
    }
  }

  ngOnDestroy() {
    this.audioPlayed = false;
  }
}
