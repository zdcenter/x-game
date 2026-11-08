import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-timelapse-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-fade-in"
         (click)="close.emit()">
      <div class="relative w-full max-w-lg bg-[var(--color-bg-card)] border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(168,85,247,0.35)] flex flex-col gap-4 overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Ambient Cyber Line -->
        <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[var(--color-border-card)] pb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl animate-pulse">🎬</span>
            <div>
              <h3 class="text-sm sm:text-base font-black text-[var(--color-text-main)] flex items-center gap-1.5">
                <span>高光时刻 · 10秒极速时光倒流</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">REPLAY</span>
              </h3>
              <p class="text-[11px] text-[var(--color-text-muted)]">
                {{ gameTitle }} · {{ statSummary || '巅峰对局推导演示' }}
              </p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-xl font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Replay Stage / Screen -->
        <div class="relative w-full aspect-video rounded-2xl bg-slate-950 border border-purple-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden p-4 group">
          <!-- Top Watermark -->
          <div class="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono font-black text-white/50 tracking-wider">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>REC • PUZZLE PK</span>
          </div>

          <!-- Top Right Speed Pill -->
          <div class="absolute top-2 right-3 px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/50 text-[10px] font-mono font-black text-purple-300">
            {{ speed() }}x SPEED
          </div>

          <!-- Animated Replay Core Visualizer -->
          <div class="flex flex-col items-center justify-center gap-2 my-auto text-center z-10">
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-amber-900/30 border border-purple-400/50 flex items-center justify-center shadow-lg">
              <!-- Replay Step Number -->
              <span class="text-3xl sm:text-4xl font-black font-mono text-purple-300 tabular-nums">
                {{ currentStep() }}%
              </span>

              <!-- Corner Cyber Accents -->
              <div class="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-purple-400"></div>
              <div class="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-purple-400"></div>
              <div class="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-purple-400"></div>
              <div class="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-purple-400"></div>
            </div>

            <!-- Resolution Stamp when complete -->
            @if (currentStep() >= 100) {
              <div class="animate-scale-up px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg uppercase tracking-wider">
                🏆 PERFECT CLEAR!
              </div>
            } @else {
              <span class="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                <span class="animate-spin text-[10px]">⏳</span>
                <span>推导演进中...</span>
              </span>
            }
          </div>

          <!-- Bottom Timecode & Watermark -->
          <div class="absolute bottom-2 inset-x-3 flex items-center justify-between text-[10px] font-mono text-white/40">
            <span>00:{{ currentStep() < 10 ? '0' + currentStep() : currentStep() }} / 00:10</span>
            <span class="font-bold text-amber-400/80">puzzlepk.com</span>
          </div>

          <!-- Timeline Scrubber Bar -->
          <div class="absolute bottom-0 inset-x-0 h-1.5 bg-slate-800">
            <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-75"
                 [style.width.%]="currentStep()"></div>
          </div>
        </div>

        <!-- Playback Controls -->
        <div class="flex items-center justify-between gap-3 px-1">
          <!-- Play / Pause / Restart -->
          <div class="flex items-center gap-2">
            <button (click)="togglePlay()"
                    class="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer">
              <span>{{ isPlaying() ? '⏸️' : '▶️' }}</span>
              <span>{{ isPlaying() ? '暂停' : '播放' }}</span>
            </button>
            <button (click)="restartReplay()"
                    class="px-3 py-1.5 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer">
              <span>🔄</span>
              <span>重播</span>
            </button>
          </div>

          <!-- Speed Switcher -->
          <div class="flex items-center gap-1 bg-[var(--color-bg-main)] p-0.5 rounded-xl border border-[var(--color-border-card)]">
            @for (s of [2, 5, 10]; track s) {
              <button (click)="setSpeed(s)"
                      class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="speed() === s"
                      [class.text-white]="speed() === s"
                      [class.text-[var(--color-text-muted)]]="speed() !== s">
                {{ s }}x
              </button>
            }
          </div>
        </div>

        <!-- Social Video Recording Tip -->
        <div class="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-500/20 text-xs text-[var(--color-text-secondary)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base shrink-0">📱</span>
            <span class="leading-relaxed">
              支持直接手机录屏或截取本段 10 秒回放，分享至 B站/抖音/微信群，自带高光水印！
            </span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class TimelapseModalComponent implements OnInit, OnDestroy {
  @Input() gameTitle: string = '';
  @Input() statSummary: string = '';
  @Output() close = new EventEmitter<void>();

  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  currentStep = signal(0);
  isPlaying = signal(true);
  speed = signal(5);

  private timer: any = null;

  ngOnInit() {
    this.startPlayback();
  }

  ngOnDestroy() {
    this.stopPlayback();
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pausePlayback();
    } else {
      if (this.currentStep() >= 100) {
        this.currentStep.set(0);
      }
      this.startPlayback();
    }
  }

  restartReplay() {
    this.stopPlayback();
    this.currentStep.set(0);
    this.startPlayback();
  }

  setSpeed(s: number) {
    this.speed.set(s);
    if (this.isPlaying()) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  private startPlayback() {
    this.isPlaying.set(true);
    const intervalMs = Math.max(15, Math.floor(100 / this.speed()));
    this.timer = setInterval(() => {
      this.currentStep.update(v => {
        if (v >= 100) {
          this.pausePlayback();
          this.audio.playWin();
          this.haptic.vibrateSuccess();
          return 100;
        }
        return v + 2;
      });
    }, intervalMs);
  }

  private pausePlayback() {
    this.isPlaying.set(false);
    this.stopPlayback();
  }

  private stopPlayback() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
