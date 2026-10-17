import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-game-starting-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md select-none overflow-hidden animate-fade-in">
      
      <!-- Ambient Radial Energy Glow -->
      <div class="absolute w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-violet-600/20 blur-3xl pointer-events-none animate-pulse"></div>

      <!-- Center Countdown Arc Arena -->
      <div class="relative flex flex-col items-center justify-center p-8">
        
        <!-- Rotating Outer Cyber Ring -->
        <div class="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-dashed border-amber-400/30 animate-[spin_10s_linear_infinite] pointer-events-none"></div>
        <div class="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-sky-400/30 animate-[spin_6s_linear_infinite_reverse] pointer-events-none"></div>

        <!-- Shockwave Pulse on tick -->
        @if (pulseTrigger()) {
          <div class="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-amber-400/80 animate-ping pointer-events-none"></div>
        }

        <!-- Center Core: Number or GO! -->
        <div class="relative z-10 flex flex-col items-center justify-center">
          @if (isGoState) {
            <!-- BATTLE! / GO! Badge -->
            <div class="flex flex-col items-center animate-scale-up">
              <div class="flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 border border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.6)]">
                <span class="text-3xl sm:text-4xl animate-bounce">⚔️</span>
                <span class="text-3xl sm:text-5xl font-black text-white italic tracking-wider drop-shadow-md">
                  {{ i18n.t('game.battle_go')() }}
                </span>
              </div>
              <span class="text-xs sm:text-sm text-amber-200/90 font-bold uppercase tracking-[0.3em] mt-3">
                READY • SET • GO
              </span>
            </div>
          } @else {
            <!-- Countdown Number: 3, 2, 1 -->
            <div class="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-slate-900/80 border-2 border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.35)] backdrop-blur-xl">
              <!-- Giant Impact Number -->
              <span class="font-black font-mono text-7xl sm:text-8xl tabular-nums bg-gradient-to-b from-white via-amber-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-number-pop">
                {{ countdownDisplay }}
              </span>
            </div>

            <!-- Ready Subtitle -->
            <div class="flex items-center gap-2 mt-4 px-4 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
              <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span class="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-[0.25em]">
                {{ i18n.t('game.ready')() }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes number-pop {
      0% {
        transform: scale(1.6);
        opacity: 0.2;
      }
      50% {
        transform: scale(0.92);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-number-pop {
      animation: number-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes scale-up {
      0% {
        transform: scale(0.4);
        opacity: 0;
      }
      70% {
        transform: scale(1.15);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-scale-up {
      animation: scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `]
})
export class GameStartingOverlayComponent implements OnChanges {
  i18n = inject(I18nService);
  private audio = inject(AudioService);

  @Input({ required: true }) countdown!: string | number;

  pulseTrigger = signal(false);
  private lastSoundCountdown: any = null;

  get countdownDisplay(): string {
    return String(this.countdown || '');
  }

  get isGoState(): boolean {
    const val = String(this.countdown).trim().toLowerCase();
    return val === '0' || val === 'go' || val === 'start' || val === 'battle';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countdown'] && this.countdown !== undefined) {
      if (this.countdown !== this.lastSoundCountdown) {
        this.lastSoundCountdown = this.countdown;
        
        // Trigger visual shockwave
        this.pulseTrigger.set(false);
        setTimeout(() => this.pulseTrigger.set(true), 10);

        // Sound feedback
        if (this.isGoState) {
          this.audio.playCountdownGo();
        } else {
          this.audio.playCountdown();
        }
      }
    }
  }
}
