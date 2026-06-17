import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthStore } from '../../../../core/auth/auth.store';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalWatersortEngine, WatersortActionType } from './watersort-engine';

export interface Tube {
  colors: string[];
}

export interface PlayerState {
  id: string;
  tubes: Tube[];
  moves: number;
  finished: boolean;
}

export interface WatersortState {
  players: Record<string, PlayerState>;
  status: string;
  winners: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WatersortStore extends BaseGameStore {
  readonly gameId = GameId.WaterSort;



  private localEngine = signal<LocalWatersortEngine | null>(null);
  private tick = signal(0);

  override readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    this.tick();
    return this.localEngine()?.status || 'waiting';
  });

  override readonly singlePlayerWinners = computed(() => {
    this.tick();
    return this.localEngine()?.finished ? [this.playerId()] : [];
  });

  readonly players = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      const eng = this.localEngine();
      return {
        [this.playerId()]: {
          id: this.playerId(),
          tubes: eng?.tubes || [],
          moves: eng?.moves || 0,
          finished: eng?.finished || false
        }
      };
    }
    return (this.rawState() as any)?.players || {};
  });




  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = new LocalWatersortEngine();
      engine.initGame({
        playerId: this.playerId(),
        difficulty: this.currentDifficulty() as string,
        onWin: () => {
          this.submitSinglePlayerStats();
          this.tick.set(this.tick() + 1);
        },
        onPour: () => {
          this.tick.set(this.tick() + 1);
        },
        onInvalid: () => {
          // Play clink sound in component instead of passing audio here to avoid circular dep
          this.tick.set(this.tick() + 1);
        }
      });
      this.localEngine.set(engine);
      this.tick.set(this.tick() + 1);
    } else {
      super.startGame();
    }
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Easy, hostId?: string, target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);
    if (mode === GameMode.Single) {
      this.startGame();
    }
  }

  pour(fromIndex: number, toIndex: number) {
    if (this.status() !== GameStatus.Playing) return;

    if (this.currentRoomMode() === GameMode.Single) {
      this.localEngine()?.handleAction({ type: WatersortActionType.Pour, from: fromIndex, to: toIndex });
      this.tick.set(this.tick() + 1);
    } else {
      this.ws.send({
        action: C2SAction.Pour,
        from: fromIndex,
        to: toIndex
      });
    }
  }

  restart() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.localEngine()?.handleAction({ type: WatersortActionType.Restart });
      this.tick.set(this.tick() + 1);
    } else {
      this.ws.send({ action: C2SAction.RestartGame });
    }
  }

  private submitSinglePlayerStats() {
    this.submitSingleStat({ score: this.localEngine()?.moves || 0 }).subscribe();
  }
}
