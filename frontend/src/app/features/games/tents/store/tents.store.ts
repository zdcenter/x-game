import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalTentsEngine, TentsCellState } from './tents-engine';
import { TentsPuzzle } from './tents-levels';
import { ResumeGameService } from '../../../../core/services/resume-game.service';

@Injectable()
export class TentsStore extends BaseGameStore {
  readonly gameId = GameId.Tents;
  private resumeService = inject(ResumeGameService);

  localEngine = signal<LocalTentsEngine | null>(null);
  tick = signal<number>(0);

  // 放置模式：0: 正常三态循环, 2: 优先帐篷, 3: 优先草丛
  brushMode = signal<TentsCellState | null>(null);

  grid = computed<number[][]>(() => {
    this.tick();
    return this.localEngine()?.grid ?? [];
  });

  size = computed<number>(() => {
    this.tick();
    return this.localEngine()?.size ?? 6;
  });

  rowClues = computed<number[]>(() => {
    this.tick();
    return this.localEngine()?.rowClues ?? [];
  });

  colClues = computed<number[]>(() => {
    this.tick();
    return this.localEngine()?.colClues ?? [];
  });

  trees = computed<{ r: number; c: number }[]>(() => {
    this.tick();
    return this.localEngine()?.trees ?? [];
  });

  totalTrees = computed<number>(() => {
    this.tick();
    return this.localEngine()?.totalTrees ?? 0;
  });

  placedTentsCount = computed<number>(() => {
    this.tick();
    return this.localEngine()?.placedTentsCount ?? 0;
  });

  rowSatisfied = computed<boolean[]>(() => {
    this.tick();
    return this.localEngine()?.rowSatisfied ?? [];
  });

  colSatisfied = computed<boolean[]>(() => {
    this.tick();
    return this.localEngine()?.colSatisfied ?? [];
  });

  rowOver = computed<boolean[]>(() => {
    this.tick();
    return this.localEngine()?.rowOver ?? [];
  });

  colOver = computed<boolean[]>(() => {
    this.tick();
    return this.localEngine()?.colOver ?? [];
  });

  tentConflicts = computed<Set<string>>(() => {
    this.tick();
    return this.localEngine()?.tentConflicts ?? new Set();
  });

  currentLevel = computed<TentsPuzzle | undefined>(() => {
    this.tick();
    return this.localEngine()?.currentLevel;
  });

  activeHint = computed(() => {
    this.tick();
    return this.localEngine()?.activeHint;
  });

  localScore = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.score ?? 0;
    }
    const raw = this.rawState() as any;
    return raw?.players?.[this.playerId()]?.score ?? 0;
  });

  localMoves = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.moves ?? 0;
    }
    return 0;
  });

  readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    this.tick();
    return this.localEngine()?.status ?? GameStatus.Waiting;
  });

  override readonly singlePlayerWinners = computed<string[]>(() => {
    this.tick();
    const eng = this.localEngine();
    return eng && eng.status === GameStatus.Finished ? [this.playerId()] : [];
  });

  currentLevelIndex = signal<number>(0);
  private lastSyncedPkSeed: number | null = null;

  constructor() {
    super();

    // 观战实时镜像同步：自动跟随导播焦点选手盘面
    effect(() => {
      if (this.isSpectator()) {
        const boardState = this.focusedPlayerBoardState();
        if (boardState && this.localEngine()) {
          this.localEngine()?.loadBoardState?.(boardState);
          this.tick.update(t => t + 1);
        }
      }
    });

    // PK 竞技对战与多局重赛：权威同步房间初始种子并生成双方一致的随机棋盘
    effect(() => {
      if (this.currentRoomMode() !== GameMode.Single) {
        const raw = this.rawState() as any;
        const seed = raw?.initial_board?.seed ?? raw?.options?.seed;
        const diff = (raw?.difficulty || this.currentDifficulty() || 'easy') as any;
        if (typeof seed === 'number' && seed !== this.lastSyncedPkSeed) {
          this.lastSyncedPkSeed = seed;
          let eng = this.localEngine();
          if (!eng) {
            eng = new LocalTentsEngine();
            this.localEngine.set(eng);
          }
          eng.initGame({
            difficulty: diff,
            seed,
            onSound: (s) => this.audioService.playTents(s)
          });
          this.tick.set(this.tick() + 1);
        }
      }
    });
  }

  protected override onResetLocalGameState(): void {
    const eng = this.localEngine();
    if (eng) {
      eng.initGame({
        difficulty: this.currentDifficulty() as string,
        levelIndex: this.currentLevelIndex(),
        onSound: (s) => this.audioService.playTents(s)
      });
      this.tick.set(this.tick() + 1);
    }
  }

  startLocalGame(difficulty?: string, levelIndex: number = 0) {
    this.currentRoomMode.set(GameMode.Single);
    const targetDiff = difficulty || this.restoreSavedDifficulty(GameDifficulty.Easy);
    this.currentDifficulty.set(targetDiff);
    this.currentLevelIndex.set(levelIndex);
    this.ws.disconnect(this.gameId);

    const engine = new LocalTentsEngine();
    engine.initGame({
      difficulty: targetDiff,
      levelIndex,
      onSound: (s) => this.audioService.playTents(s)
    });
    this.localEngine.set(engine);
    this.tick.set(this.tick() + 1);
  }

  override startGame() {
    super.startGame();
    if (this.currentRoomMode() === GameMode.Single) {
      if (this.singlePlayerStatus() === GameStatus.Finished) {
        this.nextLevel();
      } else {
        this.startLocalGame(this.currentDifficulty() as string, this.currentLevelIndex());
      }
    }
  }

  override restartGame() {
    super.restartGame();
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (eng) {
        eng.handleAction({ type: 'reset' });
        this.tick.set(this.tick() + 1);
      } else {
        this.startLocalGame(this.currentDifficulty() as string, this.currentLevelIndex());
      }
    }
  }

  setCell(r: number, c: number, explicitState?: TentsCellState) {
    if (this.status() !== GameStatus.Playing || this.isSpectator()) return;

    const eng = this.localEngine();
    if (!eng) return;

    // 如果启用了特定画笔模式（帐篷/草丛），且没有明确指定状态
    const target = explicitState !== undefined ? explicitState : (this.brushMode() ?? undefined);
    eng.handleAction({ type: 'set_cell', row: r, col: c, state: target });
    this.tick.set(this.tick() + 1);

    if (this.currentRoomMode() === GameMode.Single) {
      if (eng.status === GameStatus.Finished) {
        this.resumeService.clearSession('tents');
        this.submitSingleStat({ score: eng.score, won: true }).subscribe();
      } else if (eng.status === GameStatus.Playing && (eng.placedTentsCount > 0 || eng.moves > 0)) {
        const progress = Math.min(99, Math.round((eng.placedTentsCount / Math.max(1, eng.totalTrees)) * 100));
        this.resumeService.saveSession('tents', {
          difficulty: this.currentDifficulty(),
          difficultyLabel: this.resumeService.getDifficultyLabel(this.currentDifficulty(), 'tents'),
          progressPercent: progress,
          moves: eng.moves,
          timeElapsed: 0,
          data: {
            difficulty: this.currentDifficulty(),
            levelIndex: this.currentLevelIndex(),
            size: eng.size,
            moves: eng.moves,
            board: eng.exportBoardState()
          }
        });
      }
    }

    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({
        action: C2SAction.Progress,
        gameId: this.gameId,
        roomId: this.roomId(),
        payload: {
          score: eng.score,
          moves: eng.moves,
          progress: Math.floor((eng.placedTentsCount / Math.max(1, eng.totalTrees)) * 100),
          finished: eng.status === GameStatus.Finished,
          board: eng.exportBoardState()
        }
      });
    }
  }

  autoGrassRow(r: number) {
    const eng = this.localEngine();
    if (!eng) return;
    eng.handleAction({ type: 'auto_grass_row', row: r });
    this.tick.set(this.tick() + 1);
  }

  autoGrassCol(c: number) {
    const eng = this.localEngine();
    if (!eng) return;
    eng.handleAction({ type: 'auto_grass_col', col: c });
    this.tick.set(this.tick() + 1);
  }

  autoGrassAll() {
    const eng = this.localEngine();
    if (!eng) return;
    eng.handleAction({ type: 'auto_grass_all' });
    this.tick.set(this.tick() + 1);
  }

  undo() {
    const eng = this.localEngine();
    if (!eng) return;
    eng.handleAction({ type: 'undo' });
    this.tick.set(this.tick() + 1);
  }

  hint() {
    const eng = this.localEngine();
    if (!eng) return;
    this.recordHintUsed();
    eng.handleAction({ type: 'hint' });
    this.tick.set(this.tick() + 1);
  }

  setLevel(levelIndex: number) {
    this.currentLevelIndex.set(levelIndex);
    const eng = this.localEngine();
    if (!eng) return;
    eng.handleAction({ type: 'set_level', levelIndex });
    this.tick.set(this.tick() + 1);
  }

  nextLevel() {
    const nextIdx = this.currentLevelIndex() + 1;
    this.currentLevelIndex.set(nextIdx);
    const eng = this.localEngine();
    if (eng) {
      eng.handleAction({ type: 'next_level' });
      this.tick.set(this.tick() + 1);
    } else {
      this.startLocalGame(this.currentDifficulty() as string, nextIdx);
    }
  }

  toggleBrushMode(mode: TentsCellState) {
    if (this.brushMode() === mode) {
      this.brushMode.set(null); // 取消画笔，恢复三态循环
    } else {
      this.brushMode.set(mode);
    }
  }

  restoreSavedSession(data: any): void {
    if (!data || !data.board) return;
    const diff = data.difficulty || this.currentDifficulty();
    const lvlIdx = data.levelIndex ?? this.currentLevelIndex();
    this.startLocalGame(diff as string, lvlIdx);
    const eng = this.localEngine();
    if (eng && Array.isArray(data.board)) {
      for (let r = 0; r < data.board.length; r++) {
        for (let c = 0; c < (data.board[r]?.length || 0); c++) {
          const val = data.board[r][c];
          if (val === 2 || val === 3) {
            eng.grid[r][c] = val;
          }
        }
      }
      eng.moves = data.moves || 0;
      eng.validateBoard();
      this.tick.set(this.tick() + 1);
    }
  }
}
