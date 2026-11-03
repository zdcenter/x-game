import { Injectable, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';
import { GAME_DEFINITIONS } from '../config/game-definitions';

const POPULAR_OFFLINE_GAMES = ['minesweeper', 'sliding', 'sudoku', 'classic2048'];

@Injectable({
  providedIn: 'root'
})
export class IdlePrefetchService {
  private hasPrefetched = false;

  init(): void {
    if (!isBrowser() || this.hasPrefetched) return;

    // Skip prefetching if user has enabled data saver or is on an ultra-slow 2G connection
    const nav = navigator as any;
    if (nav.connection?.saveData || nav.connection?.effectiveType === '2g') {
      console.log('[IdlePrefetch] Skipped prefetch due to Save-Data or 2G connection.');
      return;
    }

    // Delay 15s after initial page render to ensure initial critical assets and test suites are 100% completed
    setTimeout(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          this.executePrefetch();
        }, { timeout: 8000 });
      } else {
        setTimeout(() => this.executePrefetch(), 3000);
      }
    }, 15000);
  }

  private async executePrefetch(): Promise<void> {
    if (this.hasPrefetched) return;
    this.hasPrefetched = true;

    console.log('[IdlePrefetch] Starting idle background prefetch of core offline game chunks...');

    const targets = GAME_DEFINITIONS.filter(g => POPULAR_OFFLINE_GAMES.includes(g.id));

    for (const target of targets) {
      try {
        await target.loadComponent();
        console.log(`[IdlePrefetch] Prefetched ${target.id} component chunk.`);
      } catch (err) {
        console.debug(`[IdlePrefetch] Prefetch error for ${target.id}:`, err);
      }
      // Space out by 1.2s to prevent saturating thread/network
      await new Promise(res => setTimeout(res, 1200));
    }

    console.log('[IdlePrefetch] Completed idle background prefetch of core offline games.');
  }
}
