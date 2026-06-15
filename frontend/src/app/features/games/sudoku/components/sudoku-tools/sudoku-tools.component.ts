import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { HintButtonComponent } from '../../../../../shared/components/hint-button/hint-button.component';

@Component({
  selector: 'app-sudoku-tools',
  standalone: true,
  imports: [CommonModule, HintButtonComponent],
  templateUrl: './sudoku-tools.component.html',
  styleUrl: './sudoku-tools.component.css'})
export class SudokuToolsComponent {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  i18n = inject(I18nService);
}
