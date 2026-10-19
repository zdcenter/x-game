import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cell, CellState } from '../../store/minesweeper.store';
import { HapticService } from '../../../../../core/services/haptic.service';

@Component({
  selector: 'app-cell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cell.component.html',
  styleUrl: './cell.component.css'})
export class CellComponent {
  private haptic = inject(HapticService);
  @Input({ required: true }) cell!: Cell;
  @Input() actionMode: 'reveal' | 'flag' = 'reveal';
  @Output() reveal = new EventEmitter<void>();
  @Output() flag = new EventEmitter<void>();

  // Expose enum to template
  CellState = CellState;

  get cellClass(): string {
    if (this.cell.state === CellState.Revealed) {
      return 'ms-cell-revealed';
    }
    if (this.cell.state === CellState.Exploded) {
      return 'ms-cell-exploded';
    }
    return 'ms-cell-unrevealed';
  }

  get neighborColor(): string {
    const colors = [
      '', // 0
      'var(--color-ms-1)',
      'var(--color-ms-2)',
      'var(--color-ms-3)',
      'var(--color-ms-4)',
      'var(--color-ms-5)',
      'var(--color-ms-6)',
      'var(--color-ms-7)',
      'var(--color-ms-8)'
    ];
    return colors[this.cell.neighbors] || 'var(--color-text-main)';
  }

  onLeftClick(event: MouseEvent) {
    if (event.button === 0) {
      if (this.actionMode === 'flag') {
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else {
        this.reveal.emit();
      }
    }
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.flag.emit();
  }

  private touchTimeout: any;
  private touchFired = false;

  onTouchStart(event: TouchEvent) {
    this.touchFired = false;
    this.touchTimeout = setTimeout(() => {
      this.touchFired = true;
      this.flag.emit();
      this.haptic.vibrateSnap();
    }, 400); // 400ms for long press fallback
  }

  onTouchMove(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
    this.touchFired = true; // Prevent tap action if user is scrolling
  }

  onTouchEnd(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
    if (!this.touchFired) {
      event.preventDefault(); // Prevent emulated mouse clicks
      if (this.actionMode === 'flag') {
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else {
        this.reveal.emit();
        this.haptic.vibrateLight();
      }
    } else {
      event.preventDefault();
    }
  }

  onTouchCancel(event: TouchEvent) {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
  }
}
