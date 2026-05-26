import { Component, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SudokuStore } from './store/sudoku.store';
import { SudokuLobbyComponent } from './components/sudoku-lobby/sudoku-lobby.component';
import { SudokuBoardComponent } from './components/sudoku-board/sudoku-board.component';
import { SudokuControlsComponent } from './components/sudoku-controls/sudoku-controls.component';
import { SudokuRoomComponent } from './components/sudoku-room/sudoku-room.component';
import { SudokuPkStealComponent } from './components/sudoku-pk-steal/sudoku-pk-steal.component';
import { SudokuPkSpeedComponent } from './components/sudoku-pk-speed/sudoku-pk-speed.component';

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule, 
    SudokuLobbyComponent, 
    SudokuBoardComponent, 
    SudokuControlsComponent,
    SudokuRoomComponent,
    SudokuPkStealComponent,
    SudokuPkSpeedComponent
  ],
  providers: [SudokuStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-grow flex flex-col h-[calc(100vh-64px)] w-full">
      @if (view() === 'lobby') {
        <app-sudoku-lobby class="flex-grow flex flex-col min-h-0"
          (levelSelect)="startLevel($event)">
        </app-sudoku-lobby>
      } @else if (view() === 'room') {
        <app-sudoku-room></app-sudoku-room>
      } @else {
        <!-- PLAY VIEW -->
        @if (store.currentMode() === 'sudoku_pk_steal') {
          <app-sudoku-pk-steal></app-sudoku-pk-steal>
        } @else if (store.currentMode() === 'sudoku_pk_speed') {
          <app-sudoku-pk-speed></app-sudoku-pk-speed>
        } @else {
          <!-- Single Player -->
          <div class="flex-grow flex flex-col lg:flex-row p-2 lg:p-6 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
            <div class="flex-grow flex flex-col items-center relative min-w-0">
              <app-sudoku-board></app-sudoku-board>
            </div>
            <div class="w-full lg:w-80 flex-shrink-0">
              <app-sudoku-controls (back)="store.view.set('lobby')"></app-sudoku-controls>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class SudokuComponent implements OnInit {
  store = inject(SudokuStore);
  route = inject(ActivatedRoute);
  
  // Use signal for view state: 'lobby' | 'play'
  view = this.store.view;

  constructor() {
    effect(() => {
      const status = this.store.gameStatus();
      const currentMode = this.store.currentMode();
      
      // Auto-transition to play view when game starts in multiplayer
      if (status === 'playing' && currentMode !== 'single' && this.view() === 'room') {
        if (this.store.board().length === 0) {
          const raw = this.store.rawState() as any;
          if (raw.puzzle) {
            this.store.initBoard(raw.puzzle);
          }
        }
        this.view.set('play');
      }
    });
  }

  ngOnInit() {
    this.view.set('lobby');

    this.route.queryParams.subscribe(params => {
      if (params['roomId']) {
        this.store.joinRoom(
          params['roomId'], 
          params['mode'] || 'sudoku_pk_steal', 
          params['difficulty'] || 'easy', 
          params['host']
        );
        // Clean URL to prevent re-join on refresh
        window.history.replaceState({}, '', '/sudoku');
      }
    });
  }

  startLevel(level: {id: string, puzzle: string, savedState?: string, timeSpent?: number}) {
    this.store.currentPuzzleId.set(level.id);
    this.store.initBoard(level.puzzle, level.savedState, level.timeSpent);
    this.view.set('play');
  }
}
