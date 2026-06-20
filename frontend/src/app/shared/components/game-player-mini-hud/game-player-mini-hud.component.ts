import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerBadgeComponent } from '../player-badge/player-badge.component';

export interface PlayerHudConfig {
  playerName: string;
  isHost?: boolean;
  score?: number;
  stats?: { icon?: string; value: string | number; colorClass?: string }[];
  status?: string;
  freezeCountdown?: number;
}

@Component({
  selector: 'app-game-player-mini-hud',
  standalone: true,
  imports: [CommonModule, PlayerBadgeComponent],
  templateUrl: './game-player-mini-hud.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute top-2 inset-x-2 z-20 flex justify-between items-start pointer-events-none'
  }
})
export class GamePlayerMiniHudComponent {
  @Input() myPlayer!: PlayerHudConfig;
  @Input() opponents: PlayerHudConfig[] = [];

  get visibleOpponents(): PlayerHudConfig[] {
    return this.opponents.slice(0, 2);
  }

  get extraCount(): number {
    return Math.max(0, this.opponents.length - 2);
  }
}
