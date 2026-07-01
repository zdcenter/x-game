import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AdService } from '../../../core/services/ad.service';
import { AdsenseComponent } from '../adsense/adsense.component';
import { GameStatus } from '../../../core/models/game.model';

export interface SpectatingPlayerInfo {
  id: string;
  score?: number | string;
  status?: string;
}

@Component({
  selector: 'app-game-spectating-overlay',
  standalone: true,
  imports: [CommonModule, AdsenseComponent],
  templateUrl: './game-spectating-overlay.component.html'
})
export class GameSpectatingOverlayComponent {
  @Input() players: SpectatingPlayerInfo[] = [];
  @Input() currentUserId: string = '';
  
  i18n = inject(I18nService);
  adService = inject(AdService);
  GameStatus = GameStatus;
}
