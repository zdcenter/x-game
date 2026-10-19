import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XpService } from '../../../core/services/xp.service';
import { CoinService } from '../../../core/services/coin.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-xp-gain-badge',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes floatUpXP {
      0%   { opacity: 0; transform: translateY(16px) scale(0.9); }
      12%  { opacity: 1; transform: translateY(0) scale(1.05); }
      22%  { opacity: 1; transform: translateY(-3px) scale(1); }
      75%  { opacity: 1; transform: translateY(-18px) scale(1); }
      100% { opacity: 0; transform: translateY(-45px) scale(0.92); }
    }
    @keyframes floatUpCoin {
      0%   { opacity: 0; transform: translateY(16px) scale(0.9); }
      12%  { opacity: 1; transform: translateY(0) scale(1.06); }
      22%  { opacity: 1; transform: translateY(-3px) scale(1); }
      82%  { opacity: 1; transform: translateY(-18px) scale(1); }
      100% { opacity: 0; transform: translateY(-45px) scale(0.92); }
    }
    .xp-float { animation: floatUpXP 2.3s ease-out forwards; }
    .coin-float { animation: floatUpCoin 2.6s ease-out forwards; }
  `],
  template: `
    <div class="fixed bottom-24 right-4 sm:right-8 z-[300] pointer-events-none flex flex-col items-end gap-2.5">
      <!-- XP Gain Pill -->
      @if (xpService.pendingXpGain(); as xpGain) {
        <div class="xp-float flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm sm:text-base
                    bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                    text-white shadow-xl shadow-[var(--color-accent-from)]/40 border border-white/25 backdrop-blur-md">
          <span class="text-base sm:text-lg">✨</span>
          <span>+{{ xpGain.amount }} XP</span>
        </div>
      }

      <!-- Brain Coins Gain Pill -->
      @if (coinService.pendingCoinGain(); as coinGain) {
        <div class="coin-float flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm sm:text-base
                    bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500
                    text-slate-950 shadow-xl shadow-amber-500/40 border border-yellow-200/60 ring-1 ring-amber-300/50 backdrop-blur-md">
          <span class="text-base sm:text-lg">🪙</span>
          <span>+{{ coinGain.amount }} {{ i18n.t('game.coins')() || '脑力币' }}</span>
        </div>
      }
    </div>
  `
})
export class XpGainBadgeComponent {
  xpService = inject(XpService);
  coinService = inject(CoinService);
  i18n = inject(I18nService);
}

