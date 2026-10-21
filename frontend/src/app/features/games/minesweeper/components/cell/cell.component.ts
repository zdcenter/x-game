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
    if (this.cell.state === CellState.Flagged) {
      return 'ms-cell-unrevealed ms-cell-flagged';
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
      if (this.cell.state === CellState.Flagged) {
        // Safe unflag: clicking a flagged cell with left click removes the flag without revealing!
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else if (this.actionMode === 'flag') {
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

  private touchTimeout: any = null;
  private touchFired = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private isMultiTouch = false;

  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 1) {
      this.cancelTouch();
      this.isMultiTouch = true;
      return;
    }
    this.isMultiTouch = false;
    this.touchFired = false;
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
    this.touchTimeout = setTimeout(() => {
      this.touchFired = true;
      this.flag.emit();
      this.haptic.vibrateSnap();
    }, 350);
  }

  onTouchMove(event: TouchEvent) {
    if (event.touches.length > 1 || this.isMultiTouch) {
      this.cancelTouch();
      return;
    }
    if (event.touches.length > 0) {
      const dx = Math.abs(event.touches[0].clientX - this.touchStartX);
      const dy = Math.abs(event.touches[0].clientY - this.touchStartY);
      if (dx > 16 || dy > 16) {
        this.cancelTouch();
        this.touchFired = true; // User is scrolling/panning the board
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    const hadTimeout = !!this.touchTimeout;
    this.cancelTouch();

    if (this.isMultiTouch) {
      this.isMultiTouch = false;
      this.touchFired = false;
      return;
    }

    // Always prevent synthetic mouse clicks on touch devices to avoid
    // synthetic click revealing a cell right after unflagging it
    event.preventDefault();

    if (this.touchFired) {
      this.touchFired = false;
      return;
    }

    if (hadTimeout) {
      if (this.cell.state === CellState.Flagged) {
        // Safe unflag: tapping a flagged cell toggles the flag off safely!
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else if (this.actionMode === 'flag') {
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else {
        this.reveal.emit();
        this.haptic.vibrateLight();
      }
    }
    this.touchFired = false;
  }

  onTouchCancel(event: TouchEvent) {
    this.cancelTouch();
    this.touchFired = false;
    this.isMultiTouch = false;
  }

  private cancelTouch() {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
  }
}
