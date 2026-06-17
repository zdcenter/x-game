import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, effect, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';
import { PlayerBadgeComponent } from '../../../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../../../shared/components/player-list-container/player-list-container.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-math24-pk-speed',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent, PlayerBadgeComponent, PlayerListContainerComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">
      
      <!-- Top Progress Board -->
      <div class="flex-none py-2 mb-2 border-b border-[var(--color-border-card)] w-full">
        <div class="flex items-center gap-2 lg:gap-4 max-w-[800px] mx-auto px-2">
          
          <!-- Local Player -->
          <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
            [playerName]="playerId"
            [isHost]="playerId === hostId"
            [isMe]="true"
            [stats]="[{ icon: '🧩', value: (store.players()[playerId]?.progress || 0) + '/' + totalPuzzles }]"
            [status]="isFrozen(store.players()[playerId]) ? 'frozen' : (store.status() === GameStatus.Finished ? GameStatus.Finished : 'playing')"
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
                  [stats]="[{ icon: '🧩', value: (kv.value.progress || 0) + '/' + totalPuzzles }]"
                  [status]="isFrozen(kv.value) ? 'frozen' : (store.status() === GameStatus.Finished ? GameStatus.Finished : 'playing')"
                  [freezeCountdown]="isFrozen(kv.value) ? getFrozenRemaining(kv.value) : undefined"
                ></app-player-badge>
              </ng-container>
            </ng-template>
          </app-player-list-container>
        </div>
      </div>

      <!-- Rule Banner -->
      <div class="flex-none text-center text-[10px] text-[var(--color-text-muted)] py-1 border-b border-[var(--color-border-card)]/40">
        {{ i18n.t('game.math24_speed_goal')().replace('{n}', totalPuzzles.toString()) }}
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
  GameStatus = GameStatus;
  @Input({ required: true }) playerId!: string;
  @Input({ required: true }) hostId!: string;

  store = inject(Math24Store);
  i18n = inject(I18nService);
  frozenRemaining = signal(0);

  get totalPuzzles(): number {
    return this.store.pkTarget() || (this.store.ws.gameState() as any)?.puzzles?.length || 1;
  }

  get myProgress(): number {
    return this.store.players()[this.playerId]?.progress || 0;
  }

  constructor() {
    effect(() => {
      // Whenever progress changes, load the new puzzle
      const puzzle = this.store.currentPuzzle();
      if (puzzle && puzzle.cards) {
        this.store.loadMultiplayerPuzzle(puzzle.cards);
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
