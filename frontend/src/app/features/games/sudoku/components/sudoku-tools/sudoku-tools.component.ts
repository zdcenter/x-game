import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameToolbarComponent } from '../../../../../shared/components/game-toolbar/game-toolbar.component';
import { HapticService } from '../../../../../core/services/haptic.service';

@Component({
  selector: 'app-sudoku-tools',
  standalone: true,
  imports: [CommonModule, GameToolbarComponent],
  templateUrl: './sudoku-tools.component.html'
})
export class SudokuToolsComponent {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  i18n = inject(I18nService);
  haptic = inject(HapticService);

  onClear() {
    this.haptic.vibrateSnap();
    this.store.clearBoard();
  }

  onUndo() {
    this.haptic.vibrateLight();
    this.store.undo();
  }

  onErase() {
    this.haptic.vibrateLight();
    this.store.erase();
  }

  onTogglePencil() {
    this.haptic.vibrateLight();
    this.store.togglePencilMode();
  }
}
