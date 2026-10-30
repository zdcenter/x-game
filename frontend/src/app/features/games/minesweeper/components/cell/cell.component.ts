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
  styleUrl: './cell.component.css'
})
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

  // 记录最近一次触控交互的时间戳，用于彻底阻断移动端/PWA上浏览器合成的幽灵点击（Ghost Click）
  private lastTouchTime = 0;

  onLeftClick(event: MouseEvent) {
    // 关键防御 1：如果是触屏操作触发的合成 click，直接丢弃，防止长按插旗后放手瞬间被当成新点击拔旗
    if (Date.now() - this.lastTouchTime < 500) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.button === 0) {
      if (this.cell.state === CellState.Flagged) {
        // Safe unflag: clicking a flagged cell with mouse removes the flag without revealing!
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else if (this.cell.state === CellState.Revealed) {
        // Clicking a revealed number: trigger chord if satisfied
        this.reveal.emit();
        if (this.cell.neighbors > 0) {
          this.haptic.vibrateLight();
        }
      } else if (this.actionMode === 'flag') {
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else {
        this.reveal.emit();
      }
    }
  }

  onDoubleClick(event: MouseEvent) {
    event.preventDefault();
    if (this.cell.state === CellState.Revealed && this.cell.neighbors > 0) {
      this.reveal.emit();
      this.haptic.vibrateLight();
    }
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    // 关键防御 2：阻止触屏长按后系统派发的模拟 contextmenu 事件再次触发插旗/拔旗
    if (Date.now() - this.lastTouchTime < 500) {
      event.stopPropagation();
      return;
    }
    this.flag.emit();
  }

  private touchTimeout: any = null;
  private isLongPressTriggered = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private isMultiTouch = false;

  onTouchStart(event: TouchEvent) {
    this.lastTouchTime = Date.now();
    this.cancelTouch();
    this.isLongPressTriggered = false;

    if (event.touches.length > 1) {
      this.isMultiTouch = true;
      return;
    }
    this.isMultiTouch = false;

    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }

    // 320ms 长按判定：长按达到阈值时触发插旗
    this.touchTimeout = setTimeout(() => {
      this.isLongPressTriggered = true;
      this.lastTouchTime = Date.now();
      this.cancelTouch();
      this.flag.emit();
      this.haptic.vibrateSnap();
    }, 320);
  }

  onTouchMove(event: TouchEvent) {
    this.lastTouchTime = Date.now();
    if (event.touches.length > 1 || this.isMultiTouch) {
      this.cancelTouch();
      return;
    }
    if (event.touches.length > 0) {
      const dx = Math.abs(event.touches[0].clientX - this.touchStartX);
      const dy = Math.abs(event.touches[0].clientY - this.touchStartY);
      // 滑动距离超过 14px 判定为玩家在拖拽/滚动棋盘，取消长按
      if (dx > 14 || dy > 14) {
        this.cancelTouch();
        this.isLongPressTriggered = false;
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.lastTouchTime = Date.now();

    // 强行阻断浏览器派发合成鼠标事件
    if (event.cancelable) {
      event.preventDefault();
    }

    const wasLongPress = this.isLongPressTriggered;
    const hasPendingTimeout = !!this.touchTimeout;
    this.cancelTouch();

    if (this.isMultiTouch) {
      this.isMultiTouch = false;
      this.isLongPressTriggered = false;
      return;
    }

    // 关键防御 3：如果刚才已经长按插上旗了，用户放开手指（touchend）时绝对不要做任何动作！
    if (wasLongPress) {
      this.isLongPressTriggered = false;
      return;
    }

    // 只有在未触发长按、且在定时器未过期时抬手，才算作短按点击（Tap）
    if (hasPendingTimeout) {
      if (this.cell.state === CellState.Flagged) {
        // 短按已插旗格子：安全取消插旗
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else if (this.cell.state === CellState.Revealed) {
        // 短按已翻开数字格：触发双击/连击排雷 (Chording)
        this.reveal.emit();
        this.haptic.vibrateLight();
      } else if (this.actionMode === 'flag') {
        // 插旗模式下短按未翻开格子：插旗
        this.flag.emit();
        this.haptic.vibrateSnap();
      } else {
        // 翻开模式下短按：翻开格子
        this.reveal.emit();
        this.haptic.vibrateLight();
      }
    }

    this.isLongPressTriggered = false;
  }

  onTouchCancel(event: TouchEvent) {
    this.lastTouchTime = Date.now();
    this.cancelTouch();
    // 延迟重置长按标记，防止 iOS PWA 在 touchcancel 紧跟着补发的 click 事件穿透
    setTimeout(() => {
      this.isLongPressTriggered = false;
    }, 400);
    this.isMultiTouch = false;
  }

  private cancelTouch() {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
  }
}
