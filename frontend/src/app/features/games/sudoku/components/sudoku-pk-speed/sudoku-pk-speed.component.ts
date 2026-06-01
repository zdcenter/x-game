import { Component, inject, effect, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from '../sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from '../sudoku-tools/sudoku-tools.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameResultOverlayComponent } from '../../../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRegistryService } from '../../../../../core/services/game-registry.service';

@Component({
  selector: 'app-sudoku-pk-speed',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuNumpadComponent, SudokuToolsComponent, GameResultOverlayComponent],
  templateUrl: './sudoku-pk-speed.component.html',
  styleUrl: './sudoku-pk-speed.component.css'})
export class SudokuPkSpeedComponent {
  store = inject(SudokuStore);
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);

  @Output() openLobby = new EventEmitter<void>();

  getModeName() {
    const mode = this.store.currentMode();
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
    return (this.store.isFinished() || this.store.gameStatus() === 'finished') && !this.isWinner();
  }

  constructor() {
    effect(() => {
      if (this.store.isFinished() || this.store.gameStatus() === 'finished') {
        // Overlay handles the UI
      }
    });
  }
}
