import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, signal, computed, inject } from '@angular/core';
import { AudioService } from '../../../../core/services/audio.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalLightsoutEngine, LightsoutActionType } from './lightsout-engine';

@Injectable()
export class LightsoutStore extends BaseGameStore {
  readonly gameId = GameId.LightsOut;

  private audio = inject(AudioService);

  private localEngine = signal<LocalLightsoutEngine | null>(null);
  private tick = signal(0);

  readonly board = computed<boolean[][]>(() => {
    this.tick();
    if (this.currentRoomMode() === GameMode.Single) {
      const b = this.localEngine()?.board || [];
      return b.map(row => [...row]);
    }
    const st = this.rawState() as any;
    if (st?.players && st.players[this.playerId()]) {
      const b = st.players[this.playerId()].board || [];
      return b.map((row: any) => [...row]);
    }
    return [];
  });

  readonly moves = computed<number>(() => {
    this.tick();
    if (this.currentRoomMode() === GameMode.Single) {
      return this.localEngine()?.moves || 0;
    }
    const st = this.rawState() as any;
    if (st?.players && st.players[this.playerId()]) {
      return st.players[this.playerId()].moves || 0;
    }
    return 0;
  });

  readonly targetMode = signal<'on' | 'off'>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('lightsout_target_mode') as any)) || 'on'
  );

  readonly totalLights = computed<number>(() => {
    const s = this.size();
    return s * s;
  });

  readonly litLights = computed<number>(() => {
    this.tick();
    const b = this.board();
    let count = 0;
    for (const row of b) {
      for (const light of row) {
        if (light) count++;
      }
    }
    return count;
  });

  readonly remainingGoalLights = computed<number>(() => {
    this.tick();
    const lit = this.litLights();
    const total = this.totalLights();
    return this.targetMode() === 'on' ? Math.max(0, total - lit) : lit;
  });

  readonly remainingLights = computed<number>(() => this.remainingGoalLights());

  readonly clearedPercentage = computed<number>(() => {
    this.tick();
    const total = this.totalLights();
    if (total <= 0) return 0;
    const rem = this.remainingGoalLights();
    return Math.max(0, Math.min(100, Math.round(((total - rem) / total) * 100)));
  });

  readonly canUndo = computed<boolean>(() => {
    if (this.currentRoomMode() !== GameMode.Single) return false;
    this.tick();
    return (this.localEngine()?.moveHistory?.length || 0) > 0;
  });

  readonly colorTheme = signal<'amber'>('amber');

  readonly lastToggled = signal<{ row: number; col: number; ts: number } | null>(null);

  readonly size = computed<number>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.size || 5;
    }
    return (this.rawState() as any)?.size || 5;
  });

  override readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    this.tick();
    return this.localEngine()?.status || 'waiting';
  });

  override readonly isFinished = computed<boolean>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.finished || false;
    }
    const st = this.rawState() as any;
    if (st?.players && st.players[this.playerId()]) {
      return st.players[this.playerId()].finished || false;
    }
    return false;
  });

  override readonly singlePlayerWinners = computed(() => {
    this.tick();
    return this.localEngine()?.finished ? [this.playerId()] : [];
  });




  readonly opponents = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const st = this.rawState() as any;
    if (!st?.players) return [];
    
    return Object.keys(st.players)
      .filter(id => id !== this.playerId())
      .map(id => {
        const p = st.players[id];
        let remaining = 0;
        if (p.board) {
          for (const row of p.board) {
            for (const light of row) {
              if (light) remaining++;
            }
          }
        }
        return {
          id,
          moves: p.moves || 0,
          remainingLights: remaining,
          finished: p.finished || false
        };
      });
  });

  readonly currentSolution = computed(() => this.currentRoomMode() === GameMode.Single ? (this.localEngine()?.solution || []) : (this.rawState() as any)?.solution || []);

  constructor() {
    super();
  }

  private getDifficultySize(diff: string): number {
    return diff === GameDifficulty.Easy ? 4 : diff === GameDifficulty.Hard ? 6 : diff === GameDifficulty.Expert ? 7 : diff === GameDifficulty.Master ? 8 : 5;
  }

  protected override onSinglePlayerRestart() {
    this.startGame();
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      const diff = this.currentDifficulty() as string;
      const engine = new LocalLightsoutEngine();
      engine.initGame({
        playerId: this.playerId(),
        difficulty: diff,
        size: this.getDifficultySize(diff),
        targetMode: this.targetMode(),
        onWin: () => {
          this.audio.playPuzzle('success');
          this.submitSinglePlayerStats();
          this.tick.set(this.tick() + 1);
        }
      });
      this.localEngine.set(engine);
      this.tick.set(this.tick() + 1);
    } else {
      super.startGame();
    }
  }

  toggleTargetMode() {
    if (this.currentRoomMode() !== GameMode.Single) return;
    const next = this.targetMode() === 'on' ? 'off' : 'on';
    this.targetMode.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lightsout_target_mode', next);
    }
    this.startGame();
  }

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Medium, hostId?: string, target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);
    if (mode === GameMode.Single) {
      this.startGame();
    }
  }


  toggle(row: number, col: number) {
    if (this.status() !== GameStatus.Playing || this.isFinished()) return;

    this.lastToggled.set({ row, col, ts: Date.now() });

    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine) {
        engine.handleAction({ type: LightsoutActionType.Toggle, row, col });
        this.audio.playPuzzle('toggle');
        this.tick.set(this.tick() + 1);
      }
    } else {
      this.ws.send({ action: C2SAction.Toggle, row, col });
      this.audio.playPuzzle('toggle');
    }
  }

  undo() {
    if (this.currentRoomMode() !== GameMode.Single || this.status() !== GameStatus.Playing || this.isFinished()) return;
    const engine = this.localEngine();
    if (engine && engine.moveHistory.length > 0) {
      const last = engine.moveHistory[engine.moveHistory.length - 1];
      this.lastToggled.set({ row: last.row, col: last.col, ts: Date.now() });
      engine.handleAction({ type: LightsoutActionType.Undo });
      this.audio.playPuzzle('move');
      this.tick.set(this.tick() + 1);
    }
  }

  forfeit() {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine) {
        engine.handleAction({ type: LightsoutActionType.Forfeit });
        this.tick.set(this.tick() + 1);
      }
    } else {
      this.ws.send({ action: C2SAction.Forfeit });
    }
  }

  changeDifficulty(diff: string) {
    if (this.currentRoomMode() === GameMode.Single) {
      this.currentDifficulty.set(diff);
      this.startGame();
    }
  }

  private submitSinglePlayerStats() {
    this.submitSingleStat({ score: this.localEngine()?.moves || 0 }).subscribe();
  }
}
