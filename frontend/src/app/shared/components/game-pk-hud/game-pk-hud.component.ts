import { Component, Input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameMode, GameStatus, GameModeType, GameStatusType } from '../../../core/models/game.model';
import { PkMetric, PkPlayerStats } from './game-pk-hud.model';

@Component({
  selector: 'app-game-pk-hud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-pk-hud.component.html',
  styleUrls: ['./game-pk-hud.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'w-full block select-none'
  }
})
export class GamePkHudComponent {
  readonly i18n = inject(I18nService);
  readonly GameMode = GameMode;
  readonly GameStatus = GameStatus;

  @Input({ required: true }) myPlayer!: PkPlayerStats;
  @Input() opponents: PkPlayerStats[] = [];
  @Input() targetWins: number = 1;
  @Input() currentRound?: number;
  @Input() gameMode: GameModeType | string = GameMode.Speed;
  @Input() status: GameStatusType | string = GameStatus.Playing;
  @Input() elapsedTime?: string;

  readonly isDuel = computed(() => {
    return (this.opponents?.length || 0) === 1;
  });

  readonly primaryOpponent = computed<PkPlayerStats | null>(() => {
    return this.opponents && this.opponents.length > 0 ? this.opponents[0] : null;
  });

  readonly myProgress = computed(() => {
    if (!this.myPlayer) return 0;
    return Math.min(100, Math.max(0, Math.round(this.myPlayer.progress ?? 0)));
  });

  readonly opponentProgress = computed(() => {
    const opp = this.primaryOpponent();
    if (!opp) return 0;
    return Math.min(100, Math.max(0, Math.round(opp.progress ?? 0)));
  });

  readonly isScoreBased = computed(() => {
    return this.gameMode === GameMode.Steal;
  });

  readonly leadState = computed<'lead' | 'behind' | 'tied'>(() => {
    const opp = this.primaryOpponent();
    if (!opp || !this.myPlayer) return 'tied';

    if (this.isScoreBased()) {
      const myScore = this.myPlayer.score ?? 0;
      const oppScore = opp.score ?? 0;
      if (myScore > oppScore) return 'lead';
      if (myScore < oppScore) return 'behind';
      return 'tied';
    } else {
      const myP = this.myProgress();
      const oppP = this.opponentProgress();
      if (myP > oppP) return 'lead';
      if (myP < oppP) return 'behind';
      return 'tied';
    }
  });

  readonly leadDeltaText = computed(() => {
    const opp = this.primaryOpponent();
    if (!opp || !this.myPlayer) return '';

    if (this.isScoreBased()) {
      const diff = (this.myPlayer.score ?? 0) - (opp.score ?? 0);
      if (diff === 0) return this.i18n.t('game.pk.tied')() || '平局';
      const absDiff = Math.abs(diff);
      const sign = diff > 0 ? '+' : '-';
      const suffix = diff > 0 ? (this.i18n.t('game.pk.lead')() || '领先') : (this.i18n.t('game.pk.behind')() || '落后');
      return `${sign}${absDiff} ${suffix}`;
    } else {
      const diff = this.myProgress() - this.opponentProgress();
      if (diff === 0) return this.i18n.t('game.pk.tied')() || '持平';
      const absDiff = Math.abs(diff);
      const sign = diff > 0 ? '+' : '-';
      const suffix = diff > 0 ? (this.i18n.t('game.pk.lead')() || '领先') : (this.i18n.t('game.pk.behind')() || '落后');
      return `${sign}${absDiff}% ${suffix}`;
    }
  });

  readonly seriesText = computed(() => {
    if (this.targetWins <= 1) return null;
    const totalPossibleRounds = this.targetWins * 2 - 1;
    return (this.i18n.t('game.pk.bo_series')() || 'BO{total}').replace('{total}', String(totalPossibleRounds));
  });

  readonly myWins = computed(() => {
    return this.myPlayer?.wins ?? 0;
  });

  readonly opponentWins = computed(() => {
    return this.primaryOpponent()?.wins ?? 0;
  });

  // All players list sorted for multi-player (3+ players)
  readonly allPlayersSorted = computed<PkPlayerStats[]>(() => {
    const list: PkPlayerStats[] = [];
    if (this.myPlayer) list.push(this.myPlayer);
    if (this.opponents && this.opponents.length > 0) {
      list.push(...this.opponents);
    }

    // Sort by score if score-based, or by progress descending
    return list.slice().sort((a, b) => {
      if (this.isScoreBased()) {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return (b.progress ?? 0) - (a.progress ?? 0);
    });
  });

  avatarChar(name?: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  filterMetrics(metrics?: PkMetric[]): PkMetric[] {
    return (metrics || []).filter(m => m && m.value !== undefined && m.value !== null && m.value !== '');
  }
}
