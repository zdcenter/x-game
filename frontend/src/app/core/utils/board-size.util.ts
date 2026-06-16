import { computed, Signal } from '@angular/core';
import { WindowSizeService } from '../services/window-size.service';

/**
 * Chrome heights per breakpoint:
 * total of nav + root-padding + card-padding + game-header + progress-bar
 *        + player-badges + board-area-py + action-controls
 *
 * mobile  = screen width < 640px  (p-1/p-2 paddings, compact header)
 * tablet  = screen width 640–1023px (sm:p-4 paddings)
 * pc      = screen width >= 1024px  (lg:p-4/p-6 paddings, taller header)
 */
export interface BoardChrome {
  mobile: number;
  tablet: number;
  pc: number;
}

/**
 * Horizontal padding removed from the available board width.
 * Defaults to 48 / 64 / 96 px for mobile / tablet / pc.
 */
export interface BoardHPad {
  mobile: number;
  tablet: number;
  pc: number;
}

const DEFAULT_HPAD: BoardHPad = { mobile: 48, tablet: 64, pc: 96 };

/**
 * Returns a Signal<string> (e.g. "327px") for the board WIDTH that reacts to window resize.
 * Board width = min(availH / ratio, availW, max).
 *
 * @param svc    inject(WindowSizeService)
 * @param chrome vertical chrome heights per breakpoint
 * @param max    maximum board width in px (default 800)
 * @param min    minimum board width in px (default 200)
 * @param hPad   optional horizontal padding override
 * @param ratio  height / width ratio — 1 = square (default), > 1 = taller than wide
 */
export function boardSizePx(
  svc: WindowSizeService,
  chrome: BoardChrome,
  max = 800,
  min = 200,
  hPad: BoardHPad = DEFAULT_HPAD,
  ratio = 1,
): Signal<string> {
  return computed(() => {
    const { w, h } = svc.size();
    const chromeH = w < 640 ? chrome.mobile : w < 1024 ? chrome.tablet : chrome.pc;
    const pad     = w < 640 ? hPad.mobile  : w < 1024 ? hPad.tablet  : hPad.pc;
    const availH  = h - chromeH;
    const availW  = w - pad;
    const width   = Math.max(min, Math.min(availH / ratio, availW, max));
    return `${width}px`;
  });
}

/**
 * Derives board height from a boardSizePx signal.
 * Use when the board is not square (ratio !== 1).
 */
export function boardHeightPx(widthSig: Signal<string>, ratio: number): Signal<string> {
  return computed(() => `${Math.round(parseFloat(widthSig()) * ratio)}px`);
}
