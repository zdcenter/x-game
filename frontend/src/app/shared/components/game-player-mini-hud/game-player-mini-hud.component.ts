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
    class: 'relative w-full z-20 flex justify-between items-start pointer-events-none shrink-0 px-2 py-2 mb-1 border-b border-[var(--color-border-card)] bg-[var(--color-bg-sub)]/30 backdrop-blur-md'
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
