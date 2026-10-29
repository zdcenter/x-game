import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, effect, inject, Input, signal, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Math24Store } from '../../store/math24.store';
import { Math24BoardComponent } from '../math24-board/math24-board.component';
import { GamePkHudComponent } from '../../../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../../../shared/components/game-pk-hud/game-pk-hud.model';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-math24-pk-steal',
  standalone: true,
  imports: [CommonModule, Math24BoardComponent, GamePkHudComponent],
  template: `
    <div class="flex flex-col h-full relative overflow-hidden bg-transparent">

      <!-- Universal PK HUD -->
      <div class="flex-none py-1 mb-1 shrink-0 w-full">
        <app-game-pk-hud
          [myPlayer]="myPlayerPkStats()"
          [opponents]="opponentsPkStats()"
          [targetWins]="store.pkTarget()"
          [gameMode]="GameMode.Steal"
          [status]="store.status()"
          [isSpectator]="store.isSpectator()"
          [focusedPlayerId]="store.focusedPlayerId()"
          (playerSelect)="store.setFocusedPlayer($event)">
        </app-game-pk-hud>
      </div>

      <!-- Rule Banner -->
      <div class="flex-none text-center text-[10px] text-[var(--color-text-muted)] py-1 border-b border-[var(--color-border-card)]/40">
        {{ i18n.t('game.math24_steal_goal')().replace('{n}', store.pkTarget().toString()) }}
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
  GameStatus = GameStatus;
  @Input({ required: true }) playerId!: string;
  @Input({ required: true }) hostId!: string;

  store = inject(Math24Store);
  i18n = inject(I18nService);
  private authStore = inject(AuthStore);
  GameMode = GameMode;
  frozenRemaining = signal(0);

  roundWinner = signal<{name: string, isMe: boolean} | null>(null);

  get effectivePlayerId(): string {
    if (this.store.isSpectator()) {
      let targetId = this.store.focusedPlayerId();
      const players = this.store.players();
      if (!targetId || !players[targetId]) {
        const found = Object.keys(players).find(k => k.toLowerCase() === (targetId || '').toLowerCase());
        targetId = found || Object.keys(players)[0] || this.playerId;
      }
      return targetId;
    }
    return this.playerId;
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const isMe = !this.store.isSpectator();
    const targetId = this.effectivePlayerId;
    const p = this.store.players()[targetId];
    const isFinished = this.store.winners().includes(targetId);
    const score = p?.score || 0;
    const target = this.store.pkTarget() || 5;
    const prog = target > 0 ? Math.min(100, Math.round((score / target) * 100)) : 0;
    return {
      id: isMe ? this.playerId : targetId,
      nickname: isMe ? (this.authStore.currentUser()?.nickname || this.playerId) : targetId,
      avatar: isMe ? this.authStore.currentUser()?.avatar : undefined,
      isHost: (isMe ? this.playerId : targetId) === this.hostId,
      isMe: isMe,
      score: score,
      progress: prog,
      status: this.isFrozen(p) ? 'frozen' : (isFinished ? GameStatus.Finished : GameStatus.Playing),
      metrics: [
        { label: this.i18n.t('game.score')() || '得分', value: `${score}/${target}`, icon: '⭐', colorClass: 'text-amber-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    const target = this.store.pkTarget() || 5;
    const isSpec = this.store.isSpectator();
    return Object.entries(this.store.players())
      .filter(([k]) => isSpec || k !== this.playerId)
      .map(([k, v]: [string, any]) => {
        const isFinished = this.store.winners().includes(k);
        const score = v.score || 0;
        const prog = target > 0 ? Math.min(100, Math.round((score / target) * 100)) : 0;
        return {
          id: k,
          nickname: k,
          isHost: k === this.hostId,
          isMe: !isSpec && k === this.playerId,
          score: score,
          progress: prog,
          status: this.isFrozen(v) ? 'frozen' : (isFinished ? GameStatus.Finished : GameStatus.Playing),
          metrics: [
            { label: this.i18n.t('game.score')() || '得分', value: `${score}/${target}`, icon: '⭐', colorClass: 'text-amber-500 font-bold' }
          ]
        };
      });
  });

  constructor() {
    let lastRound = 0;
    let lastScores: Record<string, any> = {};

    effect(() => {
      const state = this.store.ws.gameState() as any;
      if (!state) return;
      const currentRound = state.round || 0;
      const currentScores = state.players || {};
      const puzzle = state.currentPuzzle || state.puzzle;

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
                 this.store.loadMultiplayerPuzzle(puzzle.cards);
              }
           }, 2000);
        });
      } else {
        // Initial load or normal update
        if (puzzle && puzzle.cards && !this.roundWinner()) {
           untracked(() => this.store.loadMultiplayerPuzzle(puzzle.cards));
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
    if (this.store.isSpectator()) return false;
    return this.frozenRemaining() > 0;
  }

  getFirstChar(key: unknown): string {
    return String(key).charAt(0).toUpperCase();
  }

  get opponentHudConfigs() {
    return Object.entries(this.store.players())
      .filter(([k]) => k !== this.playerId)
      .map(([k, v]: [string, any]) => ({
        playerName: k,
        isHost: k === this.hostId,
        stats: [{ icon: '⭐', value: (v.score || 0) + '/' + this.store.pkTarget() }],
        status: this.isFrozen(v) ? 'frozen' : (this.store.status() === GameStatus.Finished ? 'finished' : 'playing')
      }));
  }
}
