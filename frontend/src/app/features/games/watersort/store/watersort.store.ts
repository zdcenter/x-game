import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, signal, computed, inject } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalWatersortEngine, WatersortActionType } from './watersort-engine';
import { ResumeGameService } from '../../../../core/services/resume-game.service';

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
  private resumeService = inject(ResumeGameService);

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




  protected override onSinglePlayerRestart() {
    this.startGame();
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = new LocalWatersortEngine();
      engine.initGame({
        playerId: this.playerId(),
        difficulty: this.currentDifficulty() as string,
        onWin: () => {
          this.resumeService.clearSession('watersort');
          this.submitSinglePlayerStats();
          this.tick.set(this.tick() + 1);
        },
        onPour: () => {
          this.tick.set(this.tick() + 1);
          const eng = this.localEngine();
          if (eng && eng.moves > 0 && !eng.finished) {
            let completed = 0;
            const filledTubes = eng.tubes.filter(t => t.colors.length > 0);
            for (const t of filledTubes) {
              if (t.colors.length === 4 && t.colors.every(c => c === t.colors[0])) {
                completed++;
              }
            }
            const prog = Math.min(99, Math.round((completed / Math.max(1, filledTubes.length)) * 100));
            this.resumeService.saveSession('watersort', {
              difficulty: this.currentDifficulty(),
              difficultyLabel: this.resumeService.getDifficultyLabel(this.currentDifficulty(), 'watersort'),
              progressPercent: prog,
              moves: eng.moves,
              timeElapsed: 0,
              data: {
                difficulty: this.currentDifficulty(),
                tubes: eng.tubes.map(t => ({ colors: [...t.colors] })),
                moves: eng.moves
              }
            });
          }
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

  override joinRoom(
    roomId: string,
    mode: string = GameMode.Single,
    difficulty: string = GameDifficulty.Easy,
    hostId?: string,
    target: number = 1,
    password: string = '',
    bounty: number = 0,
    isSpectator: boolean = false
  ) {
    super.joinRoom(roomId, mode, difficulty, hostId, target, password, bounty, isSpectator);
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
      this.resumeService.clearSession('watersort');
      this.localEngine()?.handleAction({ type: WatersortActionType.Restart });
      this.tick.set(this.tick() + 1);
    } else {
      this.ws.send({ action: C2SAction.RestartGame });
    }
  }

  private submitSinglePlayerStats() {
    this.submitSingleStat({ score: this.localEngine()?.moves || 0 }).subscribe();
  }

  restoreSavedSession(data: any): void {
    if (!data || !data.tubes) return;
    const diff = data.difficulty || this.currentDifficulty();
    const engine = new LocalWatersortEngine();
    engine.initGame({
      playerId: this.playerId(),
      difficulty: diff as string,
      onWin: () => {
        this.resumeService.clearSession('watersort');
        this.submitSinglePlayerStats();
        this.tick.set(this.tick() + 1);
      },
      onPour: () => {
        this.tick.set(this.tick() + 1);
      },
      onInvalid: () => {
        this.tick.set(this.tick() + 1);
      }
    });
    engine.tubes = data.tubes.map((t: any) => ({ colors: [...t.colors] }));
    engine.moves = data.moves || 0;
    engine.status = GameStatus.Playing;
    engine.finished = false;
    this.localEngine.set(engine);
    this.currentDifficulty.set(diff);
    this.tick.set(this.tick() + 1);
  }
}
