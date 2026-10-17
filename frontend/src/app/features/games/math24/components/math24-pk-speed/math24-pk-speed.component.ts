import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, effect, inject, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';
import { GamePkHudComponent } from '../../../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../../../shared/components/game-pk-hud/game-pk-hud.model';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-math24-pk-speed',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent, GamePkHudComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">

      <!-- Universal PK HUD -->
      <div class="flex-none py-1 mb-1 shrink-0 w-full">
        <app-game-pk-hud
          [myPlayer]="myPlayerPkStats()"
          [opponents]="opponentsPkStats()"
          [targetWins]="totalPuzzles"
          [gameMode]="GameMode.Speed"
          [status]="store.status()">
        </app-game-pk-hud>
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
  private authStore = inject(AuthStore);
  GameMode = GameMode;
  frozenRemaining = signal(0);

  get totalPuzzles(): number {
    return this.store.pkTarget() || (this.store.ws.gameState() as any)?.puzzles?.length || 1;
  }

  get myProgress(): number {
    return this.store.players()[this.playerId]?.progress || 0;
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const p = this.store.players()[this.playerId];
    const isFinished = this.store.winners().includes(this.playerId) || (p?.progress || 0) >= this.totalPuzzles;
    const prog = this.totalPuzzles > 0 ? Math.min(100, Math.round(((p?.progress || 0) / this.totalPuzzles) * 100)) : 0;
    return {
      id: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.hostId,
      isMe: true,
      score: p?.progress || 0,
      progress: prog,
      status: this.isFrozen(p) ? 'frozen' : (isFinished ? GameStatus.Finished : GameStatus.Playing),
      metrics: [
        { label: this.i18n.t('game.puzzles')() || '题数', value: `${p?.progress || 0}/${this.totalPuzzles}`, icon: '🧩', colorClass: 'text-blue-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    return Object.entries(this.store.players())
      .filter(([k]) => k !== this.playerId)
      .map(([k, v]: [string, any]) => {
        const isFinished = this.store.winners().includes(k) || (v.progress || 0) >= this.totalPuzzles;
        const prog = this.totalPuzzles > 0 ? Math.min(100, Math.round(((v.progress || 0) / this.totalPuzzles) * 100)) : 0;
        return {
          id: k,
          nickname: k,
          isHost: k === this.hostId,
          isMe: false,
          score: v.progress || 0,
          progress: prog,
          status: this.isFrozen(v) ? 'frozen' : (isFinished ? GameStatus.Finished : GameStatus.Playing),
          metrics: [
            { label: this.i18n.t('game.puzzles')() || '题数', value: `${v.progress || 0}/${this.totalPuzzles}`, icon: '🧩', colorClass: 'text-blue-500 font-bold' }
          ]
        };
      });
  });

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
