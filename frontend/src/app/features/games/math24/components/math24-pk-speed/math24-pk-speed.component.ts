import { Component, effect, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';
import { PlayerBadgeComponent } from '../../../../../shared/components/player-badge/player-badge.component';

@Component({
  selector: 'app-math24-pk-speed',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent, PlayerBadgeComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">
      
      <!-- Top Progress Board -->
      <div class="flex-none p-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border-card)]">
        <div class="flex flex-col gap-4 max-w-4xl mx-auto">
          
          <app-player-badge
            *ngFor="let kv of store.players() | keyvalue"
            layout="bar"
            [playerName]="$any(kv.key)"
            [isHost]="kv.key === hostId"
            [isMe]="kv.key === playerId"
            [progress]="{ current: kv.value.progress || 0, total: totalPuzzles }"
            [status]="isFrozen(kv.value) ? 'frozen' : (store.gameStatus() === 'finished' ? 'finished' : 'playing')"
            [freezeCountdown]="isFrozen(kv.value) ? getFrozenRemaining(kv.value) : undefined"
          ></app-player-badge>

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

  getFrozenRemaining(player: any): number {
    if (!player || !player.freezeUntil) return 0;
    const rem = Math.ceil((player.freezeUntil - Date.now()) / 1000);
    return Math.max(0, rem);
  }

  isMyPlayerFrozen(): boolean {
    return this.frozenRemaining() > 0;
  }
}
