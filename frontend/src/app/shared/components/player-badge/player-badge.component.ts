import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-player-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-badge.component.html',
})
export class PlayerBadgeComponent {
  GameStatus = GameStatus;
  i18n = inject(I18nService);

  @Input() layout: 'card' | 'bar' = 'card';
  @Input({ required: true }) playerName!: string;
  @Input() isHost: boolean = false;
  @Input() isMe: boolean = false;
  @Input() score?: number;
  @Input() stats?: { icon?: string, value: string | number, label?: string, colorClass?: string }[];
  @Input() progress?: { current: number, total: number };
  @Input() subText?: string;
  @Input() status?: 'playing' | 'frozen' | 'finished' | 'spectating' | string = GameStatus.Playing;
  @Input() freezeCountdown?: number;

  get avatarChar(): string {
    return this.playerName ? this.playerName.charAt(0).toUpperCase() : '?';
  }

  get progressPercent(): number {
    if (!this.progress || this.progress.total === 0) return 0;
    return Math.min(100, Math.max(0, (this.progress.current / this.progress.total) * 100));
  }

  get filteredStats() {
    return (this.stats || []).filter(s => !!s);
  }

  isSpectating(): boolean {
    return this.status === 'spectating';
  }
}
