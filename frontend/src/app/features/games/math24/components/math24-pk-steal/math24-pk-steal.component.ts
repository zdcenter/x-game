import { Component, effect, inject, Input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';
import { PlayerBadgeComponent } from '../../../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../../../shared/components/player-list-container/player-list-container.component';

@Component({
  selector: 'app-math24-pk-steal',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent, PlayerBadgeComponent, PlayerListContainerComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">
      
      <!-- Top Scoreboard -->
      <div class="flex-none pt-2 pb-4 mb-2 border-b border-[var(--color-border-card)]">
        <div class="flex items-center gap-2 lg:gap-4 max-w-4xl mx-auto px-2">
          
          <!-- Local Player -->
          <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
            [playerName]="playerId"
            [isHost]="playerId === hostId"
            [isMe]="true"
            [score]="store.players()[playerId]?.score || 0"
            [status]="isFrozen(store.players()[playerId]) ? 'frozen' : (store.gameStatus() === 'finished' ? 'finished' : 'playing')"
            [freezeCountdown]="isFrozen(store.players()[playerId]) ? getFrozenRemaining(store.players()[playerId]) : undefined"
          ></app-player-badge>

          <!-- Opponents -->
          <app-player-list-container [opponentsCount]="store.players() ? (store.players() | keyvalue)?.length! - 1 : 0" class="flex-1 min-w-0 flex justify-end lg:justify-start">
            <ng-template #opponentsList>
              <ng-container *ngFor="let kv of store.players() | keyvalue">
                <app-player-badge *ngIf="kv.key !== playerId" class="w-full lg:flex-1 lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                  [playerName]="$any(kv.key)"
                  [isHost]="kv.key === hostId"
                  [isMe]="false"
                  [score]="kv.value.score"
                  [status]="isFrozen(kv.value) ? 'frozen' : (store.gameStatus() === 'finished' ? 'finished' : 'playing')"
                  [freezeCountdown]="isFrozen(kv.value) ? getFrozenRemaining(kv.value) : undefined"
                ></app-player-badge>
              </ng-container>
            </ng-template>
          </app-player-list-container>
        </div>
      </div>

      <!-- Main Board Area -->
        <!-- Round Winner Overlay -->
        <div *ngIf="roundWinner()" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-[60] animate-in fade-in duration-300">
          <span class="text-8xl mb-6 animate-bounce">{{ roundWinner()?.isMe ? '🎉' : '👏' }}</span>
          <h2 class="text-5xl font-black mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              [ngClass]="roundWinner()?.isMe ? 'text-green-400' : 'text-blue-400'">
            {{ roundWinner()?.isMe ? 'You' : roundWinner()?.name }} Solved It!
          </h2>
          <div class="text-3xl font-bold text-yellow-400 bg-yellow-400/20 px-6 py-3 rounded-full border border-yellow-400/50">
            +10 Points
          </div>
          <p class="text-white/70 mt-6 text-xl font-medium animate-pulse">Get ready for next round...</p>
        </div>
      <div class="flex-1 relative overflow-hidden" [class.pointer-events-none]="isMyPlayerFrozen()">
        <app-math24-board></app-math24-board>
        
        <!-- Freeze Overlay -->
        <div *ngIf="isMyPlayerFrozen()" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-blue-950/60 backdrop-blur-md z-50">
          <span class="text-6xl mb-4 animate-bounce">🥶</span>
          <div class="text-4xl text-white font-black mb-2">{{ frozenRemaining() }}</div>
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
      frozenRemaining = signal(0);

  roundWinner = signal<{name: string, isMe: boolean} | null>(null);

  constructor() {
    let lastRound = 0;
    let lastScores: Record<string, any> = {};

    effect(() => {
      const state = this.store.rawState() as any;
      const currentRound = state.round || 0;
      const currentScores = state.players || {};
      const puzzle = state.puzzle;

      if (currentRound > lastRound && lastRound > 0) {
        // Someone won the round!
        let winner = '';
        for (const pid in currentScores) {
           if (currentScores[pid].score > (lastScores[pid]?.score || 0)) {
               winner = pid;
           }
        }
        
        untracked(() => {
           this.roundWinner.set({ name: winner, isMe: winner === this.playerId });
           setTimeout(() => {
              this.roundWinner.set(null);
              if (puzzle && puzzle.cards) {
                 this.store.loadPuzzle(puzzle.cards);
              }
           }, 2000);
        });
      } else {
        // Initial load or normal update
        if (puzzle && puzzle.cards && !this.roundWinner()) {
           untracked(() => this.store.loadPuzzle(puzzle.cards));
        }
      }

      lastRound = currentRound;
      lastScores = JSON.parse(JSON.stringify(currentScores));
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

  getFirstChar(key: unknown): string {
    return String(key).charAt(0).toUpperCase();
  }
}
