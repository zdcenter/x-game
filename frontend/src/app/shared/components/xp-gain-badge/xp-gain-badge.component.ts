import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XpService } from '../../../core/services/xp.service';

@Component({
  selector: 'app-xp-gain-badge',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes floatUp {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      60%  { opacity: 1; transform: translateY(-40px) scale(1.1); }
      100% { opacity: 0; transform: translateY(-80px) scale(0.9); }
    }
    .xp-float { animation: floatUp 2.2s ease-out forwards; }
  `],
  template: `
    @if (xpService.pendingXpGain(); as gain) {
      <div class="fixed bottom-24 right-6 z-[300] pointer-events-none xp-float">
        <div class="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-lg
                    bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)]
                    text-white shadow-xl shadow-[var(--color-accent-from)]/40 border border-white/20">
          ✨ +{{ gain.amount }} XP
        </div>
      </div>
    }
  `
})
export class XpGainBadgeComponent {
  xpService = inject(XpService);
}
