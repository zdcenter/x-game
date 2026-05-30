import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md transition-colors duration-500 p-4"
         [class.bg-slate-900/70]="status === 'win'"
         [class.bg-red-950/70]="status === 'lose'">
      
      <!-- Result Card -->
      <div class="relative w-full max-w-md bg-slate-900 border shadow-2xl rounded-3xl p-8 md:p-10 flex flex-col items-center animate-scale-in overflow-hidden"
           [class.border-yellow-500/50]="status === 'win'"
           [class.border-red-500/50]="status === 'lose'"
           [class.shadow-yellow-500/20]="status === 'win'"
           [class.shadow-red-500/20]="status === 'lose'">
           
        <!-- Background Glow -->
        <div class="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b opacity-20 pointer-events-none"
             [class.from-yellow-500]="status === 'win'"
             [class.to-transparent]="status === 'win'"
             [class.from-red-600]="status === 'lose'"
             [class.to-transparent]="status === 'lose'"></div>
             
        <!-- Main Title -->
        @if (status === 'win') {
          <h2 class="relative z-10 text-5xl md:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce mb-2">
            {{ title }}
          </h2>
        } @else {
          <h2 class="relative z-10 text-5xl md:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] mb-2">
            {{ title }}
          </h2>
        }

        <!-- Subtitle -->
        @if (subtitle) {
          <p class="relative z-10 mt-2 font-bold text-sm md:text-base mb-6 text-center"
             [class.text-yellow-400]="status === 'win'"
             [class.text-red-300]="status === 'lose'">
            {{ subtitle }}
          </p>
        }

        <!-- Stats Grid -->
        @if (stats && stats.length > 0) {
          <div class="relative z-10 flex flex-wrap justify-center gap-3 w-full mb-8 animate-scale-in" style="animation-delay: 0.2s">
            @for (stat of stats; track stat.label) {
              <div class="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border text-center flex-1 min-w-[100px] shadow-inner"
                   [class.border-yellow-500/30]="status === 'win'"
                   [class.border-red-500/30]="status === 'lose'">
                <div class="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{{ stat.label }}</div>
                <div class="text-xl md:text-2xl font-mono font-black"
                     [class.text-yellow-400]="status === 'win'"
                     [class.text-white]="status === 'lose'">
                  {{ stat.value }}
                </div>
              </div>
            }
          </div>
        }

        <!-- Prompt Text -->
        @if (promptText) {
          <p class="relative z-10 text-sm font-bold mb-6 text-slate-300 text-center">{{ promptText }}</p>
        }

        <!-- Action Buttons -->
        @if (showNextLevel || showRestart || showCancel || showDismiss || showLeave) {
          <div class="relative z-10 flex flex-col sm:flex-row w-full gap-3 justify-center">
            
            @if (showLeave) {
              <button (click)="leave.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors text-white border border-white/10">
                {{ i18n.t('game.leave')() }}
              </button>
            }

            @if (showCancel) {
              <button (click)="cancel.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors text-white border border-white/5">
                {{ i18n.t('game.cancel')() }}
              </button>
            }

            @if (showRestart) {
              <button (click)="restart.emit()" class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black rounded-xl shadow-lg hover:shadow-xl transform sm:hover:scale-105 transition-all">
                {{ i18n.t('game.restart')() }}
              </button>
            }

            @if (showDismiss) {
              <button (click)="dismiss.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/50 transition-colors">
                {{ i18n.t('game.dismiss_room')() || 'Dismiss Room' }}
              </button>
            }

            @if (showNextLevel) {
              <button (click)="nextLevel.emit()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg hover:shadow-xl transform sm:hover:scale-105 transition-all">
                {{ i18n.t('game.next_level')() }}
              </button>
            }
          </div>
        }
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
