import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectEngine, Position } from '../connect-engine';

@Component({
  selector: 'app-connect-board',
  standalone: true,
  imports: [CommonModule],
  host: {
    'class': 'block w-full'
  },
  template: `
    <div class="relative w-full aspect-square max-w-full select-none rounded-xl bg-[#f4f4f4] p-2 sm:p-4"
         (mousedown)="onPointerDown($event)"
         (touchstart)="onPointerDown($event)"
         (mousemove)="onPointerMove($event)"
         (touchmove)="onPointerMove($event)"
         (mouseup)="onPointerUp()"
         (touchend)="onPointerUp()"
         (mouseleave)="onPointerUp()"
         (touchcancel)="onPointerUp()">

      <div class="relative w-full h-full" #boardContainer>

      <!-- Grid Background -->
      <div class="grid w-full h-full"
           [style.gridTemplateColumns]="'repeat(' + engine.width + ', minmax(0, 1fr))'"
           [style.gridTemplateRows]="'repeat(' + engine.height + ', minmax(0, 1fr))'">
        <ng-container *ngFor="let r of rows">
          <div *ngFor="let c of cols" 
               class="relative flex items-center justify-center transition-colors">
            
            <!-- Block (Wall) -->
            <div *ngIf="engine.isBlock(r, c)" class="w-[90%] h-[90%] bg-slate-700 rounded-sm z-20 shadow-inner flex items-center justify-center">
              <!-- subtle texture or cross for block -->
            </div>

            <!-- Grey Square (Dot) for empty spots -->
            <div *ngIf="!engine.isEndpoint(r, c) && !engine.isBlock(r, c)" class="w-[35%] h-[35%] bg-gray-300 rounded-sm z-0"></div>

            <!-- Endpoint Dot -->
            <div *ngIf="engine.isEndpoint(r, c)" 
                 class="w-[85%] h-[85%] rounded-full z-10 flex items-center justify-center transition-transform relative shadow-sm"
                 [class.scale-110]="activeColor === engine.grid[r][c]"
                 [style.backgroundColor]="getColorHex(engine.getColorAt(r, c)!)">
              <span class="text-white font-bold pointer-events-none drop-shadow-md"
                    [ngClass]="engine.height >= 12 ? 'text-[10px] sm:text-xs md:text-sm lg:text-base' : (engine.height >= 10 ? 'text-xs sm:text-sm md:text-base lg:text-lg' : (engine.height >= 7 ? 'text-sm sm:text-base md:text-lg lg:text-2xl' : 'text-base sm:text-xl md:text-2xl lg:text-4xl'))">
                {{ engine.getColorAt(r, c) }}
              </span>
            </div>

          </div>
        </ng-container>
      </div>

      <!-- SVG Overlay for Pipes -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" 
           [attr.viewBox]="'0 0 ' + engine.width * 100 + ' ' + engine.height * 100" 
           preserveAspectRatio="none">

        <ng-container *ngFor="let color of activeColors">
          <!-- Main Pipe -->
          <polyline 
            *ngIf="getPointsForColor(color)"
            [attr.points]="getPointsForColor(color)"
            fill="none"
            [attr.stroke]="getColorHex(color)"
            stroke-width="45"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-opacity duration-150"
            [class.opacity-40]="activeColor !== null && activeColor !== color"
          />
        </ng-container>
      </svg>
      </div>
    </div>
  `
})
export class ConnectBoardComponent implements AfterViewInit {
  @Input() engine!: ConnectEngine;
  @Input() disabled = false;
  @Output() boardChange = new EventEmitter<void>();

  @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLDivElement>;

  activeColor: number | null = null;
  cellWidth = 0;
  cellHeight = 0;

  // Extended vibrant palette for up to 25 pairs
  private colors: Record<number, string> = {
    1: '#b52025', // Deep Red
    2: '#fed000', // Yellow
    3: '#0000ff', // Blue
    4: '#258f25', // Green
    5: '#8b5a2b', // Brown
    6: '#ff8c00', // Orange
    7: '#800080', // Purple
    8: '#00ced1', // Turquoise
    9: '#ff1493', // Deep Pink
    10: '#4682b4', // Steel blue
    11: '#20b2aa', // Light Sea Green
    12: '#8b0000', // Dark Red
    13: '#4b0082', // Indigo
    14: '#ff4500', // Orange Red
    15: '#d2691e', // Chocolate
    16: '#8a2be2', // Blue Violet
    17: '#00fa9a', // Medium Spring Green
    18: '#dc143c', // Crimson
    19: '#ff00ff', // Magenta
    20: '#1e90ff', // Dodger Blue
    21: '#ffd700', // Gold
    22: '#32cd32', // Lime Green
    23: '#cd853f', // Peru
    24: '#ff69b4', // Hot Pink
    25: '#008080', // Teal
  };

  get rows() { return Array.from({ length: this.engine?.height || 0 }, (_, i) => i); }
  get cols() { return Array.from({ length: this.engine?.width || 0 }, (_, i) => i); }
  get activeColors() { 
    if (!this.engine) return [];
    return Array.from(this.engine.paths.keys()); 
  }

  getColorHex(color: number): string {
    return this.colors[color] || '#888888';
  }

  ngAfterViewInit() {
    // Wait for render to get accurate dimensions, but SVG handles scaling via viewBox.
    // So we don't strictly need pixel perfect cell dimensions for SVG.
  }

  getPointsForColor(color: number): string {
    const path = this.engine.paths.get(color);
    if (!path || path.length < 2) return '';
    
    // Each cell in viewBox is 100x100. Center is at (c*100 + 50, r*100 + 50)
    return path.map(p => `${p.c * 100 + 50},${p.r * 100 + 50}`).join(' ');
  }

  isCellActive(r: number, c: number): boolean {
    if (this.activeColor === null) return false;
    return this.engine.grid[r][c] === this.activeColor;
  }

  private getCellFromEvent(event: MouseEvent | TouchEvent): Position | null {
    if (!this.boardContainer || !this.engine) return null;
    
    const rect = this.boardContainer.nativeElement.getBoundingClientRect();
    
    // Client X/Y
    let cx = 0, cy = 0;
    if (event instanceof MouseEvent) {
      cx = event.clientX;
      cy = event.clientY;
    } else if (event.touches && event.touches.length > 0) {
      cx = event.touches[0].clientX;
      cy = event.touches[0].clientY;
    } else {
      return null;
    }

    // Coordinates relative to the inner grid container
    const x = cx - rect.left;
    const y = cy - rect.top;
    
    const gridWidth = rect.width;
    const gridHeight = rect.height;

    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null;

    const cellW = gridWidth / this.engine.width;
    const cellH = gridHeight / this.engine.height;

    const c = Math.floor(x / cellW);
    const r = Math.floor(y / cellH);

    if (r >= 0 && r < this.engine.height && c >= 0 && c < this.engine.width) {
      return { r, c };
    }
    return null;
  }

  onPointerDown(event: MouseEvent | TouchEvent) {
    if (this.disabled) return;
    
    // Prevent scrolling on touch
    if (event.cancelable) event.preventDefault();

    const pos = this.getCellFromEvent(event);
    if (!pos) return;

    // Check if clicking on an existing pipe or endpoint
    const color = this.engine.startDragFrom(pos.r, pos.c);
    if (color !== null) {
      this.activeColor = color;
      this.boardChange.emit();
    }
  }

  onPointerMove(event: MouseEvent | TouchEvent) {
    if (this.disabled || this.activeColor === null) return;
    
    if (event.cancelable) event.preventDefault();

    const pos = this.getCellFromEvent(event);
    if (!pos) return;

    const path = this.engine.paths.get(this.activeColor);
    if (!path || path.length === 0) return;

    const head = path[path.length - 1];
    
    // If we moved to an adjacent cell, attempt to draw
    const dr = Math.abs(head.r - pos.r);
    const dc = Math.abs(head.c - pos.c);
    if (dr + dc === 1) {
      this.engine.drawTo(pos.r, pos.c, this.activeColor);
      this.boardChange.emit();
    }
  }

  onPointerUp() {
    if (this.activeColor !== null) {
      this.activeColor = null;
      this.boardChange.emit();
    }
  }
}
