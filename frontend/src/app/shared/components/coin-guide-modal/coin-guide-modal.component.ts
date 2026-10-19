import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { SettingsService } from '../../../core/services/settings.service';
import { CoinService } from '../../../core/services/coin.service';
import { I18nService } from '../../../core/i18n/i18n.service';

import { CoinIconComponent } from '../coin-icon/coin-icon.component';

@Component({
  selector: 'app-coin-guide-modal',
  standalone: true,
  imports: [CommonModule, CoinIconComponent],
  templateUrl: './coin-guide-modal.component.html',
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class CoinGuideModalComponent {
  guideService = inject(CoinGuideService);
  settingsService = inject(SettingsService);
  coinService = inject(CoinService);
  i18n = inject(I18nService);

  activeTab = signal<'earn' | 'spend'>('earn');

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.guideService.isOpen()) {
      this.guideService.close();
    }
  }

  close() {
    this.guideService.close();
  }
}
