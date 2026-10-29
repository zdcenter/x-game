import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, inject, effect, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from '../sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from '../sudoku-tools/sudoku-tools.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../../../core/services/game-registry.service';
import { GameHeaderComponent } from '../../../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../../../shared/components/player-badge/player-badge.component';

import { GamePkHudComponent } from '../../../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../../../shared/components/game-pk-hud/game-pk-hud.model';
import { computed } from '@angular/core';

@Component({
  selector: 'app-sudoku-pk-speed',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuNumpadComponent, SudokuToolsComponent, GamePkHudComponent],
  templateUrl: './sudoku-pk-speed.component.html',
  styleUrl: './sudoku-pk-speed.component.css'})
export class SudokuPkSpeedComponent {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const p = this.store.players()[this.store.playerId()];
    const prog = p?.progress || 0;
    return {
      id: this.store.playerId(),
      nickname: this.store.playerId(),
      isHost: this.store.playerId() === this.store.hostId(),
      isMe: true,
      progress: (prog / 81) * 100,
      status: p?.finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.pk.cleared')(), value: `${prog}/81`, icon: '📝', colorClass: 'text-sky-500 font-semibold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    const myId = this.store.playerId();
    const isSpec = this.store.isSpectator();
    const players = this.getPlayers().filter(p => isSpec || p.id !== myId);
    return players.map(p => ({
      id: p.id,
      nickname: p.id,
      isHost: p.id === this.store.hostId(),
      isMe: false,
      progress: (p.progress / 81) * 100,
      status: p.finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.pk.cleared')(), value: `${p.progress}/81`, icon: '📝', colorClass: 'text-sky-500 font-semibold' }
      ]
    }));
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    const oppId = this.opponentsPkStats()[0]?.id;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.store.playerId()] || 0,
      opponent: wins[oppId] || 0
    };
  });

  @Output() openLobby = new EventEmitter<void>();

  handleTitleClick() {
    // PK mode sub-components do not handle arbitrary restart
  }
  showOverlay = signal(false);

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('sudoku', mode);
    return key ? this.i18n.t(key)() : mode;
  }
  
  getDiffName() {
    const rState = this.store.rawState() as any;
    const diff = rState?.difficulty || '';
    const key = this.gameRegistry.getDifficultyLabel('sudoku', diff);
    return key ? this.i18n.t(key)() : diff;
  }

  getPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.progress - a.progress);
  }

  getStats() {
    const players = this.getPlayers();
    const myPlayer = players.find(p => p.id === this.store.playerId());
    if (myPlayer) {
      return [{ label: 'PROGRESS', value: `${myPlayer.progress}/81` }];
    }
    return [];
  }

  isWinner(): boolean {
    const rState = this.store.rawState() as any;
    if (!rState || !rState.winners) return false;
    return rState.winners.includes(this.store.playerId());
  }

  isLoser(): boolean {
    return (this.store.isFinished() || this.store.gameStatus() === GameStatus.Finished) && !this.isWinner();
  }
}
