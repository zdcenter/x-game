import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
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
      <div class="relative w-full max-w-xl bg-[var(--color-bg-card)] border-2 border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(168,85,247,0.35)] flex flex-col gap-3.5 overflow-hidden"
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
        <div class="relative w-full h-[280px] sm:h-[340px] rounded-2xl bg-slate-950 border border-purple-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden p-3 group">
          <!-- Top Watermark -->
          <div class="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono font-black text-white/60 tracking-wider z-20 pointer-events-none">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>REC • PUZZLE PK</span>
          </div>

          <!-- Top Right Speed Pill & Step Count -->
          <div class="absolute top-2 right-3 flex items-center gap-2 z-20 pointer-events-none">
            @if (hasReplayMoves()) {
              <div class="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-purple-300 font-bold">
                步数: {{ currentMoveIndex() }}/{{ totalMoves() }}
              </div>
            }
            <div class="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/50 text-[10px] font-mono font-black text-purple-300">
              {{ speed() }}x SPEED
            </div>
          </div>

          <!-- Canvas Nonogram Visualizer -->
          @if (hasReplayMoves()) {
            <div class="relative flex items-center justify-center w-full h-full my-auto z-10">
              <canvas #replayCanvas
                      class="max-h-[220px] sm:max-h-[270px] max-w-[90%] aspect-square rounded-xl shadow-2xl border border-slate-800 bg-[#090d16]">
              </canvas>

              <!-- Completed Art Celebration Stamp -->
              @if (currentStep() >= 100) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px] rounded-xl animate-fade-in pointer-events-none">
                  <div class="animate-scale-up px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-purple-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>PERFECT CLEAR!</span>
                  </div>
                  <span class="mt-1 text-[11px] font-mono font-bold text-amber-300 drop-shadow">
                    全部 {{ totalMoves() }} 步还原完毕
                  </span>
                </div>
              }
            </div>
          } @else {
            <!-- Fallback Step Visualizer (for games without explicit move history) -->
            <div class="flex flex-col items-center justify-center gap-2 my-auto text-center z-10">
              <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-amber-900/30 border border-purple-400/50 flex items-center justify-center shadow-lg">
                <span class="text-3xl sm:text-4xl font-black font-mono text-purple-300 tabular-nums">
                  {{ currentStep() }}%
                </span>
                <div class="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-purple-400"></div>
                <div class="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-purple-400"></div>
                <div class="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-purple-400"></div>
                <div class="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-purple-400"></div>
              </div>

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
          }

          <!-- Bottom Timecode & Watermark -->
          <div class="absolute bottom-3 inset-x-3 flex items-center justify-between text-[10px] font-mono text-white/50 z-20 pointer-events-none">
            <span>00:{{ currentSecondFormatted() }} / 00:10</span>
            <span class="font-bold text-amber-400/90 tracking-wide">puzzlepk.com</span>
          </div>

          <!-- Interactive Timeline Scrubber Bar -->
          <div class="absolute bottom-0 inset-x-0 h-2 bg-slate-800 hover:h-3 transition-all cursor-pointer z-30 group/bar"
               (click)="onScrub($event)">
            <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-75 relative"
                 [style.width.%]="currentStep()">
              <!-- Scrubber Thumb -->
              <span class="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md group-hover/bar:scale-125 transition-transform"></span>
            </div>
          </div>
        </div>

        <!-- Playback Controls -->
        <div class="flex items-center justify-between gap-2 px-1 flex-wrap">
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
            @if (hasReplayMoves()) {
              <button (click)="downloadArtwork()"
                      class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="保存像素画 PNG">
                <span>📸</span>
                <span class="hidden sm:inline">保存画作</span>
              </button>
            }
          </div>

          <!-- Speed Switcher -->
          <div class="flex items-center gap-1 bg-[var(--color-bg-main)] p-0.5 rounded-xl border border-[var(--color-border-card)]">
            @for (s of [1, 2, 5, 10]; track s) {
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
        <div class="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-500/20 text-xs text-[var(--color-text-secondary)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base shrink-0">📱</span>
            <span class="leading-relaxed text-[11px] sm:text-xs">
              支持直接手机录屏或截取本段 10 秒回放，分享至 B站/抖音/微信群，自带高光水印！
            </span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class TimelapseModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() gameTitle: string = '';
  @Input() gameId?: string = '';
  @Input() statSummary: string = '';
  @Input() replayData?: any;
  @Output() close = new EventEmitter<void>();

  @ViewChild('replayCanvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  currentStep = signal(0);
  isPlaying = signal(true);
  speed = signal(2);

  readonly totalMoves = computed(() => {
    return this.replayData?.moves?.length || 0;
  });

  readonly hasReplayMoves = computed(() => {
    return !!(this.replayData && (this.replayData.moves?.length > 0 || this.replayData.finalGrid));
  });

  readonly currentMoveIndex = computed(() => {
    const total = this.totalMoves();
    if (total === 0) return 0;
    const p = this.currentStep() / 100;
    return Math.min(total, Math.floor(p * total));
  });

  readonly currentSecondFormatted = computed(() => {
    const s = Math.min(10, Math.floor(this.currentStep() / 10));
    return s < 10 ? '0' + s : '' + s;
  });

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentProgressTimeMs: number = 0;
  private readonly totalDurationMs: number = 10000; // Standard 10s highlight clip
  private renderedMoveIndex: number = -1;

  ngOnInit() {
    this.startPlayback();
  }

  ngAfterViewInit() {
    // Initial canvas render
    if (this.hasReplayMoves()) {
      setTimeout(() => this.renderCurrentState(), 50);
    }
  }

  ngOnDestroy() {
    this.stopPlayback();
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pausePlayback();
    } else {
      if (this.currentStep() >= 100) {
        this.restartReplay();
        return;
      }
      this.startPlayback();
    }
  }

  restartReplay() {
    this.stopPlayback();
    this.currentProgressTimeMs = 0;
    this.currentStep.set(0);
    this.renderedMoveIndex = -1;
    this.renderCurrentState();
    this.startPlayback();
  }

  setSpeed(s: number) {
    this.speed.set(s);
  }

  onScrub(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    
    this.currentProgressTimeMs = ratio * this.totalDurationMs;
    this.currentStep.set(Math.round(ratio * 100));
    this.renderCurrentState();
  }

  downloadArtwork() {
    if (!this.canvasRef?.nativeElement) return;
    try {
      this.haptic.vibrateLight();
      this.audio.playClick();
      const canvas = this.canvasRef.nativeElement;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `puzzlepk-nonogram-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Failed to download artwork:', e);
    }
  }

  private startPlayback() {
    this.isPlaying.set(true);
    this.lastTimestamp = performance.now();
    this.runLoop();
  }

  private runLoop = () => {
    if (!this.isPlaying()) return;

    const now = performance.now();
    const dt = now - this.lastTimestamp;
    this.lastTimestamp = now;

    this.currentProgressTimeMs += dt * this.speed();

    if (this.currentProgressTimeMs >= this.totalDurationMs) {
      this.currentProgressTimeMs = this.totalDurationMs;
      this.currentStep.set(100);
      this.renderCurrentState();
      this.pausePlayback();
      this.audio.playWin();
      this.haptic.vibrateSuccess();
      return;
    }

    const step = Math.min(99, Math.floor((this.currentProgressTimeMs / this.totalDurationMs) * 100));
    this.currentStep.set(step);
    this.renderCurrentState();

    this.animationFrameId = requestAnimationFrame(this.runLoop);
  };

  private pausePlayback() {
    this.isPlaying.set(false);
    this.stopPlayback();
  }

  private stopPlayback() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderCurrentState() {
    if (!this.hasReplayMoves() || !this.canvasRef?.nativeElement) return;

    const total = this.totalMoves();
    const p = this.currentProgressTimeMs / this.totalDurationMs;
    const targetMoveCount = total > 0 ? Math.min(total, Math.floor(p * total)) : 0;

    // Avoid redundant canvas draws if move hasn't changed (unless step 100 reached)
    if (targetMoveCount === this.renderedMoveIndex && this.currentStep() < 100) {
      return;
    }
    this.renderedMoveIndex = targetMoveCount;

    const W = this.replayData.width || 5;
    const H = this.replayData.height || 5;
    const moves = this.replayData.moves || [];

    // Reconstruct board grid up to targetMoveCount
    const grid: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));
    for (let i = 0; i < targetMoveCount; i++) {
      const m = moves[i];
      if (m && m.y < H && m.x < W) {
        grid[m.y][m.x] = m.state;
      }
    }

    // If step is 100% and finalGrid is available, make sure the final result is 100% exact
    if (this.currentStep() >= 100 && this.replayData.finalGrid) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          grid[y][x] = this.replayData.finalGrid[y]?.[x] ?? grid[y][x];
        }
      }
    }

    const lastMove = targetMoveCount > 0 ? moves[targetMoveCount - 1] : undefined;
    this.drawBoard(grid, W, H, lastMove, this.currentStep() >= 100);
  }

  private drawBoard(grid: number[][], W: number, H: number, lastMove?: any, isComplete?: boolean) {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(180, Math.min(rect.width || 260, 320));

    // Ensure backing store matches devicePixelRatio for crisp lines
    if (canvas.width !== Math.floor(size * dpr) || canvas.height !== Math.floor(size * dpr)) {
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Board Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    const padding = 10;
    const maxDim = Math.max(W, H);
    const cellSize = (size - padding * 2) / maxDim;
    const offsetX = padding + ((size - padding * 2) - W * cellSize) / 2;
    const offsetY = padding + ((size - padding * 2) - H * cellSize) / 2;

    // 2. Draw Cells
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const val = grid[y]?.[x] || 0;
        const cx = offsetX + x * cellSize;
        const cy = offsetY + y * cellSize;

        if (val === 1) {
          // Fill: Cyber Neon Indigo Gradient
          const grad = ctx.createLinearGradient(cx, cy, cx, cy + cellSize);
          grad.addColorStop(0, '#818cf8'); // indigo-400
          grad.addColorStop(1, '#4f46e5'); // indigo-600
          ctx.fillStyle = grad;
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
        } else if (val === 2) {
          // Cross: Sleek red/rose ✕
          ctx.fillStyle = '#111827';
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);

          ctx.strokeStyle = '#f87171'; // rose-400
          ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
          ctx.lineCap = 'round';
          const pad = cellSize * 0.28;
          ctx.beginPath();
          ctx.moveTo(cx + pad, cy + pad);
          ctx.lineTo(cx + cellSize - pad, cy + cellSize - pad);
          ctx.moveTo(cx + cellSize - pad, cy + pad);
          ctx.lineTo(cx + pad, cy + cellSize - pad);
          ctx.stroke();
        } else {
          // Empty cell
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }

    // 3. Grid Lines
    // Thin 1x1 cell boundaries
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const gx = offsetX + x * cellSize;
      ctx.moveTo(gx, offsetY);
      ctx.lineTo(gx, offsetY + H * cellSize);
    }
    for (let y = 0; y <= H; y++) {
      const gy = offsetY + y * cellSize;
      ctx.moveTo(offsetX, gy);
      ctx.lineTo(offsetX + W * cellSize, gy);
    }
    ctx.stroke();

    // Bold 5x5 subgrid boundary lines
    ctx.strokeStyle = '#6366f1'; // indigo-500
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 5) {
      const gx = offsetX + x * cellSize;
      ctx.moveTo(gx, offsetY);
      ctx.lineTo(gx, offsetY + H * cellSize);
    }
    for (let y = 0; y <= H; y += 5) {
      const gy = offsetY + y * cellSize;
      ctx.moveTo(offsetX, gy);
      ctx.lineTo(offsetX + W * cellSize, gy);
    }
    ctx.stroke();

    // 4. Outer Boundary Frame
    ctx.strokeStyle = isComplete ? '#f59e0b' : '#64748b';
    ctx.lineWidth = isComplete ? 3 : 2;
    ctx.strokeRect(offsetX, offsetY, W * cellSize, H * cellSize);

    // 5. Active Cursor / Pen tip on last modified cell
    if (lastMove && lastMove.x < W && lastMove.y < H && !isComplete) {
      const lcx = offsetX + lastMove.x * cellSize;
      const lcy = offsetY + lastMove.y * cellSize;
      ctx.strokeStyle = '#38bdf8'; // Sky blue beacon
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.strokeRect(lcx - 1, lcy - 1, cellSize + 2, cellSize + 2);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
