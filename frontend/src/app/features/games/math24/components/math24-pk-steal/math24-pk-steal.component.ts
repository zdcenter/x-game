import { Component, effect, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';

@Component({
  selector: 'app-math24-pk-steal',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">
      
      <!-- Top Scoreboard -->
      <div class="flex-none p-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border-card)]">
        <div class="flex flex-wrap gap-4 justify-center items-center max-w-4xl mx-auto">
          <div *ngFor="let kv of store.players() | keyvalue"
               class="flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300"
               [ngClass]="{
                 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 scale-105': kv.key === playerId,
                 'border-[var(--color-border-card)] bg-[var(--color-bg-main)]': kv.key !== playerId,
                 'opacity-50 grayscale': isFrozen(kv.value)
               }">
            <!-- Player Avatar Placeholder -->
            <div class="w-10 h-10 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center font-bold text-lg">
              {{ getFirstChar(kv.key) }}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-medium text-[var(--color-text-muted)]" [class.text-blue-400]="kv.key === playerId">
                {{ kv.key === playerId ? 'You' : kv.key }}
              </span>
              <div class="flex items-center gap-1">
                <span class="text-xl font-black text-[var(--color-text-main)]">{{ kv.value.score }}</span>
                <span class="text-xs text-[var(--color-text-muted)]">pts</span>
              </div>
            </div>
            
            <div *ngIf="isFrozen(kv.value)" class="absolute inset-0 flex items-center justify-center bg-blue-900/40 rounded-xl backdrop-blur-sm z-10">
              <span class="text-2xl animate-pulse">❄️</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Board Area -->
      <div class="flex-1 relative overflow-hidden" [class.pointer-events-none]="isMyPlayerFrozen()">
        <app-math24-board></app-math24-board>
        
        <!-- Freeze Overlay -->
        <div *ngIf="isMyPlayerFrozen()" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-blue-950/60 backdrop-blur-md z-50">
          <span class="text-6xl mb-4 animate-bounce">🥶</span>
          <h2 class="text-3xl font-black text-blue-300 mb-2">Frozen!</h2>
          <p class="text-blue-200">You made a mistake. Wait a moment...</p>
        </div>
      </div>

    </div>
  `
})
export class Math24PkStealComponent {
  @Input({ required: true }) playerId!: string;
  @Input({ required: true }) hostId!: string;

  store = inject(Math24Store);

  constructor() {
    effect(() => {
      const puzzle = this.store.currentPuzzle();
      if (puzzle && puzzle.cards) {
        this.store.loadPuzzle(puzzle.cards);
      }
    });
  }

  isFrozen(player: any): boolean {
    if (!player || !player.freezeUntil) return false;
    return player.freezeUntil > Date.now();
  }

  isMyPlayerFrozen(): boolean {
    const p = this.store.players()[this.playerId];
    return this.isFrozen(p);
  }

  getFirstChar(key: unknown): string {
    return String(key).charAt(0).toUpperCase();
  }
}
