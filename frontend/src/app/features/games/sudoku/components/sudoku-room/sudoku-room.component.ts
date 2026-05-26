import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-sudoku-room',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-grow flex items-center justify-center p-6 h-full">
      <div class="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl border border-[var(--color-border-card)] p-8 max-w-2xl w-full text-center">
        <h2 class="text-3xl font-bold mb-2">Waiting Room</h2>
        <p class="text-[var(--color-text-muted)] mb-8">Room ID: <span class="font-mono text-[var(--color-accent-from)]">{{ store.roomId() }}</span></p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          @for (player of getPlayers(); track player.id) {
            <div class="flex flex-col items-center p-4 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-card)]">
              <div class="w-16 h-16 rounded-full bg-slate-700 mb-2 flex items-center justify-center text-2xl">
                👤
              </div>
              <span class="font-semibold">{{ player.id }}</span>
              @if (player.id === store.host()) {
                <span class="text-xs text-yellow-500 font-bold uppercase mt-1">Host</span>
              }
            </div>
          }
        </div>

        <div class="flex justify-center gap-4">
          <button (click)="store.leaveRoom()" class="px-6 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold transition-colors">
            Leave Room
          </button>
          
          @if (store.playerId() === store.host()) {
            <button (click)="store.startGame()" class="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white font-bold hover:opacity-90 transition-opacity">
              Start Game
            </button>
          } @else {
            <div class="px-6 py-3 text-slate-400 font-bold">
              Waiting for host...
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class SudokuRoomComponent {
  store = inject(SudokuStore);
  i18n = inject(I18nService);

  getPlayers(): any[] {
    return Object.values(this.store.players() as any);
  }
}
