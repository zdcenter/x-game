
import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { GameWaitingRoomComponent } from '../../../../../shared/components/game-waiting-room/game-waiting-room.component';

@Component({
  selector: 'app-sudoku-room',
  standalone: true,
  imports: [CommonModule, GameWaitingRoomComponent],
  templateUrl: './sudoku-room.component.html',
  styleUrl: './sudoku-room.component.css'})
export class SudokuRoomComponent {
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  @Output() changeSettings = new EventEmitter<void>();

  getPlayers(): any[] {
    return Object.values(this.store.players() as any);
  }
}
