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
    <div class="relative w-full aspect-square max-w-full select-none rounded-2xl bg-[var(--color-bg-card)] border-2 border-b-[8px] border-r-[4px] border-[var(--color-border-card)] shadow-[0_8px_20px_var(--color-cell-shadow)] p-2 sm:p-4"
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
            <div *ngIf="engine.isBlock(r, c)" class="w-[90%] h-[90%] bg-slate-700 rounded-lg z-20 shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] flex items-center justify-center">
            </div>

            <!-- Grey Square (Dot) for spots without endpoints or pipes -->
            <div *ngIf="!engine.isEndpoint(r, c) && !engine.isBlock(r, c) && engine.grid[r][c] === 0" 
                 class="w-[38%] h-[38%] bg-[#a3a3a3] dark:bg-[#737373] rounded-[3px] z-0"></div>

            <!-- Unfilled cell pulse when all flows are connected but coverage < 100% -->
            <div *ngIf="highlightUnfilled && engine.grid[r][c] === 0 && !engine.isEndpoint(r, c) && !engine.isBlock(r, c)"
                 class="absolute inset-1 rounded-lg border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse pointer-events-none z-10 flex items-center justify-center">
              <span class="text-amber-400 text-xs font-black drop-shadow">✦</span>
            </div>

            <!-- Endpoint Dot -->
            <div *ngIf="engine.isEndpoint(r, c)" 
                 class="w-[88%] h-[88%] rounded-full z-10 flex items-center justify-center relative shadow-[inset_0_-4px_6px_rgba(0,0,0,0.3),_0_4px_8px_rgba(0,0,0,0.2)]"
                 [style.backgroundColor]="getColorHex(engine.getColorAt(r, c)!)">
              
              <!-- Subtle top highlight for 3D effect -->
              <div class="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

              <span class="text-white font-black leading-none select-none pointer-events-none drop-shadow-md z-20"
                    [ngClass]="engine.height >= 12 ? 'text-sm sm:text-base md:text-lg lg:text-xl' : (engine.height >= 10 ? 'text-base sm:text-lg md:text-xl lg:text-2xl' : (engine.height >= 7 ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'))">
                {{ engine.getColorAt(r, c) }}
              </span>
            </div>

          </div>
        </ng-container>
      </div>

      <!-- SVG Overlay for Pipes (Solid, vibrant, 100% opaque) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" 
           [attr.viewBox]="'0 0 ' + engine.width * 100 + ' ' + engine.height * 100" 
           preserveAspectRatio="none">

        <ng-container *ngFor="let color of activeColors">
          <polyline 
            *ngIf="getPointsForColor(color)"
            [attr.points]="getPointsForColor(color)"
            fill="none"
            [attr.stroke]="getColorHex(color)"
            stroke-width="44"
            stroke-linecap="round"
            stroke-linejoin="round"
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
  @Input() highlightUnfilled = false;
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

  private downPos: Position | null = null;
  private downEndpointColor: number | null = null;
  private downEndpointHadPath = false;
  private hasMoved = false;

  onPointerDown(event: MouseEvent | TouchEvent) {
    if (this.disabled) return;
    
    // Prevent scrolling on touch
    if (event.cancelable) event.preventDefault();

    const pos = this.getCellFromEvent(event);
    if (!pos) return;

    this.downPos = pos;
    this.hasMoved = false;

    if (this.engine.isEndpoint(pos.r, pos.c)) {
      this.downEndpointColor = this.engine.getColorAt(pos.r, pos.c);
      this.downEndpointHadPath = this.engine.hasPath(this.downEndpointColor);
    } else {
      this.downEndpointColor = null;
      this.downEndpointHadPath = false;
    }

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

    if (this.downPos && (pos.r !== this.downPos.r || pos.c !== this.downPos.c)) {
      this.hasMoved = true;
    }

    const path = this.engine.paths.get(this.activeColor);
    if (!path || path.length === 0) return;

    const head = path[path.length - 1];
    
    // If moved to same cell, nothing to do
    const dr = pos.r - head.r;
    const dc = pos.c - head.c;
    if (dr === 0 && dc === 0) return;

    if (Math.abs(dr) + Math.abs(dc) === 1) {
      this.engine.drawTo(pos.r, pos.c, this.activeColor);
      this.boardChange.emit();
      return;
    }

    // Step smoothly if dragging across multiple cells in a single event frame
    const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
    let currR = head.r;
    let currC = head.c;

    if (Math.abs(dr) >= Math.abs(dc)) {
      while (currR !== pos.r) {
        currR += stepR;
        this.engine.drawTo(currR, currC, this.activeColor);
      }
      while (currC !== pos.c) {
        currC += stepC;
        this.engine.drawTo(currR, currC, this.activeColor);
      }
    } else {
      while (currC !== pos.c) {
        currC += stepC;
        this.engine.drawTo(currR, currC, this.activeColor);
      }
      while (currR !== pos.r) {
        currR += stepR;
        this.engine.drawTo(currR, currC, this.activeColor);
      }
    }
    this.boardChange.emit();
  }

  onPointerUp() {
    // If user tapped/clicked on an endpoint that already had a path without dragging away, clear it
    if (!this.hasMoved && this.downEndpointColor !== null && this.downEndpointHadPath) {
      this.engine.clearColor(this.downEndpointColor);
    }

    if (this.activeColor !== null || this.downEndpointColor !== null) {
      this.activeColor = null;
      this.downPos = null;
      this.downEndpointColor = null;
      this.downEndpointHadPath = false;
      this.hasMoved = false;
      this.boardChange.emit();
    }
  }
}
