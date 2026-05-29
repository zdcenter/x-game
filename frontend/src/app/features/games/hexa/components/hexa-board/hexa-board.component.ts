import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HexCell, HexPiece, HexCoord } from '../../store/hexa-engine';

@Component({
  selector: 'app-hexa-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full select-none" (contextmenu)="$event.preventDefault()">
      <svg [attr.viewBox]="viewBox" class="w-full h-full drop-shadow-lg overflow-visible">
        <!-- Grid Cells -->
        <g *ngFor="let cell of cells">
          <polygon 
            [attr.points]="hexPoints(cell.q, cell.r)" 
            [attr.fill]="cell.filled ? 'url(#pieceGrad)' : 'var(--color-hexa-empty)'"
            [attr.stroke]="cell.filled ? 'rgba(255,255,255,0.2)' : 'var(--color-hexa-empty-stroke)'"
            [attr.stroke-width]="cell.filled ? '0.8' : '1.2'"
            stroke-linejoin="round"
            class="transition-colors duration-200"
            [attr.filter]="cell.filled ? 'url(#shadow3dLight)' : null">
          </polygon>
        </g>
        
        <!-- Hover Preview -->
        <g *ngIf="previewPiece && previewOrigin">
          <polygon *ngFor="let offset of previewPiece.shape"
            [attr.points]="hexPoints(previewOrigin.q + offset.q, previewOrigin.r + offset.r)"
            [attr.fill]="'url(#pieceGrad)'"
            class="opacity-40"
            stroke="white"
            stroke-width="2"
            stroke-dasharray="4">
          </polygon>
        </g>
      </svg>
    </div>
  `
})
export class HexaBoardComponent {
  @Input() cells: HexCell[] = [];
  @Input() previewPiece: HexPiece | null = null;
  @Input() previewOrigin: HexCoord | null = null;
  
  // Hex sizing for SVG viewport
  readonly size = 10; // "Radius" of a single hex
  readonly radius = 4; // Grid radius
  
  // ViewBox: calculate max width and height
  // width = size * sqrt(3) * (radius*2 + 1)
  // height = size * 2 * (radius*2 + 1) 
  get viewBox(): string {
    const w = this.size * Math.sqrt(3) * (this.radius * 2 + 1);
    const h = this.size * 2 * (this.radius * 2 + 1);
    const offset = 5; // padding
    return `${-w/2 - offset} ${-h/2 - offset} ${w + offset*2} ${h + offset*2}`;
  }

  // Calculate pixel coordinates for a hex center
  hexCenter(q: number, r: number): { x: number, y: number } {
    const x = this.size * Math.sqrt(3) * (q + r / 2);
    const y = this.size * (3 / 2) * r;
    return { x, y };
  }

  // Get SVG polygon points for a hex
  hexPoints(q: number, r: number): string {
    const center = this.hexCenter(q, r);
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i - 30;
      const angle_rad = Math.PI / 180 * angle_deg;
      const pointX = center.x + this.size * Math.cos(angle_rad);
      const pointY = center.y + this.size * Math.sin(angle_rad);
      points.push(`${pointX},${pointY}`);
    }
    return points.join(' ');
  }

  // Public utility for piece drag-n-drop (pixel coordinate to hex coord)
  // Used by the parent component to find which cell is being hovered
  pixelToHex(px: number, py: number, svgRect: DOMRect): HexCoord | null {
    // 1. Map client pixel (px, py) to SVG viewBox coordinates
    const w = this.size * Math.sqrt(3) * (this.radius * 2 + 1);
    const h = this.size * 2 * (this.radius * 2 + 1);
    const offset = 5;
    const viewBoxWidth = w + offset*2;
    const viewBoxHeight = h + offset*2;
    const viewBoxX = -w/2 - offset;
    const viewBoxY = -h/2 - offset;

    const scaleX = viewBoxWidth / svgRect.width;
    const scaleY = viewBoxHeight / svgRect.height;
    
    // SVG Coordinate
    const svgX = (px - svgRect.left) * scaleX + viewBoxX;
    const svgY = (py - svgRect.top) * scaleY + viewBoxY;

    // 2. Map SVG coordinate to Hex fractional coordinate
    const q = (Math.sqrt(3)/3 * svgX - 1/3 * svgY) / this.size;
    const r = (2/3 * svgY) / this.size;
    return this.hexRound(q, r, -q-r);
  }

  private hexRound(fq: number, fr: number, fs: number): HexCoord {
    let q = Math.round(fq);
    let r = Math.round(fr);
    let s = Math.round(fs);

    const qDiff = Math.abs(q - fq);
    const rDiff = Math.abs(r - fr);
    const sDiff = Math.abs(s - fs);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    } else {
      s = -q - r;
    }
    return { q, r, s };
  }
}
