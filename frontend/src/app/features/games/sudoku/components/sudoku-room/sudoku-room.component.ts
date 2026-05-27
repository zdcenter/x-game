import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { GameWaitingRoomComponent } from '../../../../../shared/components/game-waiting-room/game-waiting-room.component';

@Component({
  selector: 'app-sudoku-room',
  standalone: true,
  imports: [CommonModule, GameWaitingRoomComponent],
  template: `
    <app-game-waiting-room
      [mode]="store.currentMode()"
      [roomId]="store.roomId()"
      [players]="getPlayers()"
      [hostId]="store.host()"
      [currentUserId]="store.playerId()"
      (leave)="store.leaveRoom()"
      (start)="store.startGame()"
    ></app-game-waiting-room>
  `
})
export class SudokuRoomComponent {
  store = inject(SudokuStore);

  getPlayers(): any[] {
    return Object.values(this.store.players() as any);
  }
}
