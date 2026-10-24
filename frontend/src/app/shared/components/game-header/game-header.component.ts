import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PwaService } from '../../../core/services/pwa.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { CoinGuideModalComponent } from '../coin-guide-modal/coin-guide-modal.component';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';
import { isBrowser } from '../../../core/utils/browser.util';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule, CoinGuideModalComponent, CoinIconComponent],
  templateUrl: './game-header.component.html',
})
export class GameHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() iconGradientClass: string = 'from-blue-500 to-emerald-500';
  @Input() titleGradientClass: string = 'from-blue-400 to-emerald-400';
  @Input() shadowClass: string = 'shadow-emerald-500/20';
  @Input() headerBgClass: string = 'bg-gradient-to-r from-blue-900/30 to-emerald-900/30';
  @Input() gameId?: string;
  @Input() showRulesBtn: boolean = true;
  
  @Output() back = new EventEmitter<void>();
  @Output() rules = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();

  zenService = inject(ZenModeService);
  audioService = inject(AudioService);
  hapticService = inject(HapticService);
  pwaService = inject(PwaService);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  i18n = inject(I18nService);
  router = inject(Router);

  readonly showZenHint = signal<boolean>(false);
  readonly isToolsMenuOpen = signal<boolean>(false);

  ngOnInit() {
    if (!this.gameId) {
      const match = this.router.url.match(/\/games\/([^?\/]+)/);
      if (match) {
        this.gameId = match[1];
      }
    }

    if (isBrowser()) {
      const seen = localStorage.getItem('zen_hint_seen_v1');
      if (!seen) {
        this.showZenHint.set(true);
        setTimeout(() => {
          this.dismissZenHint();
        }, 4000);
      }
    }
  }

  toggleToolsMenu(): void {
    this.isToolsMenuOpen.update(v => !v);
  }

  closeToolsMenu(): void {
    this.isToolsMenuOpen.set(false);
  }

  toggleZen(): void {
    this.dismissZenHint();
    this.zenService.toggle();
  }

  dismissZenHint(): void {
    if (this.showZenHint()) {
      this.showZenHint.set(false);
      if (isBrowser()) {
        try {
          localStorage.setItem('zen_hint_seen_v1', 'true');
        } catch {}
      }
    }
  }
}
