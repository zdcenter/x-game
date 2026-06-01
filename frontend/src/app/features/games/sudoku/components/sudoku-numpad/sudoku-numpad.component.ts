import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';

@Component({
  selector: 'app-sudoku-numpad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sudoku-numpad.component.html',
  styleUrl: './sudoku-numpad.component.css'})
export class SudokuNumpadComponent {
  store = inject(SudokuStore);
}
