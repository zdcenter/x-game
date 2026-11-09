import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { NonogramEngine } from '../../../features/games/nonogram/store/nonogram-engine';

/**
 * 极简、高性能的纯客户端 GIF89a 动图编码器。
 * 针对数织网格色彩建立 16 色调色板与标准 LZW 压缩，零外部依赖，极速在浏览器端生成 GIF 动图。
 */
class MiniGifEncoder {
  private width: number;
  private height: number;
  private palette: number[][];
  private out: number[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.palette = [
      [9, 13, 22],    // 0: background (#090d16)
      [30, 41, 59],   // 1: slate-800 cell (#1e293b)
      [99, 102, 241], // 2: indigo-500 fill (#6366f1)
      [79, 70, 229],  // 3: indigo-600 fill dark (#4f46e5)
      [244, 63, 94],  // 4: rose-500 cross (#f43f5e)
      [255, 255, 255],// 5: white (#ffffff)
      [148, 163, 184],// 6: text slate-400 (#94a3b8)
      [51, 65, 85],   // 7: border-slate-700 (#334155)
      [16, 185, 129], // 8: emerald-500 completed (#10b981)
      [245, 158, 11], // 9: amber-500 clear (#f59e0b)
      [56, 189, 248], // 10: sky-400 beacon (#38bdf8)
      [15, 23, 42],   // 11: slate-900 (#0f172a)
      [168, 85, 247], // 12: purple-500 (#a855f7)
      [239, 68, 68],  // 13: red-500 (#ef4444)
      [71, 85, 105],  // 14: slate-600 (#475569)
      [2, 6, 23]      // 15: slate-950 (#020617)
    ];
    this.writeHeader();
  }

  private writeHeader() {
    const h = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
    for (const b of h) this.out.push(b);

    this.writeShort(this.width);
    this.writeShort(this.height);
    this.out.push(0xF3); // 16 colors (2^(3+1))
    this.out.push(0);
    this.out.push(0);

    for (const c of this.palette) {
      this.out.push(c[0], c[1], c[2]);
    }

    // Netscape 2.0 loop extension
    this.out.push(0x21, 0xFF, 0x0B);
    const ns = [0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30];
    for (const b of ns) this.out.push(b);
    this.out.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  addFrame(pixels: Uint8ClampedArray, delayHundredths: number) {
    this.out.push(0x21, 0xF9, 0x04);
    this.out.push(0x04);
    this.writeShort(delayHundredths);
    this.out.push(0);
    this.out.push(0x00);

    this.out.push(0x2C);
    this.writeShort(0);
    this.writeShort(0);
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.out.push(0x00);

    const indexed = new Uint8Array(this.width * this.height);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      indexed[j] = this.findClosestColor(pixels[i], pixels[i + 1], pixels[i + 2]);
    }

    this.lzwEncode(indexed, 4);
  }

  private findClosestColor(r: number, g: number, b: number): number {
    let minD = Infinity;
    let best = 0;
    for (let i = 0; i < this.palette.length; i++) {
      const p = this.palette[i];
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < minD) {
        minD = d;
        best = i;
        if (d === 0) break;
      }
    }
    return best;
  }

  private lzwEncode(pixels: Uint8Array, minCodeSize: number) {
    this.out.push(minCodeSize);

    const clearCode = 1 << minCodeSize; // 16
    const eoiCode = clearCode + 1;      // 17
    let curCodeSize = minCodeSize + 1;  // 5
    let nextCode = eoiCode + 1;         // 18
    const maxCode = 4096;

    const dict = new Map<number, number>();
    const resetDict = () => {
      dict.clear();
      curCodeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    };

    let bitBuf = 0;
    let bitCount = 0;
    const subBlock: number[] = [];

    const emitByte = (b: number) => {
      subBlock.push(b);
      if (subBlock.length === 254) {
        this.out.push(subBlock.length);
        for (const sb of subBlock) this.out.push(sb);
        subBlock.length = 0;
      }
    };

    const emitBits = (code: number, nBits: number) => {
      bitBuf |= (code << bitCount);
      bitCount += nBits;
      while (bitCount >= 8) {
        emitByte(bitBuf & 0xFF);
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    const flushBits = () => {
      if (bitCount > 0) {
        emitByte(bitBuf & 0xFF);
        bitBuf = 0;
        bitCount = 0;
      }
      if (subBlock.length > 0) {
        this.out.push(subBlock.length);
        for (const sb of subBlock) this.out.push(sb);
        subBlock.length = 0;
      }
      this.out.push(0x00);
    };

    emitBits(clearCode, curCodeSize);
    resetDict();

    if (pixels.length === 0) {
      emitBits(eoiCode, curCodeSize);
      flushBits();
      return;
    }

    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const c = pixels[i];
      const key = (prefix << 8) | c;
      if (dict.has(key)) {
        prefix = dict.get(key)!;
      } else {
        emitBits(prefix, curCodeSize);
        if (nextCode < maxCode) {
          dict.set(key, nextCode++);
          if (nextCode > (1 << curCodeSize) && curCodeSize < 12) {
            curCodeSize++;
          }
        } else {
          emitBits(clearCode, curCodeSize);
          resetDict();
        }
        prefix = c;
      }
    }

    emitBits(prefix, curCodeSize);
    emitBits(eoiCode, curCodeSize);
    flushBits();
  }

  finish(): Blob {
    this.out.push(0x3B); // Trailer
    return new Blob([new Uint8Array(this.out)], { type: 'image/gif' });
  }

  private writeShort(val: number) {
    this.out.push(val & 0xFF, (val >> 8) & 0xFF);
  }
}

@Component({
  selector: 'app-timelapse-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md select-none animate-fade-in"
         (click)="close.emit()">
      <div class="relative w-full max-w-2xl sm:max-w-3xl md:max-w-4xl bg-[var(--color-bg-card)] border-2 border-purple-500/40 rounded-3xl p-3 sm:p-5 md:p-6 shadow-[0_0_60px_rgba(168,85,247,0.4)] flex flex-col gap-3 sm:gap-4 overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Ambient Cyber Line -->
        <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[var(--color-border-card)] pb-2.5 sm:pb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl sm:text-3xl animate-pulse">🎬</span>
            <div>
              <h3 class="text-sm sm:text-base md:text-lg font-black text-[var(--color-text-main)] flex items-center gap-1.5 sm:gap-2">
                <span>高光时刻 · 10秒极速时光倒流</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">REPLAY</span>
              </h3>
              <p class="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
                {{ gameTitle }} · {{ statSummary || '巅峰对局推导演示' }}
              </p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-xl sm:text-2xl font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Replay Theater Stage (Single Unified High-DPI Canvas Source of Truth) -->
        <div class="relative w-full h-[380px] sm:h-[460px] md:h-[520px] rounded-2xl bg-slate-950 border border-purple-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden p-2 group">
          
          <!-- Mode Switcher Pill (Real Board vs Pure Art) -->
          @if (hasReplayMoves()) {
            <div class="absolute top-3 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-0.5 z-20 shadow-lg">
              <button (click)="setViewMode('real')"
                      class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'real'"
                      [class.text-white]="viewMode() === 'real'"
                      [class.text-slate-400]="viewMode() !== 'real'">
                📋 真实棋盘
              </button>
              <button (click)="setViewMode('art')"
                      class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'art'"
                      [class.text-white]="viewMode() === 'art'"
                      [class.text-slate-400]="viewMode() !== 'art'">
                🎨 纯净画作
              </button>
            </div>
          }

          <!-- Unified Theater Canvas: The EXACT Canvas seen here is recorded into Video & GIF -->
          <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
            <canvas #theaterCanvas
                    width="800"
                    height="800"
                    class="w-full h-full object-contain rounded-xl shadow-2xl bg-[#090d16] border border-slate-800/80">
            </canvas>
          </div>

          <!-- Video / GIF Export Processing Overlay -->
          @if (isExporting()) {
            <div class="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3.5 animate-fade-in">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-purple-500/20 border-t-purple-400 animate-spin"></div>
              <div class="text-center px-4">
                <h4 class="text-sm sm:text-base font-black text-white flex items-center justify-center gap-2">
                  <span>{{ exportType() === 'video' ? '🎬 正在导出 10秒高清高光视频' : '🎞️ 正在合成超清 GIF 动图' }}</span>
                  <span class="font-mono text-amber-300">{{ exportProgress() }}%</span>
                </h4>
                <p class="text-xs text-slate-400 mt-1">
                  100% 捕获您眼前所见的真实棋盘演算画面，马上为您下载...
                </p>
              </div>
              <div class="w-48 sm:w-64 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-100"
                     [style.width.%]="exportProgress()"></div>
              </div>
            </div>
          }

          <!-- Interactive Timeline Scrubber Bar -->
          <div class="absolute bottom-0 inset-x-0 h-2.5 bg-slate-800 hover:h-4 transition-all cursor-pointer z-30 group/bar"
               (click)="onScrub($event)">
            <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-75 relative"
                 [style.width.%]="currentStep()">
              <!-- Scrubber Thumb -->
              <span class="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg group-hover/bar:scale-125 transition-transform"></span>
            </div>
          </div>
        </div>

        <!-- Playback & Export Controls -->
        <div class="flex items-center justify-between gap-2 px-1 flex-wrap">
          <!-- Play / Pause / Restart / Export Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <button (click)="togglePlay()"
                    class="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer">
              <span>{{ isPlaying() ? '⏸️' : '▶️' }}</span>
              <span>{{ isPlaying() ? '暂停' : '播放' }}</span>
            </button>
            <button (click)="restartReplay()"
                    class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] font-bold text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer">
              <span>🔄</span>
              <span>重播</span>
            </button>

            @if (hasReplayMoves()) {
              <!-- 导出视频 (WebM/MP4) -->
              <button (click)="exportVideo()" [disabled]="isExporting()"
                      class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="导出 10秒所见即所得高清高光视频 (WebM/MP4)">
                <span>🎥</span>
                <span>导出视频</span>
              </button>

              <!-- 导出 GIF 动图 -->
              <button (click)="exportGif()" [disabled]="isExporting()"
                      class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-400 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="导出所见即所得动画图片 (GIF 格式，无需视频播放器)">
                <span>🎞️</span>
                <span>导出 GIF</span>
              </button>

              <!-- 保存高清图片 (PNG) -->
              <button (click)="downloadArtwork()"
                      class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="保存终局像素画为 PNG 图片">
                <span>📸</span>
                <span class="hidden md:inline">画作 PNG</span>
              </button>
            }
          </div>

          <!-- Speed Switcher -->
          <div class="flex items-center gap-1 bg-[var(--color-bg-main)] p-1 rounded-xl border border-[var(--color-border-card)]">
            @for (s of [1, 2, 5, 10]; track s) {
              <button (click)="setSpeed(s)"
                      class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="speed() === s"
                      [class.text-white]="speed() === s"
                      [class.text-[var(--color-text-muted)]]="speed() !== s">
                {{ s }}x
              </button>
            }
          </div>
        </div>

        <!-- Social Video Recording & Sharing Banner -->
        <div class="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-500/20 text-xs text-[var(--color-text-secondary)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base sm:text-lg shrink-0">✨</span>
            <span class="leading-relaxed text-[11px] sm:text-xs">
              <strong>所见即所得保障</strong>：视频与 GIF 均由当前画布实时推导演算输出，棋盘布局、提示数字与划线效果与您回放所见 <strong>100% 绝对一致</strong>！
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

  @ViewChild('theaterCanvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  currentStep = signal(0);
  isPlaying = signal(true);
  speed = signal(2);
  viewMode = signal<'real' | 'art'>('real');

  isExporting = signal(false);
  exportType = signal<'video' | 'gif'>('video');
  exportProgress = signal(0);

  readonly width = computed(() => this.replayData?.width || 5);
  readonly height = computed(() => this.replayData?.height || 5);
  readonly rowHints = computed<number[][]>(() => this.replayData?.rowHints || []);
  readonly colHints = computed<number[][]>(() => this.replayData?.colHints || []);

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

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentProgressTimeMs: number = 0;
  private readonly totalDurationMs: number = 10000;

  ngOnInit() {
    this.startPlayback();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderCanvasFrame();
    }, 40);
  }

  ngOnDestroy() {
    this.stopPlayback();
  }

  setViewMode(mode: 'real' | 'art') {
    this.viewMode.set(mode);
    this.renderCanvasFrame();
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
    this.renderCanvasFrame();
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
    this.renderCanvasFrame();
  }

  /**
   * 导出超清 GIF 动图：直接从当前画布以相同参数逐帧采样，100% 绝对一致
   */
  async exportGif() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('gif');
    this.exportProgress.set(5);
    this.haptic.vibrateLight();
    this.pausePlayback();

    try {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) throw new Error('Canvas not found');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Context not found');

      // 480x480 动图尺寸
      const encoder = new MiniGifEncoder(800, 800);
      const totalSteps = 18;

      for (let i = 0; i < totalSteps; i++) {
        const stepPct = Math.round((i / (totalSteps - 1)) * 100);
        this.currentStep.set(stepPct);
        this.renderCanvasFrame();

        const imageData = ctx.getImageData(0, 0, 800, 800);
        const delay = (i === totalSteps - 1) ? 100 : 16;
        encoder.addFrame(imageData.data, delay);

        this.exportProgress.set(Math.round(((i + 1) / totalSteps) * 95));
        await new Promise(r => setTimeout(r, 15));
      }

      const gifBlob = encoder.finish();
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `puzzlepk-nonogram-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.exportProgress.set(100);
      this.audio.playWin();
      this.haptic.vibrateSuccess();
    } catch (e) {
      console.error('Failed to export GIF:', e);
      alert('导出 GIF 失败，请重试。');
    } finally {
      setTimeout(() => this.isExporting.set(false), 500);
    }
  }

  /**
   * 导出 10秒高清高光视频 (WebM / MP4)：直接录制当前屏幕画布流，100% 绝对一致
   */
  async exportVideo() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('video');
    this.exportProgress.set(5);
    this.haptic.vibrateLight();
    this.pausePlayback();

    try {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) throw new Error('Canvas 2D context unavailable');

      if (typeof MediaRecorder === 'undefined') {
        alert('当前浏览器环境暂未开放 MediaRecorder 视频录制 API，已为您自动转为导出超清 GIF 动图！');
        await this.exportGif();
        return;
      }

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3500000 } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const finalMime = mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: finalMime });
          const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `puzzlepk-nonogram-highlight-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      recorder.start();

      // Smoothly advance 40 frames across 2.5 seconds
      const frameCount = 38;
      for (let i = 0; i <= frameCount; i++) {
        const stepPct = Math.round((i / frameCount) * 100);
        this.currentStep.set(stepPct);
        this.renderCanvasFrame();

        this.exportProgress.set(Math.round((i / frameCount) * 90));
        await new Promise(r => setTimeout(r, 65));
      }

      // Hold final win frame for 1 second
      await new Promise(r => setTimeout(r, 1000));
      this.exportProgress.set(98);
      recorder.stop();
      await recordPromise;

      this.exportProgress.set(100);
      this.audio.playWin();
      this.haptic.vibrateSuccess();
    } catch (e) {
      console.error('Failed to export video:', e);
      alert('导出视频失败，请尝试导出 GIF 动图。');
    } finally {
      setTimeout(() => this.isExporting.set(false), 500);
    }
  }

  /**
   * 保存终局高清晰度 PNG 画作
   */
  downloadArtwork() {
    try {
      this.haptic.vibrateLight();
      this.audio.playClick();
      const canvas = document.createElement('canvas');
      const W = this.width();
      const H = this.height();
      const pixelSize = 32;
      canvas.width = W * pixelSize;
      canvas.height = H * pixelSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grid = this.currentReplayGrid();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (grid[y]?.[x] === 1) {
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }

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

  /**
   * 核心重构网格状态计算
   */
  readonly currentReplayGrid = computed<number[][]>(() => {
    const W = this.width();
    const H = this.height();
    const moves = this.replayData?.moves || [];
    const moveIdx = this.currentMoveIndex();

    const grid: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));
    for (let i = 0; i < moveIdx; i++) {
      const m = moves[i];
      if (m && m.y < H && m.x < W) {
        grid[m.y][m.x] = m.state;
      }
    }

    if (this.currentStep() >= 100 && this.replayData?.finalGrid) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          grid[y][x] = this.replayData.finalGrid[y]?.[x] ?? grid[y][x];
        }
      }
    }

    return grid;
  });

  /**
   * 核心唯一绘制方法：剧场屏幕实时渲染、视频捕获、GIF采样 100% 共享此代码
   */
  private renderCanvasFrame() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 800; // 800x800 internal canvas
    const W = this.width();
    const H = this.height();
    const rowHints = this.rowHints();
    const colHints = this.colHints();
    const grid = this.currentReplayGrid();
    const stepPct = this.currentStep();
    const moveIdx = this.currentMoveIndex();
    const moves = this.replayData?.moves || [];
    const lastMove = moveIdx > 0 ? moves[moveIdx - 1] : undefined;
    const isArtMode = this.viewMode() === 'art';

    // 1. Sleek obsidian theater background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Ambient cyber background lines
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < size; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(size, y);
      ctx.stroke();
    }

    // 2. Top Watermark Header
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(36, 36, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REC • PUZZLE PK', 50, 41);

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数织高光时光倒流 · 10秒推演', size / 2, 41);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`步数: ${moveIdx}/${this.totalMoves()}`, size - 36, 41);

    // 3. Board Geometry Calculation
    if (!isArtMode) {
      // ===== 📋 真实棋盘模式 =====
      const maxRowHints = Math.max(1, ...(rowHints.map(r => r.length)));
      const maxColHints = Math.max(1, ...(colHints.map(c => c.length)));

      const availW = 720;
      const availH = 620;

      // Sizing calculation strictly aligned with cell boundaries
      const colHintH = Math.max(50, maxColHints * 22 + 12);
      const rowHintW = Math.max(52, maxRowHints * 20 + 12);

      const cellSize = Math.floor(Math.min((availW - rowHintW) / W, (availH - colHintH) / H));

      const boardW = rowHintW + W * cellSize;
      const boardH = colHintH + H * cellSize;
      const startX = Math.floor((size - boardW) / 2);
      const startY = Math.floor(65 + (availH - boardH) / 2);

      const gridX = startX + rowHintWidth();
      const gridY = startY + colHintHeight();

      function rowHintWidth() { return rowHintW; }
      function colHintHeight() { return colHintH; }

      // Completed Row/Col check
      const compRows: boolean[] = rowHints.map((expected, y) => {
        const row = grid[y];
        if (!row) return false;
        const current = NonogramEngine.getLineHints(row.map(c => c === 1 ? 1 : 0));
        return current.length === expected.length && current.every((v, i) => v === expected[i]);
      });

      const compCols: boolean[] = colHints.map((expected, x) => {
        const col: number[] = [];
        for (let y = 0; y < H; y++) col.push(grid[y]?.[x] === 1 ? 1 : 0);
        const current = NonogramEngine.getLineHints(col);
        return current.length === expected.length && current.every((v, i) => v === expected[i]);
      });

      // Board Background Container
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(startX, startY, boardW, boardH);

      // A. Draw Column Hints (Top)
      ctx.textAlign = 'center';
      for (let x = 0; x < W; x++) {
        const col = colHints[x] || [];
        const cx = gridX + x * cellSize + cellSize / 2;
        const isComp = compCols[x];

        if (isComp) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
          ctx.fillRect(gridX + x * cellSize, startY, cellSize, colHintH);
        }

        const fontSize = Math.max(11, Math.min(18, Math.floor(cellSize * 0.44)));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;

        const stepY = Math.min(20, Math.floor(colHintH / Math.max(col.length, 1)));
        for (let i = 0; i < col.length; i++) {
          const hint = col[i];
          const hy = gridY - (col.length - 1 - i) * stepY - 6;
          ctx.fillStyle = isComp ? '#10b981' : '#f8fafc';
          ctx.fillText(String(hint), cx, hy);

          if (isComp) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cx - fontSize * 0.6, hy - fontSize * 0.3);
            ctx.lineTo(cx + fontSize * 0.6, hy - fontSize * 0.3);
            ctx.stroke();
          }
        }

        // Subgrid border right
        ctx.strokeStyle = (x + 1) % 5 === 0 && x !== W - 1 ? '#64748b' : '#334155';
        ctx.lineWidth = (x + 1) % 5 === 0 && x !== W - 1 ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(gridX + (x + 1) * cellSize, startY);
        ctx.lineTo(gridX + (x + 1) * cellSize, gridY);
        ctx.stroke();
      }

      // B. Draw Row Hints (Left)
      ctx.textAlign = 'right';
      for (let y = 0; y < H; y++) {
        const row = rowHints[y] || [];
        const cy = gridY + y * cellSize + cellSize / 2 + 5;
        const isComp = compRows[y];

        if (isComp) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
          ctx.fillRect(startX, gridY + y * cellSize, rowHintW, cellSize);
        }

        const fontSize = Math.max(11, Math.min(18, Math.floor(cellSize * 0.44)));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;

        const stepX = Math.min(22, Math.floor(rowHintW / Math.max(row.length, 1)));
        let rx = gridX - 8;
        for (let i = row.length - 1; i >= 0; i--) {
          const hint = row[i];
          ctx.fillStyle = isComp ? '#10b981' : '#f8fafc';
          ctx.fillText(String(hint), rx, cy);

          if (isComp) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(rx - fontSize * 0.9, cy - fontSize * 0.3);
            ctx.lineTo(rx + 2, cy - fontSize * 0.3);
            ctx.stroke();
          }
          rx -= stepX;
        }

        // Subgrid border bottom
        ctx.strokeStyle = (y + 1) % 5 === 0 && y !== H - 1 ? '#64748b' : '#334155';
        ctx.lineWidth = (y + 1) % 5 === 0 && y !== H - 1 ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(startX, gridY + (y + 1) * cellSize);
        ctx.lineTo(gridX, gridY + (y + 1) * cellSize);
        ctx.stroke();
      }

      // C. Draw Cells
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const cell = grid[y]?.[x] || 0;
          const cx = gridX + x * cellSize;
          const cy = gridY + y * cellSize;

          if (cell === 1) {
            // Indigo gradient fill
            const grad = ctx.createLinearGradient(cx, cy, cx, cy + cellSize);
            grad.addColorStop(0, '#818cf8');
            grad.addColorStop(1, '#4f46e5');
            ctx.fillStyle = grad;
            ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
          } else if (cell === 2) {
            // Rose cross
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);

            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = Math.max(2, cellSize * 0.14);
            ctx.lineCap = 'round';
            const pad = cellSize * 0.28;
            ctx.beginPath();
            ctx.moveTo(cx + pad, cy + pad);
            ctx.lineTo(cx + cellSize - pad, cy + cellSize - pad);
            ctx.moveTo(cx + cellSize - pad, cy + pad);
            ctx.lineTo(cx + pad, cy + cellSize - pad);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
          }
        }
      }

      // D. Draw Grid Lines
      // Thin lines (1x1)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        ctx.moveTo(gridX + x * cellSize, gridY);
        ctx.lineTo(gridX + x * cellSize, gridY + H * cellSize);
      }
      for (let y = 0; y <= H; y++) {
        ctx.moveTo(gridX, gridY + y * cellSize);
        ctx.lineTo(gridX + W * cellSize, gridY + y * cellSize);
      }
      ctx.stroke();

      // Bold 5x5 subgrid boundary lines
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 5) {
        ctx.moveTo(gridX + x * cellSize, gridY);
        ctx.lineTo(gridX + x * cellSize, gridY + H * cellSize);
      }
      for (let y = 0; y <= H; y += 5) {
        ctx.moveTo(gridX, gridY + y * cellSize);
        ctx.lineTo(gridX + W * cellSize, gridY + y * cellSize);
      }
      ctx.stroke();

      // Outer Border
      ctx.strokeStyle = stepPct >= 100 ? '#f59e0b' : '#94a3b8';
      ctx.lineWidth = 3;
      ctx.strokeRect(gridX, gridY, W * cellSize, H * cellSize);

      // Active Pen Cursor Beacon
      if (lastMove && lastMove.x < W && lastMove.y < H && stepPct < 100) {
        const lcx = gridX + lastMove.x * cellSize;
        const lcy = gridY + lastMove.y * cellSize;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.strokeRect(lcx - 1, lcy - 1, cellSize + 2, cellSize + 2);
        ctx.shadowBlur = 0;
      }
    } else {
      // ===== 🎨 纯净画作模式 =====
      const avail = 560;
      const cellSize = Math.floor(avail / Math.max(W, H));
      const artW = W * cellSize;
      const artH = H * cellSize;
      const gridX = Math.floor((size - artW) / 2);
      const gridY = Math.floor(65 + (620 - artH) / 2);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gridX, gridY, artW, artH);

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const cell = grid[y]?.[x] || 0;
          const cx = gridX + x * cellSize;
          const cy = gridY + y * cellSize;

          if (cell === 1) {
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(cx, cy, cellSize, cellSize);
          } else if (cell === 2) {
            ctx.fillStyle = '#020617';
            ctx.fillRect(cx, cy, cellSize, cellSize);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(cx, cy, cellSize, cellSize);
          }
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx, cy, cellSize, cellSize);
        }
      }

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gridX, gridY, artW, artH);
    }

    // 4. Celebration Stamp when 100%
    if (stepPct >= 100) {
      ctx.save();
      const badgeW = 340;
      const badgeH = 56;
      const bx = (size - badgeW) / 2;
      const by = (size - badgeH) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 28);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 PERFECT CLEAR!', size / 2, by + 36);
      ctx.restore();
    }

    // 5. Bottom Footer Timecode & Watermark
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px monospace';
    const s = Math.min(10, Math.floor(stepPct / 10));
    ctx.fillText(`00:${s < 10 ? '0' + s : s} / 00:10`, 36, size - 24);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('puzzlepk.com', size - 36, size - 24);
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
      this.renderCanvasFrame();
      this.pausePlayback();
      this.audio.playWin();
      this.haptic.vibrateSuccess();
      return;
    }

    const step = Math.min(99, Math.floor((this.currentProgressTimeMs / this.totalDurationMs) * 100));
    this.currentStep.set(step);
    this.renderCanvasFrame();

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
}
