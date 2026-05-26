import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuControlsComponent } from '../sudoku-controls/sudoku-controls.component';

@Component({
  selector: 'app-sudoku-pk-steal',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuControlsComponent],
  template: `
    <div class="flex-grow flex flex-col lg:flex-row p-2 lg:p-6 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden relative">
      
      <!-- Freeze Overlay -->
      @if (isFrozen()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm rounded-xl">
          <div class="text-center animate-bounce">
            <div class="text-6xl mb-4">❄️</div>
            <h2 class="text-3xl font-black text-blue-200 drop-shadow-md tracking-widest uppercase">Frozen</h2>
          </div>
        </div>
      }

      <div class="w-full lg:w-64 flex-shrink-0 flex flex-col gap-4">
        <!-- Leaderboard -->
        <div class="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] p-4 shadow-lg">
          <h3 class="text-lg font-bold text-center mb-4 uppercase tracking-wider text-[var(--color-accent-from)]">Leaderboard</h3>
          <div class="flex flex-col gap-3">
            @for (player of getSortedPlayers(); track player.id) {
              <div class="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-slate-700/50 relative overflow-hidden"
                   [class.border-[var(--color-accent-from)]]="player.id === store.playerId()"
                   [class.bg-slate-800]="player.id === store.playerId()">
                <div class="flex items-center gap-2">
                  <span class="text-xl">👤</span>
                  <span class="font-bold truncate max-w-[100px]">{{ player.id }}</span>
                </div>
                <div class="font-mono text-xl font-black text-emerald-400">{{ player.score }}</div>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="flex-grow flex flex-col items-center relative min-w-0">
        <app-sudoku-board></app-sudoku-board>
      </div>

      <div class="w-full lg:w-80 flex-shrink-0">
        <app-sudoku-controls (back)="store.leaveRoom()"></app-sudoku-controls>
      </div>
    </div>
  `
})
export class SudokuPkStealComponent {
  store = inject(SudokuStore);

  isFrozen(): boolean {
    const players = this.store.players() as any;
    const me = players[this.store.playerId()];
    if (!me) return false;
    return me.freezeUntil > Date.now();
  }

  getSortedPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.score - a.score);
  }

  constructor() {
    effect(() => {
      if (this.store.isFinished()) {
        const rState = this.store.rawState() as any;
        const winners = rState.winners || [];
        const isWinner = winners.includes(this.store.playerId());
        // Handle Game Over UI (could use a dialog or toast here)
        if (isWinner) {
          (this.store as any).toast.show('You won the steal mode!', 'success');
        } else {
          (this.store as any).toast.show('Game Over! You lost.', 'error');
        }
      }
    });
  }
}
