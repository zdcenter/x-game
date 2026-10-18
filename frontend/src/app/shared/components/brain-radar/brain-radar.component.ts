import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrainDimension } from '../../../core/services/brain-radar.service';
import { I18nService } from '../../../core/i18n/i18n.service';

interface RadarPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  score: number;
  max: number;
  pct: number;
  name: string;
  icon: string;
  key: string;
}

@Component({
  selector: 'app-brain-radar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full max-w-[420px] aspect-square mx-auto flex items-center justify-center p-2 select-none">
      <svg viewBox="0 0 400 400" class="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="radarPolyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--color-accent-from)" stop-opacity="0.6" />
            <stop offset="100%" stop-color="var(--color-accent-to)" stop-opacity="0.25" />
          </linearGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Concentric Background Grid Pentagons -->
        @for (level of [0.25, 0.5, 0.75, 1.0]; track level) {
          <polygon
            [attr.points]="getGridPoints(level)"
            fill="none"
            stroke="var(--color-border-card)"
            stroke-width="1.2"
            stroke-dasharray="3,3"
            class="opacity-60"
          />
        }

        <!-- Axis Lines from Center (200, 200) -->
        @for (p of axisEndPoints(); track p.key) {
          <line
            x1="200"
            y1="200"
            [attr.x2]="p.x"
            [attr.y2]="p.y"
            stroke="var(--color-border-card)"
            stroke-width="1.2"
            class="opacity-40"
          />
        }

        <!-- Data Polygon -->
        <polygon
          [attr.points]="dataPointsString()"
          fill="url(#radarPolyGrad)"
          stroke="var(--color-accent-to)"
          stroke-width="2.5"
          filter="url(#radarGlow)"
          class="transition-all duration-700 ease-out"
        />

        <!-- Vertex Dots -->
        @for (p of radarPoints(); track p.key) {
          <circle
            [attr.cx]="p.x"
            [attr.cy]="p.y"
            r="4.5"
            fill="var(--color-accent-from)"
            stroke="#ffffff"
            stroke-width="2"
            class="drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
          />
        }

        <!-- Center BQ Score Orb -->
        <circle cx="200" cy="200" r="28" fill="var(--color-bg-card)" stroke="var(--color-border-card)" stroke-width="1.5" class="shadow-lg" />
        <text x="200" y="196" text-anchor="middle" font-size="16" font-weight="900" fill="var(--color-text-main)">{{ bq() }}</text>
        <text x="200" y="210" text-anchor="middle" font-size="9" font-weight="700" fill="var(--color-text-muted)" class="uppercase tracking-wider">BQ</text>
      </svg>

      <!-- Dimension HTML Labels placed around the radar -->
      @for (p of radarPoints(); track p.key) {
        <div
          class="absolute flex flex-col items-center pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          [style.left.%]="p.labelX"
          [style.top.%]="p.labelY"
        >
          <span class="text-sm drop-shadow-sm">{{ p.icon }}</span>
          <span class="text-[11px] font-bold text-[var(--color-text-main)] whitespace-nowrap">{{ p.name }}</span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-accent-to)] shadow-xs">
            {{ p.score }}
          </span>
        </div>
      }
    </div>
  `
})
export class BrainRadarComponent {
  i18n = inject(I18nService);

  dimensions = input<BrainDimension[]>([]);
  bq = input<number>(250);

  private readonly cx = 200;
  private readonly cy = 200;
  private readonly radius = 120;

  axisEndPoints = computed(() => {
    const dims = this.dimensions();
    const count = dims.length || 5;
    return dims.map((d, i) => {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      return {
        key: d.key,
        x: this.cx + this.radius * Math.cos(angle),
        y: this.cy + this.radius * Math.sin(angle),
      };
    });
  });

  radarPoints = computed<RadarPoint[]>(() => {
    const dims = this.dimensions();
    const count = dims.length || 5;
    return dims.map((d, i) => {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const ratio = Math.max(0.15, Math.min(1.0, d.score / (d.max || 200)));
      const dist = this.radius * ratio;

      // Label position in % (0 - 100)
      const labelDist = this.radius + 38;
      const lx = this.cx + labelDist * Math.cos(angle);
      const ly = this.cy + labelDist * Math.sin(angle);

      return {
        x: this.cx + dist * Math.cos(angle),
        y: this.cy + dist * Math.sin(angle),
        labelX: (lx / 400) * 100,
        labelY: (ly / 400) * 100,
        score: d.score,
        max: d.max,
        pct: d.pct,
        name: this.i18n.t(d.name_key)(),
        icon: d.icon,
        key: d.key,
      };
    });
  });

  dataPointsString = computed(() => {
    return this.radarPoints().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  });

  getGridPoints(level: number): string {
    const count = this.dimensions().length || 5;
    const r = this.radius * level;
    const points: string[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const x = (this.cx + r * Math.cos(angle)).toFixed(1);
      const y = (this.cy + r * Math.sin(angle)).toFixed(1);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }
}
