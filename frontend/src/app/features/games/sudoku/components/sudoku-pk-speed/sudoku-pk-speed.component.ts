import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuControlsComponent } from '../sudoku-controls/sudoku-controls.component';

@Component({
  selector: 'app-sudoku-pk-speed',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuControlsComponent],
  template: `
    <div class="flex-grow flex flex-col p-2 lg:p-6 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden relative">
      
      <!-- Top Progress Bars -->
      <div class="w-full flex gap-4 overflow-x-auto pb-2">
        @for (player of getPlayers(); track player.id) {
          <div class="flex-1 min-w-[200px] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] p-3 shadow-md relative overflow-hidden"
               [class.border-[var(--color-accent-from)]]="player.id === store.playerId()"
               [class.bg-slate-800]="player.id === store.playerId()">
            
            <div class="flex justify-between items-center mb-2 z-10 relative">
              <span class="font-bold truncate text-sm flex items-center gap-2">
                👤 {{ player.id }}
                @if (player.id === store.playerId()) {
                  <span class="text-xs text-yellow-500">(You)</span>
                }
              </span>
              <span class="font-mono font-bold text-xs">{{ player.progress }}/81</span>
            </div>

            <!-- Progress Track -->
            <div class="w-full h-3 bg-black/40 rounded-full overflow-hidden relative z-10">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                   [style.width.%]="(player.progress / 81) * 100">
              </div>
            </div>

            @if (player.finished) {
              <div class="absolute inset-0 bg-emerald-900/30 flex items-center justify-center z-0">
                <span class="text-5xl opacity-20 transform -rotate-12">FINISHED</span>
              </div>
            }
          </div>
        }
      </div>

      <div class="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start justify-center min-h-0">
        <div class="flex-grow flex flex-col items-center relative min-w-0 max-w-2xl w-full">
          <app-sudoku-board></app-sudoku-board>
        </div>

        <div class="w-full lg:w-80 flex-shrink-0">
          <app-sudoku-controls (back)="store.leaveRoom()"></app-sudoku-controls>
        </div>
      </div>
    </div>
  `
})
export class SudokuPkSpeedComponent {
  store = inject(SudokuStore);

  getPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.progress - a.progress);
  }

  constructor() {
    effect(() => {
      if (this.store.isFinished() || this.store.gameStatus() === 'finished') {
        const rState = this.store.rawState() as any;
        const winners = rState.winners || [];
        const isWinner = winners.includes(this.store.playerId());
        if (isWinner) {
          (this.store as any).toast.show('You won the speed mode!', 'success');
        } else {
          (this.store as any).toast.show('Game Over! You lost.', 'error');
        }
      }
    });
  }
}
