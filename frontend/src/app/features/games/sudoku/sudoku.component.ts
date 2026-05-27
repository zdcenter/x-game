import { Component, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SudokuStore } from './store/sudoku.store';
import { SudokuLobbyComponent } from './components/sudoku-lobby/sudoku-lobby.component';
import { SudokuBoardComponent } from './components/sudoku-board/sudoku-board.component';
import { SudokuControlsComponent } from './components/sudoku-controls/sudoku-controls.component';
import { SudokuRoomComponent } from './components/sudoku-room/sudoku-room.component';
import { SudokuPkStealComponent } from './components/sudoku-pk-steal/sudoku-pk-steal.component';
import { SudokuPkSpeedComponent } from './components/sudoku-pk-speed/sudoku-pk-speed.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';

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
    SudokuPkSpeedComponent,
    GameResultOverlayComponent
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
          <div class="flex-grow flex flex-col p-2 lg:p-6 gap-2 lg:gap-6 overflow-y-auto lg:overflow-hidden relative">
            
            <!-- Top Navigation Bar -->
            <div class="flex justify-between items-center bg-[var(--color-bg-card)] p-3 lg:p-4 rounded-xl border border-[var(--color-border-card)] shadow-md shrink-0 w-full max-w-[500px] lg:max-w-none mx-auto">
              <button (click)="store.view.set('lobby')" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm lg:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back
              </button>
              <div class="text-[var(--color-text-main)] font-bold opacity-80 uppercase tracking-widest text-sm lg:text-base">
                {{ store.currentPuzzleId() }}
              </div>
              <div class="font-mono text-lg lg:text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md">
                {{ formatTime(store.timeSpent()) }}
              </div>
            </div>

            <div class="flex-grow flex flex-col lg:flex-row gap-2 lg:gap-6 items-center lg:items-start lg:justify-center justify-start min-h-0 w-full">
              <!-- Victory Overlay -->
              @if (store.isFinished() && store.currentMode() === 'single') {
              <app-game-result-overlay
                [status]="'win'"
                [title]="i18n.t('game.win')()"
                [promptText]="i18n.t('game.sudoku.next_level_prompt')() || 'Level cleared! Play next?'"
                [showCancel]="true"
                [showNextLevel]="true"
                (cancel)="store.view.set('lobby')"
                (nextLevel)="playNextLevel()">
              </app-game-result-overlay>
            }

              <div class="flex flex-col items-center relative min-w-0 w-full lg:w-[500px]" [class.animate-board-shake]="store.isFinished() && store.currentMode() === 'single'">
                <app-sudoku-board></app-sudoku-board>
              </div>
              <div class="w-full lg:w-80 flex-shrink-0">
                <app-sudoku-controls (back)="store.view.set('lobby')"></app-sudoku-controls>
              </div>
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
  http = inject(HttpClient);
  i18n = inject(I18nService);
  
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

  playNextLevel() {
    const currentId = this.store.currentPuzzleId();
    if (!currentId) return;
    const match = currentId.match(/^(.*)-(\d+)$/);
    if (!match) {
      this.store.view.set('lobby');
      return;
    }
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const nextId = `${prefix}-${nextNum.toString().padStart(numStr.length, '0')}`;
    
    this.http.get<any>(`/api/v1/sudoku/puzzle/${nextId}`).subscribe({
      next: (res) => {
        this.store.currentPuzzleId.set(res.puzzle.id);
        this.store.initBoard(res.puzzle.puzzle, res.progress?.current_state, res.progress?.time_spent);
      },
      error: () => {
        // Next level doesn't exist, back to lobby
        (this.store as any).toast.show(this.i18n.t('lobby.coming_soon')(), 'info');
        this.store.view.set('lobby');
      }
    });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
