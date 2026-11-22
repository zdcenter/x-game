import { Injectable, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';
import { AudioService } from './audio.service';
import { HapticService } from './haptic.service';

export interface CoinFlyOptions {
  fromX?: number;
  fromY?: number;
  count?: number;
  amount?: number;
  onComplete?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class CoinFlyService {
  private audio = inject(AudioService);
  private haptic = inject(HapticService);

  flyCoins(options?: CoinFlyOptions): void {
    if (!isBrowser()) return;

    // 1. Determine destination (target coin pill)
    const targetEl = document.getElementById('navbar-coins-pill') || document.querySelector('.coins-pill-target');
    let destX = window.innerWidth - 60;
    let destY = 24;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      destX = rect.left + rect.width / 2;
      destY = rect.top + rect.height / 2;
    }

    const startX = options?.fromX ?? window.innerWidth / 2;
    const startY = options?.fromY ?? window.innerHeight / 2;
    const count = Math.min(options?.count ?? 7, 12);

    let arrivedCount = 0;

    for (let i = 0; i < count; i++) {
      const coin = document.createElement('div');
      coin.className = 'fixed pointer-events-none select-none z-[9999] flex items-center justify-center';
      coin.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 border border-yellow-100 shadow-[0_0_12px_rgba(245,158,11,0.8)] flex items-center justify-center text-xs font-black text-amber-900 select-none">
          🪙
        </div>
      `;

      // Random burst offset around origin
      const burstAngle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const burstDistance = 25 + Math.random() * 45;
      const burstX = startX + Math.cos(burstAngle) * burstDistance;
      const burstY = startY + Math.sin(burstAngle) * burstDistance;

      coin.style.left = `${startX}px`;
      coin.style.top = `${startY}px`;
      coin.style.transform = 'translate(-50%, -50%) scale(0.6)';
      coin.style.transition = 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

      document.body.appendChild(coin);

      // Phase 1: Small burst outwards
      requestAnimationFrame(() => {
        coin.style.left = `${burstX}px`;
        coin.style.top = `${burstY}px`;
        coin.style.transform = 'translate(-50%, -50%) scale(1.15)';

        // Phase 2: Arc flight to target after staggered delay
        const stagger = 120 + i * 45;
        setTimeout(() => {
          const flightDuration = 0.55 + Math.random() * 0.15;
          coin.style.transition = `left ${flightDuration}s cubic-bezier(0.4, 0, 0.2, 1), top ${flightDuration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${flightDuration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${flightDuration}s ease-in`;
          coin.style.left = `${destX}px`;
          coin.style.top = `${destY}px`;
          coin.style.transform = 'translate(-50%, -50%) scale(0.4)';
          coin.style.opacity = '0.9';

          setTimeout(() => {
            arrivedCount++;
            if (arrivedCount === 1 || arrivedCount === Math.floor(count / 2) || arrivedCount === count) {
              this.audio.playCoin();
              this.haptic.vibrateLight();
            }

            if (arrivedCount === count) {
              if (targetEl) {
                targetEl.classList.add('ring-2', 'ring-amber-400', 'scale-110');
                setTimeout(() => targetEl.classList.remove('ring-2', 'ring-amber-400', 'scale-110'), 600);
              }
              options?.onComplete?.();
            }

            coin.remove();
          }, flightDuration * 1000);
        }, stagger);
      });
    }
  }
}
