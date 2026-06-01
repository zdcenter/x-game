import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-sudoku-tools',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sudoku-tools.component.html',
  styleUrl: './sudoku-tools.component.css'})
export class SudokuToolsComponent {
  store = inject(SudokuStore);
  i18n = inject(I18nService);
}
