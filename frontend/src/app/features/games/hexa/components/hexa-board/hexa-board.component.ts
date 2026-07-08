import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HexCell, HexPiece, HexCoord } from '../../store/hexa-engine';

@Component({
  selector: 'app-hexa-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hexa-board.component.html',
  styleUrl: './hexa-board.component.css'})
export class HexaBoardComponent {
  @Input() cells: HexCell[] = [];
  @Input() previewPiece: HexPiece | null = null;
  @Input() previewOrigin: HexCoord | null = null;
  @Input() clearingCells: Map<string, string> = new Map();

  cellKey(cell: HexCell): string { return `${cell.q},${cell.r},${cell.s}`; }
  isClearing(cell: HexCell): boolean { return this.clearingCells.has(this.cellKey(cell)); }
  clearingColor(cell: HexCell): string { return this.clearingCells.get(this.cellKey(cell)) || 'url(#pieceGrad)'; }
  Math = Math;
  
  // Hex sizing for SVG viewport
  readonly size = 10; // "Radius" of a single hex
  readonly radius = 4; // Grid radius
  
  // ViewBox: calculate max width and height
  // width = size * sqrt(3) * (radius*2 + 1)
  // height = size * (radius*3 + 2) 
  get viewBox(): string {
    const w = this.size * Math.sqrt(3) * (this.radius * 2 + 1);
    const h = this.size * (this.radius * 3 + 2);
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
    const h = this.size * (this.radius * 3 + 2);
    const offset = 5;
    const viewBoxWidth = w + offset*2;
    const viewBoxHeight = h + offset*2;
    const viewBoxX = -w/2 - offset;
    const viewBoxY = -h/2 - offset;

    const scale = Math.min(svgRect.width / viewBoxWidth, svgRect.height / viewBoxHeight);
    const actualWidth = viewBoxWidth * scale;
    const actualHeight = viewBoxHeight * scale;
    
    const offsetX = (svgRect.width - actualWidth) / 2;
    const offsetY = (svgRect.height - actualHeight) / 2;

    // SVG Coordinate
    const svgX = (px - svgRect.left - offsetX) / scale + viewBoxX;
    const svgY = (py - svgRect.top - offsetY) / scale + viewBoxY;

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
