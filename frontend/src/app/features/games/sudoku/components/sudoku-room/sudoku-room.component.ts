import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SudokuStore } from '../../store/sudoku.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-sudoku-room',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-grow flex items-center justify-center p-4 sm:p-6 h-full">
      <div class="bg-[var(--color-bg-card)] rounded-2xl sm:rounded-3xl shadow-2xl border border-[var(--color-border-card)] p-6 sm:p-8 max-w-2xl w-full text-center relative overflow-hidden">
        <!-- Decorative bg -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent-from)] opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-accent-to)] opacity-5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div class="relative z-10">
          <h2 class="text-3xl sm:text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-tight">Waiting Room</h2>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-8 text-sm sm:text-base">
            <p class="text-[var(--color-text-muted)] font-medium bg-black/20 px-4 py-2 rounded-xl">Mode: <span class="text-blue-400 font-bold ml-1">{{ store.currentMode() === 'pk_steal' ? 'Steal Mode' : 'Speed Mode' }}</span></p>
            <p class="text-[var(--color-text-muted)] font-medium bg-black/20 px-4 py-2 rounded-xl">Room: <span class="font-mono text-[var(--color-accent-from)] font-bold ml-1">{{ store.roomId() }}</span></p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
            @for (player of getPlayers(); track player.id) {
              <div class="flex flex-col items-center p-4 sm:p-6 bg-[var(--color-bg-main)] rounded-2xl border border-[var(--color-border-card)] shadow-inner relative group">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-[var(--color-border-card)] mb-3 flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition-transform">
                  @if (player.id === store.host()) { 👑 } @else { 👤 }
                </div>
                <span class="font-bold text-slate-200 truncate w-full text-center">{{ player.id }}</span>
                @if (player.id === store.host()) {
                  <span class="absolute -top-3 bg-yellow-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-md shadow-yellow-500/20">Host</span>
                }
              </div>
            }
          </div>

          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <button (click)="store.leaveRoom()" class="px-8 py-3.5 rounded-xl border-2 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 font-bold transition-all active:scale-95">
              {{ i18n.t('game.leave')() }}
            </button>
            
            @if (store.playerId() === store.host()) {
              <button (click)="store.startGame()" class="px-10 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase tracking-wider hover:opacity-90 shadow-lg shadow-emerald-500/25 transition-all active:scale-95">
                Start Match
              </button>
            } @else {
              <div class="px-8 py-3.5 bg-black/20 rounded-xl text-slate-400 font-bold border border-transparent flex items-center justify-center gap-3">
                <div class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                Waiting for host...
              </div>
            }
          </div>
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
