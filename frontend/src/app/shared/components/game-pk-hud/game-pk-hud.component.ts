import { Component, Input, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
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

  private readonly defaultPlayer: PkPlayerStats = {
    id: '',
    nickname: '',
    score: 0,
    progress: 0,
    wins: 0
  };

  // Signal-backed inputs to ensure full reactivity under zoneless change detection
  private readonly _myPlayer = signal<PkPlayerStats | null>(null);
  @Input() set myPlayer(val: PkPlayerStats | null | undefined) { this._myPlayer.set(val || null); }
  @Input() set myStats(val: PkPlayerStats | null | undefined) { if (val) this._myPlayer.set(val); }
  get myPlayer(): PkPlayerStats { return this._myPlayer() || this.defaultPlayer; }

  private readonly _opponents = signal<PkPlayerStats[]>([]);
  @Input() set opponents(val: PkPlayerStats[] | undefined | null) { this._opponents.set(val || []); }
  get opponents(): PkPlayerStats[] { return this._opponents(); }

  private readonly _targetWins = signal<number>(1);
  @Input() set targetWins(val: number) { this._targetWins.set(val || 1); }
  @Input() set roundFormat(val: string | undefined) {
    if (!val) return;
    if (val === 'BO3') this._targetWins.set(2);
    else if (val === 'BO5') this._targetWins.set(3);
    else if (val === 'BO1') this._targetWins.set(1);
  }
  get targetWins(): number { return this._targetWins(); }

  @Input() seriesScore?: { me: number; opponent: number };
  @Input() currentRound?: number;

  private readonly _gameMode = signal<GameModeType | string>(GameMode.Speed);
  @Input() set gameMode(val: GameModeType | string) { this._gameMode.set(val || GameMode.Speed); }
  get gameMode(): GameModeType | string { return this._gameMode(); }

  private readonly _status = signal<GameStatusType | string>(GameStatus.Playing);
  @Input() set status(val: GameStatusType | string) { this._status.set(val || GameStatus.Playing); }
  get status(): GameStatusType | string { return this._status(); }

  private readonly _elapsedTime = signal<string | undefined>(undefined);
  @Input() set elapsedTime(val: string | undefined) { this._elapsedTime.set(val); }
  get elapsedTime(): string | undefined { return this._elapsedTime(); }

  readonly isDuel = computed(() => {
    return this._opponents().length === 1;
  });

  readonly primaryOpponent = computed<PkPlayerStats | null>(() => {
    const opps = this._opponents();
    return opps.length > 0 ? opps[0] : null;
  });

  readonly isScoreBased = computed(() => {
    const m = this._gameMode();
    return m === GameMode.Steal || m === GameMode.Score || m === GameMode.SameScore ||
           m === 'score' || m === 'same_score' || m === 'steal' || m === 'diff_pk_score' || m === 'same_pk_score';
  });

  readonly myProgress = computed(() => {
    const p = this._myPlayer();
    if (!p) return 0;
    if (this.isScoreBased()) {
      if (p.progress !== undefined && p.progress > 0) {
        return Math.min(100, Math.max(0, Math.round(Number(p.progress))));
      }
      const myScore = Math.max(0, Number(p.score ?? 0));
      const oppScore = Math.max(0, Number(this.primaryOpponent()?.score ?? 0));
      const total = myScore + oppScore;
      if (total === 0) return 50;
      return Math.min(100, Math.max(5, Math.round((myScore / total) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(Number(p.progress ?? 0))));
  });

  readonly opponentProgress = computed(() => {
    const opp = this.primaryOpponent();
    if (!opp) return 0;
    if (this.isScoreBased()) {
      if (opp.progress !== undefined && opp.progress > 0) {
        return Math.min(100, Math.max(0, Math.round(Number(opp.progress))));
      }
      const myScore = Math.max(0, Number(this._myPlayer()?.score ?? 0));
      const oppScore = Math.max(0, Number(opp.score ?? 0));
      const total = myScore + oppScore;
      if (total === 0) return 50;
      return Math.min(100, Math.max(5, Math.round((oppScore / total) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(Number(opp.progress ?? 0))));
  });

  getPlayerBarWidth(player: PkPlayerStats): number {
    if (this.isScoreBased()) {
      if (player.progress !== undefined && player.progress > 0) {
        return Math.min(100, Math.max(0, Math.round(Number(player.progress))));
      }
      const allPlayers = [this.myPlayer, ...this.opponents];
      const maxScore = Math.max(...allPlayers.map(p => Number(p?.score ?? 0)), 1);
      const score = Math.max(0, Number(player?.score ?? 0));
      return Math.min(100, Math.max(5, Math.round((score / maxScore) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(Number(player?.progress ?? 0))));
  }

  readonly leadState = computed<'lead' | 'behind' | 'tied'>(() => {
    const opp = this.primaryOpponent();
    const me = this._myPlayer();
    if (!opp || !me) return 'tied';

    if (this.isScoreBased()) {
      const myScore = me.score ?? 0;
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
    const me = this._myPlayer();
    if (!opp || !me) return '';

    if (this.isScoreBased()) {
      const diff = (me.score ?? 0) - (opp.score ?? 0);
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
    const tw = this._targetWins();
    if (tw <= 1) return null;
    const totalPossibleRounds = tw * 2 - 1;
    return (this.i18n.t('game.pk.bo_series')() || 'BO{total}').replace('{total}', String(totalPossibleRounds));
  });

  readonly myWins = computed(() => {
    return this._myPlayer()?.wins ?? 0;
  });

  readonly opponentWins = computed(() => {
    return this.primaryOpponent()?.wins ?? 0;
  });

  // All players list sorted for multi-player (3+ players)
  readonly allPlayersSorted = computed<PkPlayerStats[]>(() => {
    const list: PkPlayerStats[] = [];
    const me = this._myPlayer();
    if (me) list.push(me);
    const opps = this._opponents();
    if (opps && opps.length > 0) {
      list.push(...opps);
    }

    // Sort by score if score-based, or by progress descending
    return list.slice().sort((a, b) => {
      if (this.isScoreBased()) {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return (Number(b.progress ?? 0)) - (Number(a.progress ?? 0));
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
