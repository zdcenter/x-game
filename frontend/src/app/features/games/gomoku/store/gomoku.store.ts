import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { AudioService } from '../../../../core/services/audio.service';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { LocalGomokuEngine, GomokuActionType } from './gomoku-engine';
import { GomokuColor } from './gomoku-ai';
import { C2SAction } from '../../../../core/models/websocket.model';

@Injectable()
export class GomokuStore extends BaseGameStore {
  override readonly singlePlayerWinners = computed<string[]>(() => []);

  readonly gameId = GameId.Gomoku;

  private statsService = inject(GameStatsService);
  private audio = inject(AudioService);

  private emptyBoard = this.createEmptyBoard();

  // Local state for single player mode
  private localEngine = signal<LocalGomokuEngine | null>(null);
  private tick = signal(0); // Trigger reactivity for engine mutations

  // Public computed states (reactive derivation from ws state or local state)
  board = computed<GomokuColor[][]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      const eng = this.localEngine();
      return eng ? eng.board : this.emptyBoard;
    }
    return (this.rawState() as any)?.board || this.emptyBoard;
  });

  currentTurn = computed<string>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.currentTurn || '';
    }
    return (this.rawState() as any)?.currentTurn || '';
  });

  lastMove = computed<number[] | null>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.lastMove || null;
    }
    return (this.rawState() as any)?.lastMove || null;
  });

  winningLine = computed<number[][] | null>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.winningLine || null;
    }
    return (this.rawState() as any)?.winningLine || null;
  });

  playerColors = computed<Record<string, GomokuColor>>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.playerColors || {};
    }
    return (this.rawState() as any)?.playerColors || {};
  });

  override readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.status || 'waiting';
    }
    const st = this.rawState() as any;
    if (!st) return GameStatus.Waiting;
    
    let status = st.status;
    if (typeof status === 'number') {
      const statusMap: any[] = [GameStatus.Waiting, GameStatus.Starting, GameStatus.Playing, GameStatus.Finished];
      status = statusMap[status] || 'waiting';
    }
    return status || 'waiting';
  });

  readonly winner = computed<string | undefined>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.winner;
    }
    return (this.rawState() as any)?.winner;
  });

  override readonly hostId = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.playerId();
    return (this.rawState() as any)?.host || '';
  });

  override readonly singlePlayerList = computed(() => {
    this.tick();
    return (this.localEngine()?.players || []).map(id => ({ id }));
  });

  isSpectator = computed<boolean>(() => {
    if (this.currentRoomMode() === GameMode.Single) return false;
    const p = this.playersList().map(pl => pl.id);
    const myId = this.playerId();
    if (!myId || p.length === 0) return false;
    return !p.includes(myId);
  });

  override readonly readyPlayers = computed<Record<string, boolean>>(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    return (this.rawState() as any)?.readyPlayers || {};
  });

  constructor() {
    super();
    // Play drop sound on moves in multiplayer mode
    let lastTurn = '';
    effect(() => {
      const state = this.rawState() as any;
      if (this.currentRoomMode() !== GameMode.Single && state && state.board && this.status() === GameStatus.Playing) {
        const turn = state.currentTurn || '';
        if (lastTurn && turn && turn !== lastTurn) {
          this.audio.playGomoku('stoneDrop');
        }
        lastTurn = turn;
      }
    });
  }

  createEmptyBoard(): GomokuColor[][] {
    const b: GomokuColor[][] = [];
    for (let i = 0; i < 15; i++) {
      b.push(new Array(15).fill(0));
    }
    return b;
  }

  startLocalGame(difficulty: string = GameDifficulty.Medium) {
    this.currentRoomMode.set(GameMode.Single);
    this.currentDifficulty.set(difficulty);
    this.ws.disconnect(GameId.Gomoku);

    const engine = new LocalGomokuEngine();
    engine.initGame({
      playerId: this.playerId(),
      difficulty: difficulty,
      onAiMove: () => {
        this.audio.playGomoku('stoneDrop');
        this.tick.set(this.tick() + 1);
      },
      onGameOver: (win: boolean) => {
        this.submitSinglePlayerStats(win);
        this.tick.set(this.tick() + 1);
      }
    });
    this.localEngine.set(engine);
    this.tick.set(this.tick() + 1);
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame(this.currentDifficulty() as string);
    } else {
      super.startGame();
    }
  }

  surrender() {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine) {
        engine.handleAction({ type: GomokuActionType.Surrender });
        this.tick.set(this.tick() + 1);
      }
    } else {
      this.ws.send({ action: C2SAction.Forfeit });
    }
  }

  makeMove(y: number, x: number) {
    if (this.status() !== GameStatus.Playing) return;
    
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine && engine.currentTurn === this.playerId()) {
        engine.handleAction({ type: GomokuActionType.Move, y, x });
        this.audio.playGomoku('stoneDrop');
        this.tick.set(this.tick() + 1);
      }
    } else {
      if (this.currentTurn() !== this.playerId()) return;
      this.ws.send({ action: C2SAction.Move, y, x });
    }
  }

  private submitSinglePlayerStats(win: boolean) {
    if (!this.auth.currentUser()) return;
    this.statsService.submitStat(GameId.Gomoku, {
      mode: GameMode.Single,
      difficulty: this.currentDifficulty() as string,
      score: win ? 1 : 0,
      time: 0,
      won: win
    }).subscribe();
  }
}
