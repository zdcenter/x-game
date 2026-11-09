import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import fixWebmDuration from 'fix-webm-duration';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { NonogramEngine } from '../../../features/games/nonogram/store/nonogram-engine';

/**
 * 极简、高性能的纯客户端 GIF89a 动图编码器。
 * 针对数织网格色彩建立调色板与标准 LZW 压缩，零外部依赖，极速在浏览器端生成 GIF 动图。
 */
class MiniGifEncoder {
  private width: number;
  private height: number;
  private palette: number[][];
  private out: number[] = [];
  private colorCache = new Map<number, number>();

  constructor(width: number, height: number, customPalette?: number[][]) {
    this.width = width;
    this.height = height;

    const baseBrandColors: number[][] = [
      [8, 13, 26],    // #080d1a
      [15, 23, 42],   // #0f172a
      [19, 27, 46],   // #131b2e
      [30, 41, 59],   // #1e293b
      [30, 27, 75],   // #1e1b4b
      [51, 65, 85],   // #334155
      [71, 85, 105],  // #475569
      [100, 116, 139],// #64748b
      [148, 163, 184],// #94a3b8
      [203, 213, 225],// #cbd5e1
      [226, 232, 240],// #e2e8f0
      [248, 250, 252],// #f8fafc
      [255, 255, 255],// #ffffff
      [0, 0, 0],      // black
      [168, 85, 247], // #a855f7
      [147, 51, 234], // #9333ea
      [192, 132, 252],// #c084fc
      [216, 180, 254],// #d8b4fe
      [233, 213, 255],// #e9d5ff
      [88, 28, 135],  // #581c87
      [245, 158, 11], // #f59e0b
      [251, 191, 36], // #fbbf24
      [253, 224, 71], // #fde047
      [180, 83, 9],   // #b45309
      [217, 119, 6],  // #d97706
      [14, 165, 233], // #0ea5e9
      [56, 189, 248], // #38bdf8
      [125, 211, 252],// #7dd3fc
      [2, 132, 199],  // #0284c7
      [99, 102, 241], // #6366f1
      [129, 140, 248],// #818cf8
      [16, 185, 129], // #10b981
      [52, 211, 153], // #34d399
      [34, 211, 238], // #22d3ee
      [59, 130, 246], // #3b82f6
      [239, 68, 68],  // #ef4444
      [244, 63, 94]   // #f43f5e
    ];

    const initial = customPalette && customPalette.length > 0 ? customPalette : baseBrandColors;
    this.palette = [...initial];

    // 补充标准 6x6x6 网页调色板至 256 色，确保任何中间色彩均能无失真映射
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
          if (this.palette.length >= 256) break;
          this.palette.push([r * 51, g * 51, b * 51]);
        }
      }
    }
    while (this.palette.length < 256) {
      this.palette.push([0, 0, 0]);
    }

    this.writeHeader();
  }

  private writeHeader() {
    const h = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
    for (const b of h) this.out.push(b);

    this.writeShort(this.width);
    this.writeShort(this.height);
    this.out.push(0xF7); // 256 色全局调色板标志 (2^(7+1))
    this.out.push(0);
    this.out.push(0);

    for (let i = 0; i < 256; i++) {
      const c = this.palette[i];
      this.out.push(c[0], c[1], c[2]);
    }

    // Netscape 2.0 loop extension (infinite looping)
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

    this.lzwEncode(indexed, 8);
  }

  private findClosestColor(r: number, g: number, b: number): number {
    const key = (r << 16) | (g << 8) | b;
    const cached = this.colorCache.get(key);
    if (cached !== undefined) return cached;

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
    this.colorCache.set(key, best);
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
    this.out.push(0x3B);
    return new Blob([new Uint8Array(this.out)], { type: 'image/gif' });
  }

  private writeShort(val: number) {
    this.out.push(val & 0xFF, (val >> 8) & 0xFF);
  }
}

function parseHexRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const n = parseInt(hex, 16);
  if (isNaN(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

@Component({
  selector: 'app-timelapse-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    /* 100% 同步游戏真实棋盘样式规范 (Exact Replica of nonogram.component.css) */
    .nonogram-board {
      display: grid;
    }
    .top-left {
      grid-column: 1;
      grid-row: 1;
      background: var(--color-bg-card);
    }
    .col-hints {
      grid-column: 2;
      grid-row: 1;
      display: grid;
      background: var(--color-bg-card);
      border-top: 3px solid var(--color-text-main);
      border-left: 3px solid var(--color-text-main);
      border-right: 3px solid var(--color-text-main);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }
    .col-hint-item {
      font-size: clamp(9px, calc(var(--cell-size) * 0.46), 24px);
      line-height: 1.15;
      border-right: 1px solid var(--color-border-thick);
    }
    .col-hint-item.thick-r {
      border-right: 2px solid var(--color-text-muted);
    }
    .col-hint-item.no-border-r {
      border-right: none;
    }
    .col-hint-item.col-completed {
      opacity: 0.45;
    }
    .row-hints {
      grid-column: 1;
      grid-row: 2;
      display: grid;
      background: var(--color-bg-card);
      border-top: 3px solid var(--color-text-main);
      border-left: 3px solid var(--color-text-main);
      border-bottom: 3px solid var(--color-text-main);
      box-shadow: 4px 0 6px -1px rgba(0, 0, 0, 0.08);
    }
    .row-hint-item {
      font-size: clamp(9px, calc(var(--cell-size) * 0.44), 22px);
      border-bottom: 1px solid var(--color-border-thick);
    }
    .row-hint-item.thick-b {
      border-bottom: 2px solid var(--color-text-muted);
    }
    .row-hint-item.no-border-b {
      border-bottom: none;
    }
    .row-hint-item.row-completed {
      opacity: 0.45;
    }
    .cells-grid {
      grid-column: 2;
      grid-row: 2;
      display: grid;
      background: var(--color-bg-card);
      border: 3px solid var(--color-text-main);
    }
    .cell {
      border-right: 1px solid var(--color-border-thick);
      border-bottom: 1px solid var(--color-border-thick);
      box-sizing: border-box;
    }
    .cell.thick-r {
      border-right: 2px solid var(--color-text-muted);
    }
    .cell.thick-b {
      border-bottom: 2px solid var(--color-text-muted);
    }
    .cell.no-border-r {
      border-right: none;
    }
    .cell.no-border-b {
      border-bottom: none;
    }
  `],
  template: `
    <div class="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md select-none animate-fade-in"
         (click)="close.emit()">
      <div class="relative w-full max-w-2xl sm:max-w-3xl md:max-w-4xl bg-[var(--color-bg-card)] border-2 border-purple-500/40 rounded-3xl p-3 sm:p-5 md:p-6 shadow-[0_0_60px_rgba(168,85,247,0.4)] flex flex-col gap-3 sm:gap-4 overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Ambient Line -->
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

        <!-- Replay Theater Stage (Authentic Game Board Display) -->
        <div class="relative w-full h-[380px] sm:h-[460px] md:h-[530px] rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-inner flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4 group">
          
          <!-- Top Watermark & HUD -->
          <div class="absolute top-2.5 left-3.5 flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-black text-[var(--color-text-muted)] tracking-wider z-20 pointer-events-none">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span>REC • PUZZLE PK</span>
          </div>

          <!-- Top Right Step Counter & Speed -->
          <div class="absolute top-2.5 right-3.5 flex items-center gap-2 z-20 pointer-events-none">
            @if (hasReplayMoves()) {
              <div class="px-2.5 py-0.5 sm:py-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[10px] sm:text-xs font-mono text-[var(--color-text-main)] font-bold shadow-sm">
                {{ currentMoveIndex() }}/{{ totalMoves() }} 步
              </div>
            }
            <div class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] sm:text-xs font-mono font-black text-purple-400">
              {{ speed() }}x
            </div>
          </div>

          <!-- Real Nonogram Board (100% Identical DOM & Styling as in-game) -->
          @if (hasReplayMoves()) {
            <div class="relative flex items-center justify-center w-full h-full my-auto z-10 overflow-hidden py-2">
              <div class="flex items-center justify-center transition-transform duration-100"
                   [style.transform]="'scale(' + boardScale() + ')'"
                   style="transform-origin: center center;">
                
                <div class="nonogram-board select-none shadow-2xl rounded-xl border border-[var(--color-border-card)]"
                     [style.--cell-size.px]="replayCellSize()"
                     [style.grid-template-columns]="'max-content max-content'"
                     [style.grid-template-rows]="'max-content max-content'">
                  
                  <!-- Top-Left blank corner -->
                  <div class="top-left"></div>

                  <!-- Col Hints (Top) -->
                  <div class="col-hints"
                       [style.grid-template-columns]="'repeat(' + width() + ', ' + replayCellSize() + 'px)'">
                    <div *ngFor="let col of colHints(); let x = index"
                         class="col-hint-item flex flex-col justify-end items-center pb-0.5 sm:pb-1 text-[var(--color-text-main)] font-black select-none"
                         [class.thick-r]="(x + 1) % 5 === 0 && x !== width() - 1"
                         [class.no-border-r]="x === width() - 1"
                         [class.col-completed]="completedCols()[x]">
                      <span *ngFor="let hint of col"
                            class="font-mono font-black leading-none py-0.5"
                            [class.line-through]="completedCols()[x]"
                            [class.opacity-35]="completedCols()[x]">{{ hint }}</span>
                    </div>
                  </div>

                  <!-- Row Hints (Left) -->
                  <div class="row-hints"
                       [style.grid-template-rows]="'repeat(' + height() + ', ' + replayCellSize() + 'px)'">
                    <div *ngFor="let row of rowHints(); let y = index"
                         class="row-hint-item flex justify-end items-center pr-1.5 sm:pr-2 text-[var(--color-text-main)] font-black select-none"
                         [class.thick-b]="(y + 1) % 5 === 0 && y !== height() - 1"
                         [class.no-border-b]="y === height() - 1"
                         [class.row-completed]="completedRows()[y]">
                      <span *ngFor="let hint of row; let last = last"
                            class="font-mono font-black leading-none"
                            [class.mr-1]="width() < 20 && !last"
                            [class.mr-0.5]="width() >= 20 && !last"
                            [class.line-through]="completedRows()[y]"
                            [class.opacity-35]="completedRows()[y]">{{ hint }}</span>
                    </div>
                  </div>

                  <!-- Main Grid Cells -->
                  <div class="cells-grid select-none relative"
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
                             class="text-rose-500 dark:text-rose-400 font-bold pointer-events-none select-none flex items-center justify-center leading-none"
                             [style.font-size.px]="replayCellSize() * 0.72">✕</div>
                      </div>
                    </ng-container>
                  </div>

                </div>

              </div>

              <!-- Completed Art Celebration Stamp -->
              @if (currentStep() >= 100) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] rounded-xl animate-fade-in pointer-events-none z-30">
                  <div class="animate-scale-up px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-purple-500 text-slate-950 font-black text-sm sm:text-base shadow-2xl flex items-center gap-2">
                    <span>🏆</span>
                    <span>PERFECT CLEAR!</span>
                  </div>
                  <span class="mt-1.5 text-xs sm:text-sm font-mono font-bold text-amber-300 drop-shadow">
                    全部 {{ totalMoves() }} 步还原完毕 · 谜面完全解开
                  </span>
                </div>
              }

            </div>
          } @else {
            <!-- Fallback Step Visualizer -->
            <div class="flex flex-col items-center justify-center gap-3 my-auto text-center z-10">
              <div class="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[var(--color-bg-card)] border-2 border-purple-500/40 flex items-center justify-center shadow-xl">
                <span class="text-4xl sm:text-5xl font-black font-mono text-purple-400 tabular-nums">
                  {{ currentStep() }}%
                </span>
              </div>
              @if (currentStep() >= 100) {
                <div class="animate-scale-up px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm shadow-xl uppercase tracking-wider">
                  🏆 PERFECT CLEAR!
                </div>
              }
            </div>
          }

          <!-- Video / GIF Export Processing Overlay -->
          @if (isExporting()) {
            <div class="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3.5 animate-fade-in">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-purple-500/20 border-t-purple-400 animate-spin"></div>
              <div class="text-center px-4">
                <h4 class="text-sm sm:text-base font-black text-white flex items-center justify-center gap-2">
                  <span>{{ exportType() === 'video' ? '🎬 正在导出官方推广视频' : '🎞️ 正在合成真实棋盘 GIF' }}</span>
                  <span class="font-mono text-amber-300">{{ exportProgress() }}%</span>
                </h4>
                <p class="text-xs text-slate-400 mt-1">
                  {{ exportType() === 'video' ? (includePromoTrailer() ? '正在合成官网片头、1:1 真实棋盘推演与推广片尾...' : '正在导出真实棋盘推演视频...') : '100% 还原真实棋盘边框与提示数字，马上为您下载...' }}
                </p>
              </div>
              <div class="w-48 sm:w-64 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-100"
                     [style.width.%]="exportProgress()"></div>
              </div>
            </div>
          }

          <!-- Bottom Timecode & Watermark -->
          <div class="absolute bottom-3 inset-x-3.5 flex items-center justify-between text-[11px] sm:text-xs font-mono text-[var(--color-text-muted)] z-20 pointer-events-none">
            <span>00:{{ currentSecondFormatted() }} / 00:10</span>
            <span class="font-bold text-amber-500/90 tracking-wide">puzzlepk.com</span>
          </div>

          <!-- Interactive Timeline Scrubber Bar -->
          <div class="absolute bottom-0 inset-x-0 h-2 sm:h-2.5 bg-[var(--color-border-card)] hover:h-3.5 transition-all cursor-pointer z-30 group/bar"
               (click)="onScrub($event)">
            <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-75 relative"
                 [style.width.%]="currentStep()">
              <!-- Scrubber Thumb -->
              <span class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg group-hover/bar:scale-125 transition-transform"></span>
            </div>
          </div>
        </div>

        <!-- Promotion & Duration Options Toolbar -->
        @if (hasReplayMoves()) {
          <div class="flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs flex-wrap">
            <!-- Include Promo Trailer Toggle -->
            <label class="flex items-center gap-2 cursor-pointer select-none text-[var(--color-text-main)] font-bold">
              <input type="checkbox"
                     [checked]="includePromoTrailer()"
                     (change)="togglePromoTrailer()"
                     class="w-4 h-4 accent-purple-600 rounded cursor-pointer">
              <span class="flex items-center gap-1.5">
                <span>📣</span>
                <span>包含官方宣传片头+片尾</span>
              </span>
              <span class="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-400 font-mono font-bold border border-purple-500/30">
                推广引流
              </span>
            </label>

            <!-- Video Duration Mode Selector -->
            <div class="flex items-center gap-1.5 ml-auto">
              <span class="text-[var(--color-text-muted)] text-[11px] font-medium hidden sm:inline">推演时长:</span>
              <div class="flex items-center gap-1 bg-[var(--color-bg-card)] p-0.5 rounded-xl border border-[var(--color-border-card)]">
                <button (click)="setDurationMode('10s')"
                        class="px-2 py-0.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        [class.bg-purple-600]="durationMode() === '10s'"
                        [class.text-white]="durationMode() === '10s'"
                        [class.text-[var(--color-text-muted)]]="durationMode() !== '10s'"
                        title="10秒极速快节奏高光">
                  10s极速
                </button>
                <button (click)="setDurationMode('15s')"
                        class="px-2 py-0.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        [class.bg-purple-600]="durationMode() === '15s'"
                        [class.text-white]="durationMode() === '15s'"
                        [class.text-[var(--color-text-muted)]]="durationMode() !== '15s'"
                        title="15秒短视频推荐时长（抖音/B站/视频号最佳）">
                  15s短视频
                </button>
                <button (click)="setDurationMode('25s')"
                        class="px-2 py-0.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        [class.bg-purple-600]="durationMode() === '25s'"
                        [class.text-white]="durationMode() === '25s'"
                        [class.text-[var(--color-text-muted)]]="durationMode() !== '25s'"
                        title="25秒深度推演，慢节奏看清每步">
                  25s深度
                </button>
                <button (click)="setDurationMode('auto')"
                        class="px-2 py-0.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        [class.bg-purple-600]="durationMode() === 'auto'"
                        [class.text-white]="durationMode() === 'auto'"
                        [class.text-[var(--color-text-muted)]]="durationMode() !== 'auto'"
                        title="根据真实下棋时长智能自动延长推演">
                  ⚡自适应实际
                </button>
              </div>
            </div>
          </div>
        }

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
                      title="导出与真实棋盘完全相同的 10秒视频 (WebM/MP4)">
                <span>🎥</span>
                <span>导出视频</span>
              </button>

              <!-- 导出 GIF 动图 -->
              <button (click)="exportGif()" [disabled]="isExporting()"
                      class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-500 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="导出与真实棋盘完全相同的动画图片 (GIF 格式)">
                <span>🎞️</span>
                <span>导出 GIF</span>
              </button>

              <!-- 保存高清图片 (PNG) -->
              <button (click)="downloadArtwork()"
                      class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-secondary)] font-bold text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
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

        <!-- Feedback & Authenticity Banner -->
        <div class="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-500/20 text-xs text-[var(--color-text-secondary)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base sm:text-lg shrink-0">✨</span>
            <span class="leading-relaxed text-[11px] sm:text-xs">
              <strong>真实棋盘 100% 还原保障</strong>：回放界面、导出的视频 (MP4/WebM) 和 GIF 动图均严格遵循原版数织棋盘规范（边框、提示数字及完成划线），所看即所得！
            </span>
          </div>
        </div>

        @if (lastExportMsg()) {
          <div class="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between gap-2 animate-fade-in">
            <span class="leading-relaxed font-medium">{{ lastExportMsg() }}</span>
            <button (click)="lastExportMsg.set(null)" class="text-emerald-400 hover:text-emerald-200 font-bold px-1 cursor-pointer">✕</button>
          </div>
        }

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

  isExporting = signal(false);
  exportType = signal<'video' | 'gif'>('video');
  exportProgress = signal(0);
  lastExportMsg = signal<string | null>(null);

  includePromoTrailer = signal(true);
  durationMode = signal<'10s' | '15s' | '25s' | 'auto'>('15s');

  togglePromoTrailer() {
    this.includePromoTrailer.update(v => !v);
    this.haptic.vibrateLight();
  }

  setDurationMode(mode: '10s' | '15s' | '25s' | 'auto') {
    this.durationMode.set(mode);
    this.haptic.vibrateLight();
  }

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
    if (w <= 5) return 40;
    if (w <= 10) return 28;
    if (w <= 15) return 20;
    if (w <= 20) return 15;
    return 12;
  });

  readonly boardScale = computed(() => {
    const w = this.width();
    const h = this.height();
    const cellSize = this.replayCellSize();
    const maxRowHints = Math.max(1, ...(this.rowHints().map(r => r.length)));
    const maxColHints = Math.max(1, ...(this.colHints().map(c => c.length)));
    const approxW = maxRowHints * 18 + w * cellSize + 32;
    const approxH = maxColHints * 20 + h * cellSize + 32;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const targetW = isMobile ? Math.min(340, window.innerWidth - 48) : 680;
    const targetH = isMobile ? 320 : 450;
    const scaleX = targetW / Math.max(approxW, 1);
    const scaleY = targetH / Math.max(approxH, 1);
    return Math.min(1.2, Math.min(scaleX, scaleY));
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
      const current = NonogramEngine.getLineHints(row.map(c => c === 1 ? 1 : 0));
      return current.length === expected.length && current.every((v, i) => v === expected[i]);
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
      return current.length === expected.length && current.every((v, i) => v === expected[i]);
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

  /**
   * 获取当前网页激活主题的精准色彩，确保 Canvas 导出的色彩与 DOM 100% 像素级对齐
   */
  private getThemeColors() {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!isBrowser) {
      return {
        textMain: '#f8fafc',
        bgCard: '#1e293b',
        bgMain: '#0f172a',
        borderThick: '#334155',
        textMuted: '#64748b',
        roseCross: '#f43f5e'
      };
    }
    const root = document.documentElement;
    const style = window.getComputedStyle(root);
    const textMain = style.getPropertyValue('--color-text-main').trim() || '#f8fafc';
    const bgCard = style.getPropertyValue('--color-bg-card').trim() || '#1e293b';
    const bgMain = style.getPropertyValue('--color-bg-main').trim() || '#0f172a';
    const borderThick = style.getPropertyValue('--color-border-thick').trim() || '#334155';
    const textMuted = style.getPropertyValue('--color-text-muted').trim() || '#64748b';
    return {
      textMain,
      bgCard,
      bgMain,
      borderThick,
      textMuted,
      roseCross: '#f43f5e'
    };
  }

  /**
   * 100% 严格复刻真实棋盘规约绘制 Canvas 帧（供视频录制与 GIF 导出共用）
   */
  private renderRealBoardFrame(
    ctx: CanvasRenderingContext2D,
    size: number,
    grid: number[][],
    stepPct: number,
    moveIdx: number,
    lastMove?: any
  ) {
    const W = this.width();
    const H = this.height();
    const rowHints = this.rowHints();
    const colHints = this.colHints();
    const colors = this.getThemeColors();

    // 1. Stage Background (Clean & Authentic bgMain, exactly as surrounding page)
    ctx.fillStyle = colors.bgMain;
    ctx.fillRect(0, 0, size, size);

    // 2. Top Watermark Header
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(36, 36, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.textMuted;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REC • PUZZLE PK', 48, 41);

    ctx.fillStyle = colors.textMain;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数织高光时光倒流 · 10秒推演', size / 2, 41);

    ctx.textAlign = 'right';
    ctx.fillStyle = colors.textMuted;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`步数: ${moveIdx}/${this.totalMoves()}`, size - 36, 41);

    // 3. Board Geometry Calculation (Identical to CSS grid proportions)
    const maxRowHints = Math.max(1, ...(rowHints.map(r => r.length)));
    const maxColHints = Math.max(1, ...(colHints.map(c => c.length)));

    const availW = size - 70;
    const availH = size - 140;

    const colHintH = Math.max(46, maxColHints * 22 + 10);
    const rowHintW = Math.max(50, maxRowHints * 20 + 10);

    const cellSize = Math.floor(Math.min((availW - rowHintW) / W, (availH - colHintH) / H));

    const boardW = rowHintW + W * cellSize;
    const boardH = colHintH + H * cellSize;
    const startX = Math.floor((size - boardW) / 2);
    const startY = Math.floor(65 + (availH - boardH) / 2);

    const gridX = startX + rowHintW;
    const gridY = startY + colHintH;

    // Completed Row/Col check
    const compRows: boolean[] = rowHints.map((exp, y) => {
      const row = grid[y];
      if (!row) return false;
      const current = NonogramEngine.getLineHints(row.map(c => c === 1 ? 1 : 0));
      return current.length === exp.length && current.every((v, i) => v === exp[i]);
    });

    const compCols: boolean[] = colHints.map((exp, x) => {
      const col: number[] = [];
      for (let y = 0; y < H; y++) col.push(grid[y]?.[x] === 1 ? 1 : 0);
      const current = NonogramEngine.getLineHints(col);
      return current.length === exp.length && current.every((v, i) => v === exp[i]);
    });

    // 4. Board Card Background & Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = colors.bgCard;
    ctx.fillRect(startX, startY, boardW, boardH);
    ctx.restore();

    // 5. Draw Column Hints (Top)
    ctx.textAlign = 'center';
    for (let x = 0; x < W; x++) {
      const col = colHints[x] || [];
      const cx = gridX + x * cellSize + cellSize / 2;
      const isComp = compCols[x];

      const fontSize = Math.max(10, Math.min(20, Math.floor(cellSize * 0.46)));
      ctx.font = `900 ${fontSize}px "JetBrains Mono", monospace`;

      const stepY = Math.min(20, Math.floor(colHintH / Math.max(col.length, 1)));
      for (let i = 0; i < col.length; i++) {
        const hint = col[i];
        const hy = gridY - (col.length - 1 - i) * stepY - 6;

        ctx.save();
        if (isComp) {
          ctx.globalAlpha = 0.35; // Real game .opacity-35
        }
        ctx.fillStyle = colors.textMain;
        ctx.fillText(String(hint), cx, hy);

        if (isComp) {
          // Real game .line-through
          ctx.strokeStyle = colors.textMain;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cx - fontSize * 0.55, hy - fontSize * 0.3);
          ctx.lineTo(cx + fontSize * 0.55, hy - fontSize * 0.3);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5x5 subgrid vs 1x1 column lines
      ctx.strokeStyle = (x + 1) % 5 === 0 && x !== W - 1 ? colors.textMuted : colors.borderThick;
      ctx.lineWidth = (x + 1) % 5 === 0 && x !== W - 1 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(gridX + (x + 1) * cellSize, startY);
      ctx.lineTo(gridX + (x + 1) * cellSize, gridY);
      ctx.stroke();
    }

    // 6. Draw Row Hints (Left)
    ctx.textAlign = 'right';
    for (let y = 0; y < H; y++) {
      const row = rowHints[y] || [];
      const cy = gridY + y * cellSize + cellSize / 2 + 5;
      const isComp = compRows[y];

      const fontSize = Math.max(10, Math.min(20, Math.floor(cellSize * 0.44)));
      ctx.font = `900 ${fontSize}px "JetBrains Mono", monospace`;

      const stepX = Math.min(22, Math.floor(rowHintW / Math.max(row.length, 1)));
      let rx = gridX - 8;
      for (let i = row.length - 1; i >= 0; i--) {
        const hint = row[i];

        ctx.save();
        if (isComp) {
          ctx.globalAlpha = 0.35; // Real game .opacity-35
        }
        ctx.fillStyle = colors.textMain;
        ctx.fillText(String(hint), rx, cy);

        if (isComp) {
          // Real game .line-through
          ctx.strokeStyle = colors.textMain;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(rx - fontSize * 0.9, cy - fontSize * 0.3);
          ctx.lineTo(rx + 2, cy - fontSize * 0.3);
          ctx.stroke();
        }
        ctx.restore();
        rx -= stepX;
      }

      // 5x5 subgrid vs 1x1 row lines
      ctx.strokeStyle = (y + 1) % 5 === 0 && y !== H - 1 ? colors.textMuted : colors.borderThick;
      ctx.lineWidth = (y + 1) % 5 === 0 && y !== H - 1 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(startX, gridY + (y + 1) * cellSize);
      ctx.lineTo(gridX, gridY + (y + 1) * cellSize);
      ctx.stroke();
    }

    // 7. Draw Cells (Solid textMain, Real ✕ Marks)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = grid[y]?.[x] || 0;
        const cx = gridX + x * cellSize;
        const cy = gridY + y * cellSize;

        if (cell === 1) {
          // Real game: bg-[var(--color-text-main)]
          ctx.fillStyle = colors.textMain;
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
        } else if (cell === 2) {
          // Real game: bg-[var(--color-bg-card)] with rose-500 ✕
          ctx.fillStyle = colors.bgCard;
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);

          ctx.strokeStyle = colors.roseCross;
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
          ctx.fillStyle = colors.bgCard;
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }

    // 8. Draw Grid Lines (1x1 thin lines & 5x5 bold lines)
    ctx.strokeStyle = colors.borderThick;
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

    // Bold 5x5 subgrid boundary lines (Real game: 2px solid textMuted)
    ctx.strokeStyle = colors.textMuted;
    ctx.lineWidth = 2;
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

    // 9. Exact 3px Solid Main Borders (Real game: 3px solid var(--color-text-main))
    ctx.strokeStyle = colors.textMain;
    ctx.lineWidth = 3;

    // Col hints top outer frame
    ctx.strokeRect(gridX, startY, W * cellSize, colHintH);
    // Row hints left outer frame
    ctx.strokeRect(startX, gridY, rowHintW, H * cellSize);
    // Cells grid outer frame
    ctx.strokeRect(gridX, gridY, W * cellSize, H * cellSize);

    // 10. Active Cursor Beacon on last moved cell
    if (lastMove && lastMove.x < W && lastMove.y < H && stepPct < 100) {
      const lcx = gridX + lastMove.x * cellSize;
      const lcy = gridY + lastMove.y * cellSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(lcx - 1, lcy - 1, cellSize + 2, cellSize + 2);
    }

    // 11. Celebration Stamp when 100%
    if (stepPct >= 100) {
      ctx.save();
      const badgeW = 320;
      const badgeH = 54;
      const bx = (size - badgeW) / 2;
      const by = (size - badgeH) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 27);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 PERFECT CLEAR!', size / 2, by + 34);
      ctx.restore();
    }

    // 12. Bottom Footer Timecode & Watermark
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.textMuted;
    ctx.font = '13px monospace';
    const s = Math.min(10, Math.floor(stepPct / 10));
    ctx.fillText(`00:${s < 10 ? '0' + s : s} / 00:10`, 36, size - 24);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('puzzlepk.com', size - 36, size - 24);
  }

  private safeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  /**
   * 渲染官方 PWA 原生品牌极简片头（1:1 复刻 PWA 纯白极简启动屏 + 精美游戏标识 + 醒目官网地址）
   */
  private renderIntroFrame(ctx: CanvasRenderingContext2D, size: number, progress: number) {
    const baseSize = 720;
    const scale = size / baseSize;

    ctx.save();
    ctx.scale(scale, scale);

    // 0. PWA 启动过渡效果：在片头即将结束时平滑放大并淡出，与 PWA 原生启动屏淡出握手完全一致
    let globalAlpha = 1.0;
    if (progress > 0.82) {
      const fadeProgress = (progress - 0.82) / 0.18; // 0 ~ 1
      globalAlpha = Math.max(0, 1 - fadeProgress * 0.95);
      const scaleUp = 1 + fadeProgress * 0.03;
      ctx.translate(baseSize / 2, baseSize / 2);
      ctx.scale(scaleUp, scaleUp);
      ctx.translate(-baseSize / 2, -baseSize / 2);
    }
    ctx.globalAlpha = globalAlpha;

    // 1. PWA 原生纯净轻奢白色底色 (#ffffff)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseSize, baseSize);

    // Logo 背后柔和科技青紫霓虹光晕 (1:1 还原 PWA 启动屏柔光)
    const radGlow = ctx.createRadialGradient(360, 175, 20, 360, 175, 180);
    radGlow.addColorStop(0, 'rgba(34, 211, 238, 0.28)');
    radGlow.addColorStop(0.45, 'rgba(59, 130, 246, 0.18)');
    radGlow.addColorStop(0.75, 'rgba(168, 85, 247, 0.10)');
    radGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(360, 175, 180, 0, Math.PI * 2);
    ctx.fill();

    // 2. 项目原生 PWA 晶体微拟物盾牌 Logo
    const logoSize = 140;
    const logoR = 40;
    const lx = (baseSize - logoSize) / 2; // 290
    const ly = 105;

    // 晶体卡槽半透明磨砂背景
    const bgGrad = ctx.createLinearGradient(lx, ly, lx + logoSize, ly + logoSize);
    bgGrad.addColorStop(0, 'rgba(34, 211, 238, 0.22)');
    bgGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.16)');
    bgGrad.addColorStop(1, 'rgba(168, 85, 247, 0.14)');
    this.safeRoundRect(ctx, lx, ly, logoSize, logoSize, logoR);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 晶体外边框发光渐变 (青 -> 蓝 -> 紫)
    const borderGrad = ctx.createLinearGradient(lx, ly, lx + logoSize, ly + logoSize);
    borderGrad.addColorStop(0, 'rgba(34, 211, 238, 0.85)');
    borderGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.65)');
    borderGrad.addColorStop(1, 'rgba(168, 85, 247, 0.8)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // 内部虚线微拟物同心环 (1:1 还原 PWA SVG stroke-dasharray)
    this.safeRoundRect(ctx, lx + 6, ly + 6, logoSize - 12, logoSize - 12, logoR - 4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 盾牌内部装饰星点
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(lx + 28, ly + 28, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(lx + logoSize - 28, ly + 28, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // 核心 PK 矢量大字（倾斜、超粗、青蓝紫渐变）
    const pkGrad = ctx.createLinearGradient(lx + 15, ly + 20, lx + logoSize - 15, ly + logoSize - 20);
    pkGrad.addColorStop(0, '#22d3ee');
    pkGrad.addColorStop(0.45, '#3b82f6');
    pkGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = pkGrad;
    ctx.font = 'italic 900 78px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PK', 360, ly + 98);

    // 3. 品牌大字 (Puzzle PK 双色渐变)
    const titleY = ly + logoSize + 48; // 293
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    const brandGrad = ctx.createLinearGradient(250, titleY, 470, titleY);
    brandGrad.addColorStop(0, '#0284c7');
    brandGrad.addColorStop(0.55, '#2563eb');
    brandGrad.addColorStop(1, '#9333ea');
    ctx.fillStyle = brandGrad;
    ctx.fillText('Puzzle PK', 360, titleY);

    // 4. 品牌副标 (Brain Games & Logic Arena)
    ctx.fillStyle = '#64748b';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Brain Games & Logic Arena', 360, titleY + 28);

    // 5. 优雅游戏胶囊（表明这是什么游戏）
    const gamePillW = 230;
    const gamePillH = 32;
    const gamePillX = (baseSize - gamePillW) / 2;
    const gamePillY = titleY + 42; // 363
    this.safeRoundRect(ctx, gamePillX, gamePillY, gamePillW, gamePillH, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 数织 · NONOGRAM', 360, gamePillY + 21);

    // 6. 水晶轻奢官方网址与站名胶囊（高端、大气、大方，与 PWA 极简纯白光感一体化）
    const urlPillW = 440;
    const urlPillH = 48;
    const urlPillX = (baseSize - urlPillW) / 2;
    const urlPillY = gamePillY + 46; // 409
    const urlPillR = 24;

    // 胶囊外围超柔弥散微光投影
    ctx.save();
    ctx.shadowColor = 'rgba(99, 102, 241, 0.10)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    // 纯白微蓝渐变磨砂质感底色
    const pillBgGrad = ctx.createLinearGradient(urlPillX, urlPillY, urlPillX + urlPillW, urlPillY + urlPillH);
    pillBgGrad.addColorStop(0, '#ffffff');
    pillBgGrad.addColorStop(0.5, '#f8fafc');
    pillBgGrad.addColorStop(1, '#f1f5f9');
    this.safeRoundRect(ctx, urlPillX, urlPillY, urlPillW, urlPillH, urlPillR);
    ctx.fillStyle = pillBgGrad;
    ctx.fill();
    ctx.restore();

    // 胶囊水晶微光渐变边框 (青 -> 蓝 -> 紫)
    const urlBorder = ctx.createLinearGradient(urlPillX, urlPillY, urlPillX + urlPillW, urlPillY);
    urlBorder.addColorStop(0, 'rgba(34, 211, 238, 0.7)');
    urlBorder.addColorStop(0.5, 'rgba(59, 130, 246, 0.55)');
    urlBorder.addColorStop(1, 'rgba(168, 85, 247, 0.7)');
    this.safeRoundRect(ctx, urlPillX, urlPillY, urlPillW, urlPillH, urlPillR);
    ctx.strokeStyle = urlBorder;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 网址与站名内容排版：“puzzlepk.com 益智游戏PK网”
    const globeStr = '🌐 ';
    const domainStr = 'puzzlepk.com';
    const divStr = '  |  ';
    const siteNameStr = '益智游戏PK网';

    ctx.font = '900 19px monospace';
    const domainW = ctx.measureText(domainStr).width;

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const globeW = ctx.measureText(globeStr).width;
    const divW = ctx.measureText(divStr).width;
    const nameW = ctx.measureText(siteNameStr).width;

    const totalContentW = globeW + domainW + divW + nameW;
    let curX = 360 - totalContentW / 2;
    const contentY = urlPillY + 30;

    // 绘制地球仪图标
    ctx.textAlign = 'left';
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText('🌐', curX, contentY - 1);
    curX += globeW;

    // 绘制官网域名（采用官方品牌电光青至靛蓝渐变高奢质感）
    const domainGrad = ctx.createLinearGradient(curX, contentY, curX + domainW, contentY);
    domainGrad.addColorStop(0, '#0284c7');
    domainGrad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = domainGrad;
    ctx.font = '900 19px monospace';
    ctx.fillText(domainStr, curX, contentY);
    curX += domainW;

    // 绘制精致竖直分割线
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '300 14px sans-serif';
    ctx.fillText(divStr, curX, contentY - 1);
    curX += divW;

    // 绘制官方中文站名（沉稳大方深曜石灰）
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(siteNameStr, curX, contentY);

    // 7. PWA 启动加载轨道 (1:1 还原 Image 2 的 pwa-splash-track 浅灰底 + 青蓝紫激光条)
    const trackW = 250;
    const trackH = 5;
    const trackX = (baseSize - trackW) / 2;
    const trackY = urlPillY + 70; // 479

    // 浅灰底色轨道
    this.safeRoundRect(ctx, trackX, trackY, trackW, trackH, 2.5);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // 动态滑动/填充的渐变激光光条
    const fillW = Math.max(16, trackW * Math.min(1, progress * 1.15));
    const barGrad = ctx.createLinearGradient(trackX, trackY, trackX + trackW, trackY);
    barGrad.addColorStop(0, '#06b6d4');
    barGrad.addColorStop(0.5, '#3b82f6');
    barGrad.addColorStop(1, '#a855f7');
    this.safeRoundRect(ctx, trackX, trackY, fillW, trackH, 2.5);
    ctx.fillStyle = barGrad;
    ctx.fill();

    // 极简倒计时提示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('极速推演即将开始...', 360, trackY + 28);

    // 底部极简官方水印
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('puzzlepk.com · Official Game Replay', 360, baseSize - 24);

    ctx.restore();
  }

  /**
   * 渲染官方高光片尾（展示终局像素杰作原图 + 详细对局数据统计 + 殿堂收录 + 强转化引流）
   */
  private renderOutroFrame(ctx: CanvasRenderingContext2D, size: number, progress: number) {
    const baseSize = 720;
    const scale = size / baseSize;

    ctx.save();
    ctx.scale(scale, scale);

    // 1. 曜石底色 + 暖金/紫色胜者光晕
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, baseSize, baseSize);

    const grad = ctx.createRadialGradient(360, 330, 40, 360, 330, baseSize * 0.7);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.16)');
    grad.addColorStop(1, 'rgba(8, 13, 26, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, baseSize, baseSize);

    // 点阵暗纹
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let gx = 36; gx < baseSize; gx += 36) {
      for (let gy = 36; gy < baseSize; gy += 36) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. 顶部 HUD 导航栏
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(36, 36, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REC • PUZZLE PK', 48, 41);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🏆 巅峰挑战圆满通关 · 终局成果展', 360, 41);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('puzzlepk.com 🌐', baseSize - 36, 41);

    // 3. 舞台区：左右双展台卡片布局 (Y = 62 ~ 432, Height = 370px)
    const W = this.width();
    const H = this.height();
    const finalGrid = this.replayData?.finalGrid || this.buildGridForMoveCount(this.totalMoves(), true);

    // === 左侧卡片：终局像素杰作原图展台 (Width: 290px, Height: 370px) ===
    const leftX = 35;
    const leftY = 62;
    const leftW = 290;
    const leftH = 370;

    this.safeRoundRect(ctx, leftX, leftY, leftW, leftH, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 左卡片顶部小徽章
    const lPillW = 210;
    const lPillH = 28;
    const lpx = leftX + (leftW - lPillW) / 2;
    const lpy = leftY + 14;
    this.safeRoundRect(ctx, lpx, lpy, lPillW, lPillH, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎨 终局像素杰作 · 完整呈现', leftX + leftW / 2, lpy + 19);

    // 绘制像素画作真实缩略图
    const maxArtW = 210;
    const maxArtH = 210;
    const cellSize = Math.max(4, Math.floor(Math.min(maxArtW / W, maxArtH / H)));
    const artW = W * cellSize;
    const artH = H * cellSize;
    const artX = Math.round(leftX + (leftW - artW) / 2);
    const artY = Math.round(leftY + 48 + (maxArtH - artH) / 2);

    this.safeRoundRect(ctx, artX - 5, artY - 5, artW + 10, artH + 10, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const val = finalGrid[y]?.[x];
        const cx = artX + x * cellSize;
        const cy = artY + y * cellSize;
        if (val === 1) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx, cy, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cellSize, cellSize);
        }
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, cy, cellSize, cellSize);
      }
    }

    // 左卡片底部战绩标
    const artBadgeY = leftY + leftH - 46;
    this.safeRoundRect(ctx, leftX + 16, artBadgeY, leftW - 32, 32, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✨ 全部 ${this.totalMoves()} 步推演无误 · 完美通关`, leftX + leftW / 2, artBadgeY + 21);

    // === 右侧卡片：赛事级高光认证与对局数据统计 (Width: 350px, Height: 370px) ===
    const rightX = 335;
    const rightY = 62;
    const rightW = 350;
    const rightH = 370;

    this.safeRoundRect(ctx, rightX, rightY, rightW, rightH, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 右卡片顶部官方胶囊
    const rBadgeW = 260;
    const rBadgeH = 30;
    const rbx = rightX + (rightW - rBadgeW) / 2;
    const rby = rightY + 14;
    this.safeRoundRect(ctx, rbx, rby, rBadgeW, rBadgeH, 15);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#c7d2fe';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ PUZZLE PK · 官方认证战绩', rightX + rightW / 2, rby + 20);

    // 游戏大标题与副标
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('数织 NONOGRAM', rightX + rightW / 2, rightY + 76);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('高光破局 · 极限时光倒流推演', rightX + rightW / 2, rightY + 98);

    // 3 条赛事级对局规格指标条 (Chips)
    const chips = [
      { icon: '📐', label: '谜盘规格', value: `${W} × ${H} 网格` },
      { icon: '⏱️', label: '破局用时', value: this.statSummary || '01:19' },
      { icon: '🎯', label: '推演步数', value: `${this.totalMoves()} 步零失误` }
    ];

    const chipYStart = rightY + 114;
    const chipH = 44;
    for (let i = 0; i < chips.length; i++) {
      const cy = chipYStart + i * (chipH + 8);
      const chip = chips[i];

      this.safeRoundRect(ctx, rightX + 16, cy, rightW - 32, chipH, 12);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(chip.icon, rightX + 28, cy + 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(chip.label, rightX + 58, cy + 28);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(chip.value, rightX + rightW - 28, cy + 28);
    }

    // 挑战与域名按钮
    const btnW = 310;
    const btnH = 46;
    const bx = rightX + (rightW - btnW) / 2;
    const by = rightY + 276;
    this.safeRoundRect(ctx, bx, by, btnW, btnH, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.fillStyle = '#090d16';
    ctx.font = '900 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('👉 来挑战：puzzlepk.com 👈', rightX + rightW / 2, by + 30);

    // 右卡片底部殿堂认证标
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('⭐ 益智极限殿堂收录 · 破局战绩核验保真', rightX + rightW / 2, rightY + rightH - 16);

    // 4. 底部推广引流大卡片 (Y = 450 ~ 580, Height = 130px)
    const bottomX = 35;
    const bottomY = 450;
    const bottomW = 650;
    const bottomH = 130;

    this.safeRoundRect(ctx, bottomX, bottomY, bottomW, bottomH, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🔥 官网直达：puzzlepk.com · 浏览器打开即玩', baseSize / 2, bottomY + 40);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('⚡ 扫雷 · 数织 · 数独 · 俄罗斯方块 · 推箱子 · 24点 · 全网高手对决', baseSize / 2, bottomY + 74);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✨ 零下载安装 · 零广告干扰 · 手机电脑随时开战 · 实时排位榜', baseSize / 2, bottomY + 104);

    // 5. 底部版权与访问水印
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('puzzlepk.com · Play Online Anytime · Official Game Replay', baseSize / 2, baseSize - 24);

    ctx.restore();
  }

  /**
   * 导出官方推广视频 (MP4 / WebM，可选择包含网站宣传片头与片尾，并支持时长定制)
   */
  async exportVideo() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('video');
    this.exportProgress.set(3);
    this.lastExportMsg.set(null);
    this.haptic.vibrateLight();
    this.pausePlayback();

    let offscreenCanvas: HTMLCanvasElement | null = null;

    try {
      if (typeof MediaRecorder === 'undefined') {
        alert('当前浏览器环境暂未开放 MediaRecorder 视频录制 API，已为您自动转为导出超清 GIF 动图！');
        await this.exportGif();
        return;
      }

      const hasPromo = this.includePromoTrailer();
      const mode = this.durationMode();

      // 1. 优选 MP4（原生兼容 Windows Media Player、Mac QuickTime、iOS、Android、微信及常见播放器）
      const candidateTypes = [
        { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { mime: 'video/mp4;codecs=h264', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
        { mime: 'video/webm;codecs=h264', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8', ext: 'webm' },
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' }
      ];

      let selectedMime = '';
      let fileExt = 'webm';

      for (const item of candidateTypes) {
        if (MediaRecorder.isTypeSupported(item.mime)) {
          selectedMime = item.mime;
          fileExt = item.ext;
          break;
        }
      }

      if (!selectedMime && MediaRecorder.isTypeSupported('video/mp4')) {
        selectedMime = 'video/mp4';
        fileExt = 'mp4';
      } else if (!selectedMime && MediaRecorder.isTypeSupported('video/webm')) {
        selectedMime = 'video/webm';
        fileExt = 'webm';
      }

      const size = 720;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      // 挂载至屏幕外，确保合成器为 captureStream 稳定提供时钟
      canvas.style.position = 'fixed';
      canvas.style.left = '-9999px';
      canvas.style.top = '-9999px';
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.opacity = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '-9999';
      document.body.appendChild(canvas);
      offscreenCanvas = canvas;

      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      // 计算不同时长模式下的推演帧数
      let boardCount = 55; // 15s 推荐模式
      if (mode === '10s') {
        boardCount = 36;
      } else if (mode === '25s') {
        boardCount = 90;
      } else if (mode === 'auto') {
        // 根据实际游戏用时 durationMs 动态自适应延长推演帧数
        const realSec = Math.round((this.replayData?.durationMs || 30000) / 1000);
        boardCount = Math.max(35, Math.min(100, Math.round(realSec * 0.75 + this.totalMoves() * 0.35)));
      }

      const introCount = hasPromo ? 22 : 0; // 约 1.8s 片头
      const outroCount = hasPromo ? 28 : 0; // 约 2.3s 片尾
      const holdCount = hasPromo ? 8 : 14;   // 棋盘解开定格
      const totalFrames = introCount + boardCount + holdCount + outroCount;

      // 预先渲染第 0 帧缓冲
      if (hasPromo) {
        this.renderIntroFrame(ctx, size, 0);
      } else {
        const initialGrid = this.buildGridForMoveCount(0, false);
        this.renderRealBoardFrame(ctx, size, initialGrid, 0, 0, undefined);
      }

      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0] as any;
      if (track?.requestFrame) {
        track.requestFrame();
      }

      const recorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 3500000 } : undefined
      );
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordStartTime = Date.now();
      recorder.start(100);

      let currentRecordedFrame = 0;

      // 1. 录制官方宣传片头
      if (hasPromo) {
        for (let i = 0; i < introCount; i++) {
          const p = i / (introCount - 1);
          this.renderIntroFrame(ctx, size, p);
          if (track?.requestFrame) track.requestFrame();
          currentRecordedFrame++;
          this.exportProgress.set(Math.round((currentRecordedFrame / totalFrames) * 92));
          await new Promise(r => setTimeout(r, 65));
        }
      }

      // 2. 录制 1:1 真实数织棋盘步数还原推演
      for (let i = 0; i <= boardCount; i++) {
        const stepPct = Math.round((i / boardCount) * 100);
        const moveIdx = Math.min(this.totalMoves(), Math.floor((stepPct / 100) * this.totalMoves()));
        const frameGrid = this.buildGridForMoveCount(moveIdx, stepPct >= 100);
        const lastM = moveIdx > 0 ? this.replayData.moves[moveIdx - 1] : undefined;

        this.renderRealBoardFrame(ctx, size, frameGrid, stepPct, moveIdx, lastM);
        if (track?.requestFrame) track.requestFrame();
        currentRecordedFrame++;
        this.exportProgress.set(Math.round((currentRecordedFrame / totalFrames) * 92));
        await new Promise(r => setTimeout(r, 65));
      }

      // 3. 终局棋盘与胜利大标定格
      for (let j = 0; j < holdCount; j++) {
        if (track?.requestFrame) track.requestFrame();
        currentRecordedFrame++;
        this.exportProgress.set(Math.round((currentRecordedFrame / totalFrames) * 92));
        await new Promise(r => setTimeout(r, 80));
      }

      // 4. 录制官方宣传片尾（高转化引流）
      if (hasPromo) {
        for (let i = 0; i < outroCount; i++) {
          const p = i / (outroCount - 1);
          this.renderOutroFrame(ctx, size, p);
          if (track?.requestFrame) track.requestFrame();
          currentRecordedFrame++;
          this.exportProgress.set(Math.round((currentRecordedFrame / totalFrames) * 92));
          await new Promise(r => setTimeout(r, 65));
        }
      }

      this.exportProgress.set(95);
      const recordDuration = Math.max(1000, Date.now() - recordStartTime);

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const finalMime = selectedMime || (fileExt === 'mp4' ? 'video/mp4' : 'video/webm');
          const rawBlob = new Blob(chunks, { type: finalMime });
          resolve(rawBlob);
        };
      });

      recorder.stop();
      let finalBlob = await recordPromise;

      // 5. 若为 WebM，补全 EBML Segment Info 时长元数据
      if (fileExt === 'webm' || (finalBlob.type && finalBlob.type.includes('webm'))) {
        try {
          finalBlob = await fixWebmDuration(finalBlob, recordDuration, { logger: false });
        } catch (err) {
          console.warn('fixWebmDuration error, fallback to raw blob:', err);
        }
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `puzzlepk-nonogram-${Date.now()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);

      this.exportProgress.set(100);
      this.audio.playWin();
      this.haptic.vibrateSuccess();

      if (hasPromo) {
        this.lastExportMsg.set(`✅ 包含官方片头片尾的推广视频导出成功！格式为 .${fileExt}，可直接分享至短视频平台或群聊！`);
      } else {
        this.lastExportMsg.set(`✅ 纯棋盘推演视频导出成功！格式为 .${fileExt}。`);
      }
    } catch (e) {
      console.error('Failed to export video:', e);
      alert('导出视频失败，请尝试导出 GIF 动图。');
    } finally {
      if (offscreenCanvas && offscreenCanvas.parentNode) {
        offscreenCanvas.parentNode.removeChild(offscreenCanvas);
      }
      setTimeout(() => this.isExporting.set(false), 500);
    }
  }

  /**
   * 导出 100% 真实棋盘动图 (GIF)，支持选择是否包含官方片头片尾
   */
  async exportGif() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('gif');
    this.exportProgress.set(5);
    this.lastExportMsg.set(null);
    this.haptic.vibrateLight();
    this.pausePlayback();

    try {
      const size = 480;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Context not found');

      const colors = this.getThemeColors();
      const customPalette = [
        parseHexRgb(colors.bgMain, [15, 23, 42]),
        parseHexRgb(colors.bgCard, [30, 41, 59]),
        parseHexRgb(colors.textMain, [248, 250, 252]),
        parseHexRgb(colors.borderThick, [51, 65, 85]),
        parseHexRgb(colors.textMuted, [100, 116, 139]),
        [244, 63, 94],  // roseCross
        [245, 158, 11], // amberGold
        [56, 189, 248], // skyBeacon
        [255, 255, 255],
        [0, 0, 0],
        [16, 185, 129],
        [239, 68, 68],
        [99, 102, 241],
        [71, 85, 105],
        [148, 163, 184],
        [2, 6, 23]
      ];

      const hasPromo = this.includePromoTrailer();
      const encoder = new MiniGifEncoder(size, size, customPalette);

      // 片头（2帧，适度停留展示品牌）
      if (hasPromo) {
        this.renderIntroFrame(ctx, size, 0.4);
        encoder.addFrame(ctx.getImageData(0, 0, size, size).data, 60);
        this.renderIntroFrame(ctx, size, 1.0);
        encoder.addFrame(ctx.getImageData(0, 0, size, size).data, 60);
      }

      // 棋盘推演（18帧，流畅还原）
      const totalSteps = 18;
      for (let i = 0; i < totalSteps; i++) {
        const stepPct = Math.round((i / (totalSteps - 1)) * 100);
        const moveIdx = Math.min(this.totalMoves(), Math.floor((stepPct / 100) * this.totalMoves()));
        const frameGrid = this.buildGridForMoveCount(moveIdx, stepPct >= 100);
        const lastM = moveIdx > 0 ? this.replayData.moves[moveIdx - 1] : undefined;

        this.renderRealBoardFrame(ctx, size, frameGrid, stepPct, moveIdx, lastM);

        const imageData = ctx.getImageData(0, 0, size, size);
        const delay = (i === totalSteps - 1 && !hasPromo) ? 100 : 16;
        encoder.addFrame(imageData.data, delay);

        this.exportProgress.set(Math.round(20 + ((i + 1) / totalSteps) * 60));
        await new Promise(r => setTimeout(r, 15));
      }

      // 片尾（2帧，适度停留展示推广网址）
      if (hasPromo) {
        this.renderOutroFrame(ctx, size, 0.4);
        encoder.addFrame(ctx.getImageData(0, 0, size, size).data, 70);
        this.renderOutroFrame(ctx, size, 1.0);
        encoder.addFrame(ctx.getImageData(0, 0, size, size).data, 90);
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
      if (hasPromo) {
        this.lastExportMsg.set('✅ 包含官方推广片头片尾的 GIF 动图导出成功！所见即所得。');
      } else {
        this.lastExportMsg.set('✅ 真实棋盘 GIF 动画导出成功！所见即所得。');
      }
    } catch (e) {
      console.error('Failed to export GIF:', e);
      alert('导出 GIF 失败，请重试。');
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

      const colors = this.getThemeColors();
      ctx.fillStyle = colors.bgCard;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grid = this.currentReplayGrid();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (grid[y]?.[x] === 1) {
            ctx.fillStyle = colors.textMain;
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

  private buildGridForMoveCount(targetMoves: number, isFinal: boolean): number[][] {
    const W = this.width();
    const H = this.height();
    const moves = this.replayData?.moves || [];
    const grid: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));

    for (let i = 0; i < targetMoves; i++) {
      const m = moves[i];
      if (m && m.y < H && m.x < W) {
        grid[m.y][m.x] = m.state;
      }
    }

    if (isFinal && this.replayData?.finalGrid) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          grid[y][x] = this.replayData.finalGrid[y]?.[x] ?? grid[y][x];
        }
      }
    }

    return grid;
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
