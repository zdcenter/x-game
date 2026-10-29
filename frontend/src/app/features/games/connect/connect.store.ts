import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseGameStore } from '../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { environment } from '../../../../environments/environment';
import { ConnectEngine, ConnectPuzzleDef, normalizeConnectPuzzle } from './connect-engine';
import { C2SAction } from '../../../core/models/websocket.model';

export interface ConnectPlayerState {
  id: string;
  progress: number;
  paths?: string;
  finished: boolean;
}

export interface ConnectGameState {
  mode: string;
  difficulty: string;
  players: Record<string, ConnectPlayerState>;
  puzzle: string; // the JSON string
  winners: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ConnectStore extends BaseGameStore {
  view = signal<'lobby' | 'play'>('lobby');


  override readonly singlePlayerWinners = computed<string[]>(() => {
    return this.singlePlayerStatus() === GameStatus.Finished ? [this.playerId()] : [];
  });

  readonly gameId = GameId.Connect;

  private http = inject(HttpClient);

  timeSpent = signal<number>(0);
  private timer: any;

  localEngine = signal<ConnectEngine | null>(null, { equal: () => false });
  currentLevelId = signal<string>('');
  levelsList = signal<any[]>([]);
  
  hasNextLevel = computed(() => {
    const list = this.levelsList() || [];
    const curr = this.currentLevelId();
    if (!list.length || !curr) return false;
    const idx = list.findIndex(l => l.id === curr);
    return idx >= 0 && idx < list.length - 1;
  });

  currentLevelNum = computed(() => {
    const list = this.levelsList() || [];
    const curr = this.currentLevelId();
    const idx = list.findIndex(l => l.id === curr);
    return idx >= 0 ? idx + 1 : 1;
  });

  // Keep track of completion internally for single player
  private singlePlayerFinished = signal<boolean>(false);

  override readonly singlePlayerStatus = computed<GameStatusType | string>(() =>
    this.singlePlayerFinished() ? GameStatus.Finished : GameStatus.Playing
  );

  override readonly singlePlayerList = computed(() => [{id: this.playerId()}]);

  // Override to make public
  override rawState = computed(() => this.ws.gameState());

  myPlayerState = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (!engine) return null;
      return { 
        id: this.playerId(), 
        progress: this.myProgress(), 
        finished: this.singlePlayerFinished()
      } as ConnectPlayerState;
    }

    if (this.isSpectator()) {
      const state = this.rawState() as ConnectGameState;
      if (!state || !state.players) return null;
      let targetId = this.focusedPlayerId();
      if (!targetId || !state.players[targetId]) {
        const found = Object.keys(state.players).find(k => k.toLowerCase() === targetId.toLowerCase());
        if (found) targetId = found;
        else targetId = Object.keys(state.players)[0] || '';
      }
      return state.players[targetId] || null;
    }

    const state = this.rawState() as ConnectGameState;
    if (!state || !state.players) return null;
    return state.players[this.playerId()];
  });

  boardVersion = signal<number>(0);

  myProgress = computed(() => {
    this.boardVersion();
    const engine = this.localEngine();
    if (!engine) return 0;
    
    const filled = engine.getFilledCellsCount();
    const total = engine.getTotalCellsCount();
    return total > 0 ? (filled / total) * 100 : 0;
  });

  connectedFlows = computed(() => {
    this.boardVersion();
    const engine = this.localEngine();
    if (!engine) return 0;
    return engine.getConnectedFlowsCount();
  });

  totalFlows = computed(() => {
    this.boardVersion();
    const engine = this.localEngine();
    if (!engine) return 0;
    return engine.getTotalFlowsCount();
  });

  coveragePercent = computed(() => {
    this.boardVersion();
    const engine = this.localEngine();
    if (!engine) return 0;
    const filled = engine.getFilledCellsCount();
    const total = engine.getTotalCellsCount();
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  });

  opponents = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const state = this.rawState() as ConnectGameState;
    if (!state || !state.players) return [];
    
    return Object.values(state.players)
      .filter(p => this.isSpectator() || p.id !== this.playerId())
      .map(p => ({
        id: p.id,
        progress: p.progress,
        finished: p.finished,
        isHost: p.id === this.hostId()
      }));
  });

  joinRoomWithLevel(levelId: string, difficulty: string) {
    super.joinRoom('', GameMode.Single, difficulty);
    this.timeSpent.set(0);
    this.singlePlayerFinished.set(false);
    this.currentDifficulty.set(difficulty);
    this.http.get<any[]>(`${environment.apiUrl}/connect/levels/${difficulty}`).subscribe(res => {
      this.levelsList.set(res || []);
    });
    this.loadLevel(levelId);
    this.startTimer();
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
      this.timeSpent.set(0);
      this.singlePlayerFinished.set(false);
      this.fetchLevelsAndLoad(difficulty);
      this.startTimer();
    } else {
      this.startTimer();
    }
  }

  constructor() {
    super();
    this.currentDifficulty.set(getSavedDifficulty('connect', 'easy'));
    // Watch for PK puzzle changes
    effect(() => {
      const state = this.rawState() as ConnectGameState;
      if (this.currentRoomMode() !== GameMode.Single && state?.puzzle) {
        try {
          const pDef: ConnectPuzzleDef = normalizeConnectPuzzle(state.puzzle);
          const pkLevelId = pDef.id || (typeof state.puzzle === 'object' && (state.puzzle as any).id) || 'pk-level';
          if (!this.localEngine() || this.currentLevelId() !== pkLevelId) {
            untracked(() => {
              this.currentLevelId.set(pkLevelId);
              this.localEngine.set(new ConnectEngine(pDef));
              this.singlePlayerFinished.set(false);
              this.boardVersion.update(v => v + 1);
            });
          }
        } catch (e) {
          console.error('Failed to parse PK puzzle', e);
        }
      }
    });

    // Watch for spectator focused player changes and sync board paths
    effect(() => {
      if (!this.isSpectator() || this.currentRoomMode() === GameMode.Single) return;
      const state = this.rawState() as ConnectGameState;
      const engine = this.localEngine();
      if (!state?.players || !engine) return;

      const players = state.players;
      let targetId = this.focusedPlayerId();
      if (!targetId || !players[targetId]) {
        const found = Object.keys(players).find(k => k.toLowerCase() === targetId.toLowerCase());
        if (found) targetId = found;
        else targetId = Object.keys(players)[0] || '';
      }
      const p = players[targetId];
      if (p?.paths) {
        engine.loadPaths(p.paths);
        this.boardVersion.update(v => v + 1);
      } else if (p && !p.paths) {
        engine.resetAll();
        this.boardVersion.update(v => v + 1);
      }
    });
  }

  override leaveRoom() {
    super.leaveRoom();
    this.stopTimer();
    this.localEngine.set(null);
    this.currentLevelId.set('');
  }

  protected override onResetLocalGameState(): void {
    const state = this.rawState() as ConnectGameState;
    if (state?.puzzle) {
      try {
        const pDef = normalizeConnectPuzzle(state.puzzle);
        this.localEngine.set(new ConnectEngine(pDef));
        this.singlePlayerFinished.set(false);
        this.boardVersion.update(v => v + 1);
      } catch (e) {
        console.error('Failed to reset PK connect engine', e);
      }
    }
  }

  checkSolution() {
    this.boardVersion.update(v => v + 1);
    const engine = this.localEngine();
    if (!engine) return;

    if (engine.isSolved()) {
      if (this.currentRoomMode() === GameMode.Single) {
        this.singlePlayerFinished.set(true);
        this.stopTimer();
        this.submitFinish();
      } else {
        // Send finish to server for PK with final paths
        const pathsJson = JSON.stringify(engine.exportPaths());
        this.ws.send({ action: 'finish', paths: pathsJson });
      }
    } else {
      // Send progress update to server in PK
      if (this.currentRoomMode() !== GameMode.Single) {
        // compute progress
        let filled = 0;
        for (let r = 0; r < engine.height; r++) {
          for (let c = 0; c < engine.width; c++) {
            if (engine.grid[r][c] !== 0) filled++;
          }
        }
        const pathsJson = JSON.stringify(engine.exportPaths());
        this.ws.send({ action: 'progress', progress: filled, paths: pathsJson });
      }
    }
  }

  private submitFinish() {
    if (!this.currentLevelId()) return;
    
    // Legacy generic stat keeping - still useful for overall stats
    this.submitSingleStat({ time: this.timeSpent(), won: true }).subscribe();
    
    // Mark specific puzzle as finished (updates progress and stars)
    this.http.post<any>(`${environment.apiUrl}/connect/puzzle/${this.currentLevelId()}/finish`, {
      time_spent: this.timeSpent(),
      stars: 3,
      mode: GameMode.Single,
      difficulty: this.currentDifficulty()
    }).subscribe({
      next: () => {
         // Update the local levels list so it shows as finished in the UI immediately
         this.levelsList.update(list => list.map(l => 
            l.id === this.currentLevelId() ? { ...l, progress: { ...l.progress, status: GameStatus.Finished } } : l
         ));
      }
    });
  }

  restart() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.resetBoard();
      return;
    }
    this.timeSpent.set(0);
    this.ws.send({ action: C2SAction.RestartGame });
  }

  resetBoard() {
    const engine = this.localEngine();
    if (engine) {
      engine.resetAll();
      this.singlePlayerFinished.set(false);
      this.boardVersion.update(v => v + 1);
    }
  }

  applyHint() {
    const engine = this.localEngine();
    if (!engine) return;
    const applied = engine.applyHint();
    if (applied) {
      this.checkSolution();
    }
  }

  changeSingleDifficulty(diff: string) {
    if (this.currentRoomMode() !== GameMode.Single || this.roomId()) {
      return;
    }
    setSavedDifficulty('connect', diff);
    this.currentDifficulty.set(diff);
    this.fetchLevelsAndLoad(diff);
  }

  fetchLevelsAndLoad(difficulty: string) {
    this.http.get<any[]>(`${environment.apiUrl}/connect/levels/${difficulty}`).subscribe(res => {
      const levels = res || [];
      this.levelsList.set(levels);
      
      if (!levels.length) return;

      let targetLevel = levels.find(l => !l.progress || l.progress.status !== GameStatus.Finished);
      if (!targetLevel) targetLevel = levels[levels.length - 1];

      if (targetLevel) {
        this.loadLevel(targetLevel.id);
      }
    });
  }

  loadLevel(id: string) {
    this.http.get<any>(`${environment.apiUrl}/connect/puzzle/${id}`).subscribe(res => {
      this.currentLevelId.set(res.puzzle.id);
      
      const puzzleDef = normalizeConnectPuzzle({
        id: res.puzzle.id,
        width: res.puzzle.width,
        height: res.puzzle.height,
        endpoints: res.puzzle.endpoints,
        blocks: res.puzzle.blocks
      });
      
      this.localEngine.set(new ConnectEngine(puzzleDef));
      this.singlePlayerFinished.set(false);
      this.timeSpent.set(0);
      this.startTimer();
      this.boardVersion.update(v => v + 1);
    });
  }

  nextLevel() {
    const list = this.levelsList();
    const curr = this.currentLevelId();
    const idx = list.findIndex(l => l.id === curr);
    if (idx >= 0 && idx < list.length - 1) {
      this.loadLevel(list[idx + 1].id);
    }
  }

  prevLevel() {
    const list = this.levelsList();
    const curr = this.currentLevelId();
    const idx = list.findIndex(l => l.id === curr);
    if (idx > 0) {
      this.loadLevel(list[idx - 1].id);
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.status() === GameStatus.Playing) {
        this.timeSpent.update(t => t + 1);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
