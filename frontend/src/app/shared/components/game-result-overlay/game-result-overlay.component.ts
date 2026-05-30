import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-sm transition-colors duration-1000"
         [class.bg-slate-900/90]="status === 'win'"
         [class.bg-red-950/90]="status === 'lose'">
      
      <!-- Main Title -->
      @if (status === 'win') {
        <h2 class="text-5xl lg:text-7xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 animate-gold-shine drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] transform animate-bounce">
          {{ title }}
        </h2>
      } @else {
        <h2 class="text-5xl lg:text-7xl font-black uppercase tracking-widest animate-red-shine drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
          {{ title }}
        </h2>
      }

      <!-- Subtitle (if any) -->
      @if (subtitle) {
        <p class="mt-4 font-bold text-lg animate-pulse mb-6"
           [class.text-yellow-400]="status === 'win'"
           [class.text-red-300]="status === 'lose'">
          {{ subtitle }}
        </p>
      }

      <!-- Stats Grid -->
      @if (stats && stats.length > 0) {
        <div class="flex flex-wrap justify-center gap-4 mb-6 animate-scale-in" style="animation-delay: 0.2s">
          @for (stat of stats; track stat.label) {
            <div class="bg-black/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center shadow-lg transform hover:scale-105 transition-transform"
                 [class.border-yellow-500/30]="status === 'win'"
                 [class.border-red-500/30]="status === 'lose'">
              <div class="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">{{ stat.label }}</div>
              <div class="text-xl sm:text-2xl font-mono font-black"
                   [class.text-yellow-400]="status === 'win'"
                   [class.text-white]="status === 'lose'">
                {{ stat.value }}
              </div>
            </div>
          }
        </div>
      }

      <!-- Action Panel (only if there are buttons to show) -->
      @if (showNextLevel || showRestart || showCancel || showDismiss || showLeave) {
        <div class="mt-8 flex gap-4 bg-[var(--color-bg-card)] p-6 rounded-2xl border shadow-2xl animate-scale-in"
             [class.border-yellow-500/30]="status === 'win'"
             [class.border-red-500/30]="status === 'lose'">
          
          <div class="flex flex-col items-center">
            @if (promptText) {
              <p class="text-xl font-bold mb-6 text-white">{{ promptText }}</p>
            }
            
            <div class="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              <!-- Leave / Back Button -->
              @if (showLeave) {
                <button (click)="leave.emit()" class="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/20">
                  {{ i18n.t('game.leave')() }}
                </button>
              }

              <!-- Cancel / Back Button -->
              @if (showCancel) {
                <button (click)="cancel.emit()" class="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 transition-colors text-white">
                  {{ i18n.t('game.cancel')() }}
                </button>
              }

              <!-- Restart Button -->
              @if (showRestart) {
                <button (click)="restart.emit()" class="w-full sm:w-auto px-6 py-3 sm:py-2 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-lg rounded-xl shadow-lg hover:shadow-xl transform sm:hover:scale-105 transition-all">
                  {{ i18n.t('game.restart')() }}
                </button>
              }

              <!-- Dismiss Room Button -->
              @if (showDismiss) {
                <button (click)="dismiss.emit()" class="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-xl font-bold bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/50 transition-colors">
                  {{ i18n.t('game.dismiss_room')() || 'Dismiss Room' }}
                </button>
              }

              <!-- Next Level Button -->
              @if (showNextLevel) {
                <button (click)="nextLevel.emit()" class="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-black sm:hover:scale-105 transition-transform shadow-lg shadow-yellow-500/20">
                  {{ i18n.t('game.next_level')() }}
                </button>
              }
            </div>
          </div>
        </div>
      }
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
