import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, inject, effect, signal, untracked, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from '../sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from '../sudoku-tools/sudoku-tools.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameResultOverlayComponent } from '../../../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRegistryService } from '../../../../../core/services/game-registry.service';
import { GameHeaderComponent } from '../../../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../../../shared/components/player-badge/player-badge.component';

import { PlayerListContainerComponent } from '../../../../../shared/components/player-list-container/player-list-container.component';
import { GamePlayerMiniHudComponent } from '../../../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';
import { GameFrozenOverlayComponent } from '../../../../../shared/components/game-frozen-overlay/game-frozen-overlay.component';

@Component({
  selector: 'app-sudoku-pk-steal',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuNumpadComponent, SudokuToolsComponent, GameResultOverlayComponent, PlayerBadgeComponent, PlayerListContainerComponent, GamePlayerMiniHudComponent, GameFrozenOverlayComponent],
  templateUrl: './sudoku-pk-steal.component.html',
  styleUrl: './sudoku-pk-steal.component.css'})
export class SudokuPkStealComponent {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);

  @Output() openLobby = new EventEmitter<void>();

  handleTitleClick() {
    // PK mode sub-components do not handle arbitrary restart
  }

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

  isFrozenSignal = signal<boolean>(false);
  frozenCountdownDisplay = signal<number>(0);
  freezeTimer: any = null;
  freezeInterval: any = null;
  showOverlay = signal(false);

  getSortedPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.score - a.score);
  }

  getStats() {
    const players = this.getSortedPlayers();
    const myPlayer = players.find(p => p.id === this.store.playerId());
    if (myPlayer) {
      return [{ label: 'SCORE', value: myPlayer.score }];
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

  constructor() {
    effect((onCleanup) => {
      if (this.store.isFinished() || this.store.gameStatus() === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    // Handle freeze countdown
    effect(() => {
      const players = this.store.players() as any;
      const me = players[this.store.playerId()];
      if (!me) return;
      
      const until = me.freezeUntil;
      const now = Date.now();
      
      if (this.freezeInterval) {
        clearInterval(this.freezeInterval);
        this.freezeInterval = null;
      }
      
      if (until > now) {
        this.isFrozenSignal.set(true);
        this.frozenCountdownDisplay.set(Math.ceil((until - now) / 1000));
        
        this.freezeInterval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          } else {
            this.frozenCountdownDisplay.set(rem);
          }
        }, 100);

        clearTimeout(this.freezeTimer);
        this.freezeTimer = setTimeout(() => {
          this.isFrozenSignal.set(false);
          if (this.freezeInterval) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          }
        }, until - Date.now());
      } else {
        this.isFrozenSignal.set(false);
      }
    });
  }

  ngOnDestroy() {
    if (this.freezeInterval) clearInterval(this.freezeInterval);
    if (this.freezeTimer) clearTimeout(this.freezeTimer);
  }
}
