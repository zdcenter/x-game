import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
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
    // Header: GIF89a
    const h = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    for (const b of h) this.out.push(b);

    // Logical Screen Descriptor
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.out.push(0xF3); // Global color table flag = 1, 16 colors (2^(3+1))
    this.out.push(0);    // Background color index = 0
    this.out.push(0);    // Pixel aspect ratio

    // Global Color Table (16 * 3 = 48 bytes)
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
    // Graphic Control Extension
    this.out.push(0x21, 0xF9, 0x04);
    this.out.push(0x04); // Disposal method: restore to background
    this.writeShort(delayHundredths);
    this.out.push(0);    // Transparent color index
    this.out.push(0x00); // Block terminator

    // Image Descriptor
    this.out.push(0x2C);
    this.writeShort(0); // Left
    this.writeShort(0); // Top
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.out.push(0x00); // No local color table

    // Map RGBA to 4-bit palette indexes
    const indexed = new Uint8Array(this.width * this.height);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      indexed[j] = this.findClosestColor(pixels[i], pixels[i + 1], pixels[i + 2]);
    }

    // LZW Encode (min code size = 4)
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
    this.out.push(0x3B); // GIF Trailer
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
  styles: [`
    .nonogram-replay-board {
      display: grid;
    }
    .col-hints {
      grid-column: 2;
      grid-row: 1;
      display: grid;
      border-top: 2.5px solid var(--color-border-card);
      border-left: 2.5px solid var(--color-border-card);
      border-right: 2.5px solid var(--color-border-card);
    }
    .col-hint-item {
      font-size: clamp(9px, calc(var(--cell-size) * 0.46), 20px);
      border-right: 1px solid var(--color-border-card);
    }
    .col-hint-item.thick-r {
      border-right: 2.5px solid var(--color-text-muted);
    }
    .row-hints {
      grid-column: 1;
      grid-row: 2;
      display: grid;
      border-top: 2.5px solid var(--color-border-card);
      border-left: 2.5px solid var(--color-border-card);
      border-bottom: 2.5px solid var(--color-border-card);
    }
    .row-hint-item {
      font-size: clamp(9px, calc(var(--cell-size) * 0.46), 20px);
      border-bottom: 1px solid var(--color-border-card);
    }
    .row-hint-item.thick-b {
      border-bottom: 2.5px solid var(--color-text-muted);
    }
    .cells-grid {
      grid-column: 2;
      grid-row: 2;
      display: grid;
      border: 2.5px solid var(--color-text-main);
    }
    .cell {
      border-right: 1px solid var(--color-border-card);
      border-bottom: 1px solid var(--color-border-card);
      box-sizing: border-box;
    }
    .cell.thick-r {
      border-right: 2.5px solid var(--color-text-muted);
    }
    .cell.thick-b {
      border-bottom: 2.5px solid var(--color-text-muted);
    }
  `],
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

        <!-- Replay Stage / Theater Screen (Substantially Enlarged Resolution) -->
        <div class="relative w-full h-[380px] sm:h-[460px] md:h-[520px] rounded-2xl bg-slate-950/95 border border-purple-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4 group">
          
          <!-- Top Watermark & HUD -->
          <div class="absolute top-2.5 left-3.5 flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-black text-white/70 tracking-wider z-20 pointer-events-none">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span>REC • PUZZLE PK</span>
          </div>

          <!-- Top Center View Mode Switcher -->
          @if (hasReplayMoves()) {
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-0.5 z-20 shadow-md">
              <button (click)="viewMode.set('real')"
                      class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'real'"
                      [class.text-white]="viewMode() === 'real'"
                      [class.text-slate-400]="viewMode() !== 'real'">
                📋 真实棋盘
              </button>
              <button (click)="viewMode.set('art')"
                      class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                      [class.bg-purple-600]="viewMode() === 'art'"
                      [class.text-white]="viewMode() === 'art'"
                      [class.text-slate-400]="viewMode() !== 'art'">
                🎨 纯净画作
              </button>
            </div>
          }

          <!-- Top Right Step Counter & Speed -->
          <div class="absolute top-2.5 right-3.5 flex items-center gap-2 z-20 pointer-events-none">
            @if (hasReplayMoves()) {
              <div class="px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] sm:text-xs font-mono text-purple-300 font-bold">
                {{ currentMoveIndex() }}/{{ totalMoves() }} 步
              </div>
            }
            <div class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-500/30 border border-purple-400/50 text-[10px] sm:text-xs font-mono font-black text-purple-300">
              {{ speed() }}x
            </div>
          </div>

          <!-- Core Replay Stage Content -->
          @if (hasReplayMoves()) {
            <div class="relative flex items-center justify-center w-full h-full my-auto z-10 overflow-hidden py-2">
              
              <!-- Mode 1: 真实棋盘 (含顶部列提示、左侧行提示、完成动态划线) -->
              @if (viewMode() === 'real') {
                <div class="flex items-center justify-center transition-transform duration-150"
                     [style.transform]="'scale(' + boardScale() + ')'"
                     style="transform-origin: center center;">
                  <div class="nonogram-replay-board select-none shadow-2xl rounded-xl overflow-hidden border border-[var(--color-border-card)]"
                       [style.--cell-size.px]="replayCellSize()"
                       [style.grid-template-columns]="'max-content max-content'"
                       [style.grid-template-rows]="'max-content max-content'">
                    
                    <!-- Top-Left blank corner -->
                    <div class="bg-[var(--color-bg-card)]"></div>

                    <!-- Col Hints (Top) -->
                    <div class="col-hints bg-[var(--color-bg-card)]"
                         [style.grid-template-columns]="'repeat(' + width() + ', ' + replayCellSize() + 'px)'">
                      <div *ngFor="let col of colHints(); let x = index"
                           class="col-hint-item flex flex-col justify-end items-center pb-1 text-[var(--color-text-main)] font-black select-none"
                           [class.thick-r]="(x + 1) % 5 === 0 && x !== width() - 1"
                           [class.no-border-r]="x === width() - 1"
                           [class.bg-emerald-500/10]="completedCols()[x]">
                        <span *ngFor="let hint of col"
                              class="font-mono font-black leading-none py-0.5 sm:py-1 transition-all"
                              [class.line-through]="completedCols()[x]"
                              [class.opacity-35]="completedCols()[x]"
                              [class.text-emerald-400]="completedCols()[x]">{{ hint }}</span>
                      </div>
                    </div>

                    <!-- Row Hints (Left) -->
                    <div class="row-hints bg-[var(--color-bg-card)]"
                         [style.grid-template-rows]="'repeat(' + height() + ', ' + replayCellSize() + 'px)'">
                      <div *ngFor="let row of rowHints(); let y = index"
                           class="row-hint-item flex justify-end items-center pr-2 text-[var(--color-text-main)] font-black select-none"
                           [class.thick-b]="(y + 1) % 5 === 0 && y !== height() - 1"
                           [class.no-border-b]="y === height() - 1"
                           [class.bg-emerald-500/10]="completedRows()[y]">
                        <span *ngFor="let hint of row; let last = last"
                              class="font-mono font-black leading-none mr-1.5 transition-all"
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
                <!-- Mode 2: 纯净画作 (大幅像素图案展示) -->
                <div class="flex items-center justify-center p-3">
                  <div class="grid bg-slate-900 border-2 border-indigo-500/50 rounded-2xl overflow-hidden shadow-2xl p-1.5"
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
                        <span *ngIf="cell === 2" class="text-rose-500/70 text-xs font-bold">✕</span>
                      </div>
                    </ng-container>
                  </div>
                </div>
              }

              <!-- Completed Art Celebration Stamp -->
              @if (currentStep() >= 100) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl animate-fade-in pointer-events-none z-30">
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
              <div class="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-amber-900/30 border border-purple-400/50 flex items-center justify-center shadow-xl">
                <span class="text-4xl sm:text-5xl font-black font-mono text-purple-300 tabular-nums">
                  {{ currentStep() }}%
                </span>
                <div class="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-400"></div>
                <div class="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-400"></div>
                <div class="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-purple-400"></div>
                <div class="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-400"></div>
              </div>

              @if (currentStep() >= 100) {
                <div class="animate-scale-up px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm shadow-xl uppercase tracking-wider">
                  🏆 PERFECT CLEAR!
                </div>
              } @else {
                <span class="text-sm font-mono font-bold text-slate-400 flex items-center gap-1.5">
                  <span class="animate-spin text-xs">⏳</span>
                  <span>推导演进中...</span>
                </span>
              }
            </div>
          }

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
                  {{ exportType() === 'video' ? '正在进行画面捕获与视频流编码，马上为您下载...' : '正在极速抽帧与 LZW 动图压缩，马上为您下载...' }}
                </p>
              </div>
              <div class="w-48 sm:w-64 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-100"
                     [style.width.%]="exportProgress()"></div>
              </div>
            </div>
          }

          <!-- Bottom Timecode & Watermark -->
          <div class="absolute bottom-3 inset-x-3.5 flex items-center justify-between text-[11px] sm:text-xs font-mono text-white/50 z-20 pointer-events-none">
            <span>00:{{ currentSecondFormatted() }} / 00:10</span>
            <span class="font-bold text-amber-400/90 tracking-wide">puzzlepk.com</span>
          </div>

          <!-- Interactive Timeline Scrubber Bar -->
          <div class="absolute bottom-0 inset-x-0 h-2 sm:h-2.5 bg-slate-800 hover:h-3.5 transition-all cursor-pointer z-30 group/bar"
               (click)="onScrub($event)">
            <div class="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-75 relative"
                 [style.width.%]="currentStep()">
              <!-- Scrubber Thumb -->
              <span class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg group-hover/bar:scale-125 transition-transform"></span>
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
                      title="导出 10秒高清高光视频 (WebM/MP4)">
                <span>🎥</span>
                <span>导出视频</span>
              </button>

              <!-- 导出 GIF 动图 -->
              <button (click)="exportGif()" [disabled]="isExporting()"
                      class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-400 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="导出动画图片 (GIF 格式，无需视频播放器)">
                <span>🎞️</span>
                <span>导出 GIF</span>
              </button>

              <!-- 保存高清图片 (PNG) -->
              <button (click)="downloadArtwork()"
                      class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="保存终局像素画为 PNG 图片">
                <span>📸</span>
                <span class="hidden md:inline">保存画作</span>
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
            <span class="text-base sm:text-lg shrink-0">🚀</span>
            <span class="leading-relaxed text-[11px] sm:text-xs">
              支持直接点击<strong>「导出视频」</strong>或<strong>「导出 GIF」</strong>一键下载高光文件，分享至微信群/B站/抖音/小红书，自带全套推导与官方防伪水印！
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

  readonly currentSecondFormatted = computed(() => {
    const s = Math.min(10, Math.floor(this.currentStep() / 10));
    return s < 10 ? '0' + s : '' + s;
  });

  // Cell dimensions substantially enlarged for better visibility & resolution
  readonly replayCellSize = computed(() => {
    const w = this.width();
    if (w <= 5) return 40;
    if (w <= 10) return 28;
    if (w <= 15) return 20;
    if (w <= 20) return 15;
    return 12;
  });

  readonly pureArtSize = computed(() => {
    return 360;
  });

  readonly boardScale = computed(() => {
    const w = this.width();
    const h = this.height();
    const cellSize = this.replayCellSize();
    const maxRowHints = Math.max(1, ...(this.rowHints().map(r => r.length)));
    const maxColHints = Math.max(1, ...(this.colHints().map(c => c.length)));
    const approxW = maxRowHints * 18 + w * cellSize + 24;
    const approxH = maxColHints * 20 + h * cellSize + 24;
    
    // Spacious inner stage: ~660px wide, ~440px tall on desktop
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const targetW = isMobile ? Math.min(350, window.innerWidth - 48) : 660;
    const targetH = isMobile ? 320 : 440;
    const scaleX = targetW / Math.max(approxW, 1);
    const scaleY = targetH / Math.max(approxH, 1);
    return Math.min(1.25, Math.min(scaleX, scaleY));
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

      // Dark obsidian background
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
   * 导出超清 GIF 动图
   */
  async exportGif() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('gif');
    this.exportProgress.set(5);
    this.haptic.vibrateLight();

    try {
      const size = 480;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Failed to create canvas context');

      const encoder = new MiniGifEncoder(size, size);
      const totalSteps = 16; // 采样 16 帧以达到最佳体积与流畅度

      for (let i = 0; i < totalSteps; i++) {
        const stepPct = Math.round((i / (totalSteps - 1)) * 100);
        const moveIdx = Math.min(this.totalMoves(), Math.floor((stepPct / 100) * this.totalMoves()));
        
        // Reconstruct grid for this frame
        const frameGrid = this.buildGridForMoveCount(moveIdx, stepPct >= 100);
        const lastM = moveIdx > 0 ? this.replayData.moves[moveIdx - 1] : undefined;
        
        this.drawExportFrame(ctx, size, frameGrid, stepPct, moveIdx, lastM);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const delay = (i === totalSteps - 1) ? 120 : 18; // 最后一帧停留 1.2 秒
        encoder.addFrame(imageData.data, delay);

        this.exportProgress.set(Math.round(((i + 1) / totalSteps) * 95));
        await new Promise(r => setTimeout(r, 10));
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
    } finally {
      setTimeout(() => this.isExporting.set(false), 500);
    }
  }

  /**
   * 导出 10秒 720P 高清高光视频 (WebM / MP4)
   */
  async exportVideo() {
    if (this.isExporting() || !this.hasReplayMoves()) return;

    this.isExporting.set(true);
    this.exportType.set('video');
    this.exportProgress.set(5);
    this.haptic.vibrateLight();

    try {
      const size = 720;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      // Check MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        // Fallback to GIF if MediaRecorder is not supported
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

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3000000 } : undefined);
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

      // Render 36 smoothly paced frames over 3 seconds of record time
      const frameCount = 36;
      for (let i = 0; i <= frameCount; i++) {
        const stepPct = Math.round((i / frameCount) * 100);
        const moveIdx = Math.min(this.totalMoves(), Math.floor((stepPct / 100) * this.totalMoves()));
        const frameGrid = this.buildGridForMoveCount(moveIdx, stepPct >= 100);
        const lastM = moveIdx > 0 ? this.replayData.moves[moveIdx - 1] : undefined;

        this.drawExportFrame(ctx, size, frameGrid, stepPct, moveIdx, lastM);
        this.exportProgress.set(Math.round((i / frameCount) * 90));
        await new Promise(r => setTimeout(r, 75));
      }

      // Hold complete frame for 1 second
      await new Promise(r => setTimeout(r, 1000));
      this.exportProgress.set(98);
      recorder.stop();
      await recordPromise;

      this.exportProgress.set(100);
      this.audio.playWin();
      this.haptic.vibrateSuccess();
    } catch (e) {
      console.error('Failed to export video:', e);
      alert('导出视频失败，请尝试导出 GIF 动图或重试。');
    } finally {
      setTimeout(() => this.isExporting.set(false), 500);
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

  /**
   * 将完整的真实棋盘（含水印、顶部列提示、左侧行提示、完成划线、格子）绘制至导出画布
   */
  private drawExportFrame(
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

    // 1. Deep sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Subtle ambient cyber grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const bgStep = 40;
    for (let x = 0; x < size; x += bgStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += bgStep) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(size, y);
      ctx.stroke();
    }

    // 2. Top Watermark Header
    // Red REC circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(36, 36, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText('REC • PUZZLE PK', 50, 41);

    // Title in center
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数织高光时光倒流 · 10秒极速推演', size / 2, 41);

    // Move count top right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`步数: ${moveIdx}/${this.totalMoves()}`, size - 36, 41);

    // 3. Board Geometry Calculation
    const maxRowHints = Math.max(1, ...(rowHints.map(r => r.length)));
    const maxColHints = Math.max(1, ...(colHints.map(c => c.length)));

    const stagePadding = 48;
    const availW = size - stagePadding * 2;
    const availH = size - 160;

    const rowHintWidth = Math.max(40, maxRowHints * 20);
    const colHintHeight = Math.max(36, maxColHints * 22);

    const maxBoardDim = Math.max(W, H);
    const cellSize = Math.floor(Math.min((availW - rowHintWidth) / W, (availH - colHintHeight) / H));

    const boardW = rowHintWidth + W * cellSize;
    const boardH = colHintHeight + H * cellSize;
    const startX = Math.floor((size - boardW) / 2);
    const startY = Math.floor(70 + (availH - boardH) / 2);

    const gridX = startX + rowHintWidth;
    const gridY = startY + colHintHeight;

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

    // 4. Draw Column Hints (Top)
    ctx.textAlign = 'center';
    for (let x = 0; x < W; x++) {
      const col = colHints[x] || [];
      const cx = gridX + x * cellSize + cellSize / 2;
      const isComp = compCols[x];

      if (isComp) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(gridX + x * cellSize, startY, cellSize, colHintHeight);
      }

      ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.46))}px monospace`;
      for (let i = 0; i < col.length; i++) {
        const hint = col[i];
        const hy = startY + colHintHeight - (col.length - i - 1) * 16 - 6;
        ctx.fillStyle = isComp ? '#10b981' : '#f8fafc';
        ctx.fillText(String(hint), cx, hy);

        if (isComp) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 7, hy - 4);
          ctx.lineTo(cx + 7, hy - 4);
          ctx.stroke();
        }
      }
    }

    // 5. Draw Row Hints (Left)
    ctx.textAlign = 'right';
    for (let y = 0; y < H; y++) {
      const row = rowHints[y] || [];
      const cy = gridY + y * cellSize + cellSize / 2 + 5;
      const isComp = compRows[y];

      if (isComp) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(startX, gridY + y * cellSize, rowHintWidth, cellSize);
      }

      ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.46))}px monospace`;
      let rx = gridX - 8;
      for (let i = row.length - 1; i >= 0; i--) {
        const hint = row[i];
        ctx.fillStyle = isComp ? '#10b981' : '#f8fafc';
        ctx.fillText(String(hint), rx, cy);

        if (isComp) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx - 12, cy - 4);
          ctx.lineTo(rx + 2, cy - 4);
          ctx.stroke();
        }
        rx -= 16;
      }
    }

    // 6. Draw Cells
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = grid[y]?.[x] || 0;
        const cx = gridX + x * cellSize;
        const cy = gridY + y * cellSize;

        if (cell === 1) {
          // Fill: Indigo Gradient
          const grad = ctx.createLinearGradient(cx, cy, cx, cy + cellSize);
          grad.addColorStop(0, '#818cf8');
          grad.addColorStop(1, '#4f46e5');
          ctx.fillStyle = grad;
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);
        } else if (cell === 2) {
          // Cross: Rose ✕
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(cx + 0.5, cy + 0.5, cellSize - 1, cellSize - 1);

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = Math.max(1.8, cellSize * 0.14);
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

    // 7. Grid Lines
    // Thin 1x1
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
    ctx.lineWidth = 2.4;
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

    // Outer Board Frame
    ctx.strokeStyle = stepPct >= 100 ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gridX, gridY, W * cellSize, H * cellSize);

    // 8. Active Cursor Beacon
    if (lastMove && lastMove.x < W && lastMove.y < H && stepPct < 100) {
      const lcx = gridX + lastMove.x * cellSize;
      const lcy = gridY + lastMove.y * cellSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.strokeRect(lcx - 1, lcy - 1, cellSize + 2, cellSize + 2);
      ctx.shadowBlur = 0;
    }

    // 9. Celebration Stamp when 100%
    if (stepPct >= 100) {
      ctx.save();
      const badgeW = 280;
      const badgeH = 50;
      const bx = (size - badgeW) / 2;
      const by = (size - badgeH) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 25);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'black 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 PERFECT CLEAR!', size / 2, by + 32);
      ctx.restore();
    }

    // 10. Bottom Footer & Watermark
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    const s = Math.min(10, Math.floor(stepPct / 10));
    ctx.fillText(`00:${s < 10 ? '0' + s : s} / 00:10`, 36, size - 24);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px monospace';
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
