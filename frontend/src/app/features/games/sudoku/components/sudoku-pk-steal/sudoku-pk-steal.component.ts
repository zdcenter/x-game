import { Component, inject, effect, signal, untracked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { SudokuBoardComponent } from '../sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from '../sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from '../sudoku-tools/sudoku-tools.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { GameResultOverlayComponent } from '../../../../../shared/components/game-result-overlay/game-result-overlay.component';

@Component({
  selector: 'app-sudoku-pk-steal',
  standalone: true,
  imports: [CommonModule, SudokuBoardComponent, SudokuNumpadComponent, SudokuToolsComponent, GameResultOverlayComponent],
  template: `
    <div class="flex-grow flex flex-col p-2 md:p-6 gap-2 md:gap-6 overflow-y-auto md:overflow-hidden relative">
      
      @if (store.isFinished() || store.gameStatus() === 'finished') {
        <app-game-result-overlay
          [status]="isWinner() ? 'win' : 'lose'"
          [title]="isWinner() ? i18n.t('game.win')() : i18n.t('game.lose')()"
          [stats]="getStats()"
          [showCancel]="true"
          (cancel)="store.view.set('lobby')">
        </app-game-result-overlay>
      }

      <!-- Top Navigation Bar -->
      <div class="flex justify-between items-center bg-[var(--color-bg-card)] p-3 md:p-4 rounded-xl border border-[var(--color-border-card)] shadow-md shrink-0 w-full max-w-[500px] md:max-w-none mx-auto mb-2 md:mb-0">
        <button (click)="store.leaveRoom()" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm md:text-base">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          {{ i18n.t('game.leave')() }}
        </button>
        <div class="text-[var(--color-text-main)] font-bold opacity-80 uppercase tracking-widest text-sm md:text-base">
          {{ i18n.t('game.pk_steal_label')() }}
        </div>
        <div class="font-mono text-lg md:text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md opacity-0">
          00:00
        </div>
      </div>

      <!-- Top Progress Bars -->
      @if (isFrozenSignal()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm rounded-xl">
          <div class="text-center animate-bounce">
            <div class="text-6xl mb-4">❄️</div>
            <h2 class="text-3xl font-black text-blue-200 drop-shadow-md tracking-widest uppercase">Frozen</h2>
            <div class="mt-4 text-2xl font-black text-white font-mono tracking-widest bg-black/50 px-6 py-2 rounded-full inline-block">
              {{ frozenCountdownDisplay() }}s
            </div>
          </div>
        </div>
      }

      <div class="w-full flex gap-4 overflow-x-auto pb-2">
        @for (player of getSortedPlayers(); track player.id) {
          <div class="flex-1 min-w-[150px] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] p-3 shadow-md flex items-center justify-between"
               [class.border-[var(--color-accent-from)]]="player.id === store.playerId()"
               [class.bg-slate-800]="player.id === store.playerId()">
            <div class="flex items-center gap-2">
              <span class="text-lg">👤</span>
              <span class="font-bold truncate max-w-[80px] text-sm">{{ player.id }}</span>
            </div>
            <div class="font-mono text-lg font-black text-emerald-400">{{ player.score }}</div>
          </div>
        }
      </div>

      <!-- Board, Numpad, Tools Area -->
      <div class="flex-grow flex flex-col md:grid md:grid-cols-[minmax(0,500px)_64px] justify-start md:justify-center md:content-start items-center md:items-start gap-2 md:gap-6 min-h-0 w-full max-w-[500px] md:max-w-none mx-auto">
        <div class="order-1 relative min-w-0 w-full" [class.animate-board-shake]="store.isFinished() || store.gameStatus() === 'finished'">
          <app-sudoku-board class="w-full"></app-sudoku-board>
        </div>

        <div class="order-2 md:order-none md:col-start-2 md:row-start-1 md:row-span-2 w-full md:w-16 flex-shrink-0 mt-1 md:mt-0">
          <app-sudoku-numpad></app-sudoku-numpad>
        </div>

        <div class="order-3 md:order-none md:col-start-1 md:row-start-2 w-full mt-1 md:mt-0">
          <app-sudoku-tools class="w-full"></app-sudoku-tools>
        </div>
      </div>
    </div>
  `
})
export class SudokuPkStealComponent {
  store = inject(SudokuStore);
  i18n = inject(I18nService);

  isFrozenSignal = signal<boolean>(false);
  frozenCountdownDisplay = signal<number>(0);
  freezeTimer: any = null;
  freezeInterval: any = null;

  getSortedPlayers() {
    const players = Object.values(this.store.players() as any) as any[];
    return players.sort((a, b) => b.score - a.score);
  }

  getStats() {
    const players = this.getSortedPlayers();
    const myPlayer = players.find(p => p.id === this.store.playerId());
    if (myPlayer) {
      return [{ label: 'SCORE', value: myPlayer.score }];
    }
    return [];
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

    // Handle freeze countdown
    effect(() => {
      const players = this.store.players() as any;
      const me = players[this.store.playerId()];
      if (!me) return;
      
      const until = me.freezeUntil;
      const now = Date.now();
      
      if (this.freezeInterval) {
        clearInterval(this.freezeInterval);
        this.freezeInterval = null;
      }
      
      if (until > now) {
        this.isFrozenSignal.set(true);
        this.frozenCountdownDisplay.set(Math.ceil((until - now) / 1000));
        
        this.freezeInterval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          } else {
            this.frozenCountdownDisplay.set(rem);
          }
        }, 100);

        clearTimeout(this.freezeTimer);
        this.freezeTimer = setTimeout(() => {
          this.isFrozenSignal.set(false);
          if (this.freezeInterval) {
            clearInterval(this.freezeInterval);
            this.freezeInterval = null;
          }
        }, until - Date.now());
      } else {
        this.isFrozenSignal.set(false);
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy() {
    if (this.freezeInterval) clearInterval(this.freezeInterval);
    if (this.freezeTimer) clearTimeout(this.freezeTimer);
  }
}
