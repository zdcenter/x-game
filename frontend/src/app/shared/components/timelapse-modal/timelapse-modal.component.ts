import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { NonogramEngine } from '../../../features/games/nonogram/store/nonogram-engine';

@Component({
  selector: 'app-timelapse-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .nonogram-replay-board {
      display: grid;
    }
    .col-hints {
      grid-column: 2;
      grid-row: 1;
      display: grid;
      border-top: 2px solid var(--color-border-card);
      border-left: 2px solid var(--color-border-card);
      border-right: 2px solid var(--color-border-card);
    }
    .col-hint-item {
      font-size: clamp(8px, calc(var(--cell-size) * 0.44), 16px);
      border-right: 1px solid var(--color-border-card);
    }
    .col-hint-item.thick-r {
      border-right: 2px solid var(--color-text-muted);
    }
    .row-hints {
      grid-column: 1;
      grid-row: 2;
      display: grid;
      border-top: 2px solid var(--color-border-card);
      border-left: 2px solid var(--color-border-card);
      border-bottom: 2px solid var(--color-border-card);
    }
    .row-hint-item {
      font-size: clamp(8px, calc(var(--cell-size) * 0.44), 16px);
      border-bottom: 1px solid var(--color-border-card);
    }
    .row-hint-item.thick-b {
      border-bottom: 2px solid var(--color-text-muted);
    }
    .cells-grid {
      grid-column: 2;
      grid-row: 2;
      display: grid;
      border: 2px solid var(--color-text-main);
    }
    .cell {
      border-right: 1px solid var(--color-border-card);
      border-bottom: 1px solid var(--color-border-card);
      box-sizing: border-box;
    }
    .cell.thick-r {
      border-right: 2px solid var(--color-text-muted);
    }
    .cell.thick-b {
      border-bottom: 2px solid var(--color-text-muted);
    }
  `],
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
        <div class="relative w-full h-[300px] sm:h-[370px] rounded-2xl bg-slate-950/90 border border-purple-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden p-2 sm:p-3 group">
          <!-- Top Watermark & HUD -->
          <div class="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono font-black text-white/60 tracking-wider z-20 pointer-events-none">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>REC • PUZZLE PK</span>
          </div>

          <!-- Top Center View Mode Switcher (Real Board vs Pure Art) -->
          @if (hasReplayMoves()) {
            <div class="absolute top-2 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-0.5 z-20 shadow-md">
              <button (click)="viewMode.set('real')"
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'real'"
                      [class.text-white]="viewMode() === 'real'"
                      [class.text-slate-400]="viewMode() !== 'real'">
                📋 真实棋盘
              </button>
              <button (click)="viewMode.set('art')"
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'art'"
                      [class.text-white]="viewMode() === 'art'"
                      [class.text-slate-400]="viewMode() !== 'art'">
                🎨 纯净画作
              </button>
            </div>
          }

          <!-- Top Right Step Counter & Speed -->
          <div class="absolute top-2 right-3 flex items-center gap-1.5 z-20 pointer-events-none">
            @if (hasReplayMoves()) {
              <div class="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-purple-300 font-bold">
                {{ currentMoveIndex() }}/{{ totalMoves() }} 步
              </div>
            }
            <div class="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/50 text-[10px] font-mono font-black text-purple-300">
              {{ speed() }}x
            </div>
          </div>

          <!-- Core Replay Stage Content -->
          @if (hasReplayMoves()) {
            <div class="relative flex items-center justify-center w-full h-full my-auto z-10 overflow-hidden py-1">
              
              <!-- Mode 1: 真实棋盘 (含顶部列提示、左侧行提示、完成自动划线) -->
              @if (viewMode() === 'real') {
                <div class="flex items-center justify-center transition-transform duration-150"
                     [style.transform]="'scale(' + boardScale() + ')'"
                     style="transform-origin: center center;">
                  <div class="nonogram-replay-board select-none shadow-2xl rounded-lg overflow-hidden border border-[var(--color-border-card)]"
                       [style.--cell-size.px]="replayCellSize()"
                       [style.grid-template-columns]="'max-content max-content'"
                       [style.grid-template-rows]="'max-content max-content'">
                    
                    <!-- Top-Left blank corner -->
                    <div class="bg-[var(--color-bg-card)]"></div>

                    <!-- Col Hints (Top) -->
                    <div class="col-hints bg-[var(--color-bg-card)]"
                         [style.grid-template-columns]="'repeat(' + width() + ', ' + replayCellSize() + 'px)'">
                      <div *ngFor="let col of colHints(); let x = index"
                           class="col-hint-item flex flex-col justify-end items-center pb-0.5 text-[var(--color-text-main)] font-black select-none"
                           [class.thick-r]="(x + 1) % 5 === 0 && x !== width() - 1"
                           [class.no-border-r]="x === width() - 1"
                           [class.bg-emerald-500/10]="completedCols()[x]">
                        <span *ngFor="let hint of col"
                              class="font-mono font-black leading-none py-0.5 transition-all"
                              [class.line-through]="completedCols()[x]"
                              [class.opacity-35]="completedCols()[x]"
                              [class.text-emerald-400]="completedCols()[x]">{{ hint }}</span>
                      </div>
                    </div>

                    <!-- Row Hints (Left) -->
                    <div class="row-hints bg-[var(--color-bg-card)]"
                         [style.grid-template-rows]="'repeat(' + height() + ', ' + replayCellSize() + 'px)'">
                      <div *ngFor="let row of rowHints(); let y = index"
                           class="row-hint-item flex justify-end items-center pr-1.5 text-[var(--color-text-main)] font-black select-none"
                           [class.thick-b]="(y + 1) % 5 === 0 && y !== height() - 1"
                           [class.no-border-b]="y === height() - 1"
                           [class.bg-emerald-500/10]="completedRows()[y]">
                        <span *ngFor="let hint of row; let last = last"
                              class="font-mono font-black leading-none mr-1 transition-all"
                              [class.line-through]="completedRows()[y]"
                              [class.opacity-35]="completedRows()[y]"
                              [class.text-emerald-400]="completedRows()[y]">{{ hint }}</span>
                      </div>
                    </div>

                    <!-- Main Grid Cells -->
                    <div class="cells-grid bg-[var(--color-bg-card)]"
                         [style.grid-template-columns]="'repeat(' + width() + ', ' + replayCellSize() + 'px)'"
                         [style.grid-template-rows]="'repeat(' + height() + ', ' + replayCellSize() + 'px)'">
                      <ng-container *ngFor="let row of currentReplayGrid(); let y = index">
                        <div *ngFor="let cell of row; let x = index"
                             class="cell flex items-center justify-center relative overflow-hidden transition-colors duration-75"
                             [class.thick-b]="(y + 1) % 5 === 0 && y !== height() - 1"
                             [class.thick-r]="(x + 1) % 5 === 0 && x !== width() - 1"
                             [class.no-border-r]="x === width() - 1"
                             [class.no-border-b]="y === height() - 1"
                             [class.bg-[var(--color-text-main)]]="cell === 1"
                             [class.ring-2]="lastMove()?.x === x && lastMove()?.y === y && currentStep() < 100"
                             [class.ring-sky-400]="lastMove()?.x === x && lastMove()?.y === y && currentStep() < 100"
                             [class.z-10]="lastMove()?.x === x && lastMove()?.y === y">
                          
                          <!-- Crossed (2) -->
                          <div *ngIf="cell === 2"
                               class="text-rose-500 font-bold select-none flex items-center justify-center leading-none"
                               [style.font-size.px]="replayCellSize() * 0.72">✕</div>
                        </div>
                      </ng-container>
                    </div>

                  </div>
                </div>
              } @else {
                <!-- Mode 2: 纯净画作 (聚焦像素图案) -->
                <div class="flex items-center justify-center p-2">
                  <div class="grid bg-slate-900 border-2 border-indigo-500/50 rounded-xl overflow-hidden shadow-2xl p-1"
                       [style.grid-template-columns]="'repeat(' + width() + ', minmax(0, 1fr))'"
                       [style.width.px]="pureArtSize()"
                       [style.height.px]="pureArtSize()">
                    <ng-container *ngFor="let row of currentReplayGrid(); let y = index">
                      <div *ngFor="let cell of row; let x = index"
                           class="w-full h-full border border-slate-800/40 flex items-center justify-center transition-all duration-75"
                           [class.bg-indigo-500]="cell === 1"
                           [class.shadow-inner]="cell === 1"
                           [class.bg-slate-900]="cell === 0"
                           [class.bg-slate-950]="cell === 2">
                        <span *ngIf="cell === 2" class="text-rose-500/70 text-[10px] font-bold">✕</span>
                      </div>
                    </ng-container>
                  </div>
                </div>
              }

              <!-- Completed Art Celebration Stamp -->
              @if (currentStep() >= 100) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl animate-fade-in pointer-events-none z-30">
                  <div class="animate-scale-up px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-purple-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>PERFECT CLEAR!</span>
                  </div>
                  <span class="mt-1 text-[11px] font-mono font-bold text-amber-300 drop-shadow">
                    全部 {{ totalMoves() }} 步还原完毕 · 谜面完全解开
                  </span>
                </div>
              }

            </div>
          } @else {
            <!-- Fallback Step Visualizer -->
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
          <!-- Play / Pause / Restart / Save -->
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
export class TimelapseModalComponent implements OnInit, OnDestroy {
  @Input() gameTitle: string = '';
  @Input() gameId?: string = '';
  @Input() statSummary: string = '';
  @Input() replayData?: any;
  @Output() close = new EventEmitter<void>();

  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  currentStep = signal(0);
  isPlaying = signal(true);
  speed = signal(2);
  viewMode = signal<'real' | 'art'>('real');

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

  readonly currentSecondFormatted = computed(() => {
    const s = Math.min(10, Math.floor(this.currentStep() / 10));
    return s < 10 ? '0' + s : '' + s;
  });

  readonly replayCellSize = computed(() => {
    const w = this.width();
    if (w <= 5) return 26;
    if (w <= 10) return 18;
    if (w <= 15) return 13;
    if (w <= 20) return 10;
    return 8;
  });

  readonly pureArtSize = computed(() => {
    return 220;
  });

  readonly boardScale = computed(() => {
    const w = this.width();
    const h = this.height();
    const cellSize = this.replayCellSize();
    const maxRowHints = Math.max(1, ...(this.rowHints().map(r => r.length)));
    const maxColHints = Math.max(1, ...(this.colHints().map(c => c.length)));
    const approxW = maxRowHints * 14 + w * cellSize + 20;
    const approxH = maxColHints * 16 + h * cellSize + 20;
    
    // Target stage inner dimensions
    const targetW = 390;
    const targetH = 260;
    const scaleX = targetW / Math.max(approxW, 1);
    const scaleY = targetH / Math.max(approxH, 1);
    return Math.min(1.15, Math.min(scaleX, scaleY));
  });

  // Reconstructed board grid at current playback step
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

  readonly lastMove = computed(() => {
    const moves = this.replayData?.moves || [];
    const moveIdx = this.currentMoveIndex();
    return moveIdx > 0 ? moves[moveIdx - 1] : undefined;
  });

  readonly completedRows = computed<boolean[]>(() => {
    const g = this.currentReplayGrid();
    const hints = this.rowHints();
    if (!g || !hints || g.length === 0 || hints.length === 0) return [];
    return hints.map((expected: number[], y: number) => {
      const row = g[y];
      if (!row) return false;
      const current = NonogramEngine.getLineHints(row.map((c: number) => c === 1 ? 1 : 0));
      return current.length === expected.length && current.every((v: number, i: number) => v === expected[i]);
    });
  });

  readonly completedCols = computed<boolean[]>(() => {
    const g = this.currentReplayGrid();
    const hints = this.colHints();
    const h = this.height();
    if (!g || !hints || g.length === 0 || hints.length === 0) return [];
    return hints.map((expected: number[], x: number) => {
      const col: number[] = [];
      for (let y = 0; y < h; y++) {
        col.push(g[y]?.[x] === 1 ? 1 : 0);
      }
      const current = NonogramEngine.getLineHints(col);
      return current.length === expected.length && current.every((v: number, i: number) => v === expected[i]);
    });
  });

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentProgressTimeMs: number = 0;
  private readonly totalDurationMs: number = 10000;

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
  }

  downloadArtwork() {
    try {
      this.haptic.vibrateLight();
      this.audio.playClick();
      const canvas = document.createElement('canvas');
      const W = this.width();
      const H = this.height();
      const pixelSize = 24;
      canvas.width = W * pixelSize;
      canvas.height = H * pixelSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background
      ctx.fillStyle = '#0f172a';
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
      this.pausePlayback();
      this.audio.playWin();
      this.haptic.vibrateSuccess();
      return;
    }

    const step = Math.min(99, Math.floor((this.currentProgressTimeMs / this.totalDurationMs) * 100));
    this.currentStep.set(step);

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
