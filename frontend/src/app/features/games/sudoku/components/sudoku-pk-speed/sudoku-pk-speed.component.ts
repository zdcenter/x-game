import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuControlsComponent } from '../sudoku-controls/sudoku-controls.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameResultOverlayComponent } from '../../../../../shared/components/game-result-overlay/game-result-overlay.component';

@Component({
  selector: 'app-sudoku-pk-speed',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuControlsComponent, GameResultOverlayComponent],
  template: `
    <div class="flex-grow flex flex-col p-2 lg:p-6 gap-2 lg:gap-6 overflow-y-auto lg:overflow-hidden relative">
      
      @if (store.isFinished() || store.gameStatus() === 'finished') {
        <app-game-result-overlay
          [status]="isWinner() ? 'win' : 'lose'"
          [title]="isWinner() ? i18n.t('game.win')() : i18n.t('game.lose')()"
          [showCancel]="true"
          (cancel)="store.view.set('lobby')">
        </app-game-result-overlay>
      }

      <!-- Top Navigation Bar -->
      <div class="flex justify-between items-center bg-[var(--color-bg-card)] p-3 lg:p-4 rounded-xl border border-[var(--color-border-card)] shadow-md shrink-0 w-full max-w-[500px] lg:max-w-none mx-auto mb-2 lg:mb-0">
        <button (click)="store.view.set('lobby')" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm lg:text-base">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Leave
        </button>
        <div class="text-[var(--color-text-main)] font-bold opacity-80 uppercase tracking-widest text-sm lg:text-base">
          {{ i18n.t('game.pk_speed_label')() }}
        </div>
        <div class="font-mono text-lg lg:text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md opacity-0">
          00:00
        </div>
      </div>

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

      <div class="flex-grow flex flex-col lg:flex-row gap-2 lg:gap-6 items-center lg:items-start lg:justify-center justify-start min-h-0">
        <div class="flex flex-col items-center relative min-w-0 w-full lg:w-[500px]" [class.animate-board-shake]="store.isFinished() || store.gameStatus() === 'finished'">
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
  i18n = inject(I18nService);

  getPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.progress - a.progress);
  }

  isWinner(): boolean {
    const rState = this.store.rawState() as any;
    if (!rState || !rState.winners) return false;
    return rState.winners.includes(this.store.playerId());
  }

  isLoser(): boolean {
    return (this.store.isFinished() || this.store.gameStatus() === 'finished') && !this.isWinner();
  }

  constructor() {
    effect(() => {
      if (this.store.isFinished() || this.store.gameStatus() === 'finished') {
        // Overlay handles the UI
      }
    });
  }
}
