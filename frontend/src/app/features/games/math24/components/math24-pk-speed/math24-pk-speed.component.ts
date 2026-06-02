import { Component, effect, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';

@Component({
  selector: 'app-math24-pk-speed',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">
      
      <!-- Top Progress Board -->
      <div class="flex-none p-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border-card)]">
        <div class="flex flex-col gap-4 max-w-4xl mx-auto">
          
          <div *ngFor="let kv of store.players() | keyvalue"
               class="flex items-center gap-4">
            
            <span class="w-16 text-sm font-medium text-right truncate" [class.text-blue-400]="kv.key === playerId">
              {{ kv.key === playerId ? 'You' : kv.key }}
            </span>

            <div class="flex-1 h-6 bg-[var(--color-bg-main)] rounded-full overflow-hidden relative border border-[var(--color-border-card)] shadow-inner">
              <div class="h-full transition-all duration-500 rounded-full relative"
                   [ngClass]="{
                     'bg-gradient-to-r from-blue-600 to-blue-400': kv.key === playerId,
                     'bg-gradient-to-r from-gray-500 to-gray-400': kv.key !== playerId
                   }"
                   [style.width]="(kv.value.progress / totalPuzzles) * 100 + '%'">
                <div class="absolute inset-0 bg-white/20" style="background-image: linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent); background-size: 1rem 1rem;"></div>
              </div>
            </div>

            <span class="w-12 text-sm font-bold text-[var(--color-text-muted)]">{{ kv.value.progress }}/{{ totalPuzzles }}</span>

          </div>

        </div>
      </div>

      <!-- Main Board Area -->
      <div class="flex-1 relative overflow-hidden" [class.pointer-events-none]="isMyPlayerFrozen()">
        
        <ng-container *ngIf="myProgress < totalPuzzles; else finishedBlock">
          <app-math24-board></app-math24-board>
        </ng-container>

        <ng-template #finishedBlock>
          <div class="flex flex-col items-center justify-center h-full">
            <span class="text-6xl mb-4">🎉</span>
            <h2 class="text-3xl font-black text-[var(--color-text-main)] mb-2">Finished!</h2>
            <p class="text-[var(--color-text-muted)]">Waiting for others to complete...</p>
          </div>
        </ng-template>
        
        <!-- Freeze Overlay -->
        <div *ngIf="isMyPlayerFrozen()" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-blue-950/60 backdrop-blur-md z-50">
          <span class="text-6xl mb-4 animate-bounce">🥶</span>
          <div class="text-4xl text-white font-black mb-2">{{ frozenRemaining() }}</div>
          <h2 class="text-3xl font-black text-blue-300 mb-2">Frozen!</h2>
        </div>
      </div>

    </div>
  `
})
export class Math24PkSpeedComponent {
  @Input({ required: true }) playerId!: string;
  @Input({ required: true }) hostId!: string;

  store = inject(Math24Store);
  frozenRemaining = signal(0);

  get totalPuzzles(): number {
    return this.store.rawState().puzzles?.length || 5;
  }

  get myProgress(): number {
    return this.store.players()[this.playerId]?.progress || 0;
  }

  constructor() {
    effect(() => {
      // Whenever progress changes, load the new puzzle
      const puzzle = this.store.currentPuzzle();
      if (puzzle && puzzle.cards) {
        this.store.loadPuzzle(puzzle.cards);
      }
    });

    effect((onCleanup) => {
      const p = this.store.players()[this.playerId];
      const until = p?.freezeUntil || 0;
      const now = Date.now();
      let interval: any;
      if (until > now) {
        this.frozenRemaining.set(Math.ceil((until - now) / 1000));
        interval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(interval);
            this.frozenRemaining.set(0);
          } else {
            this.frozenRemaining.set(rem);
          }
        }, 200);
      } else {
        this.frozenRemaining.set(0);
      }
      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
    });
  }

  isFrozen(player: any): boolean {
    if (!player || !player.freezeUntil) return false;
    return player.freezeUntil > Date.now();
  }

  isMyPlayerFrozen(): boolean {
    return this.frozenRemaining() > 0;
  }
}
