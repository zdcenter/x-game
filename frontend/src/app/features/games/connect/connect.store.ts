import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseGameStore } from '../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../core/models/game.model';
import { environment } from '../../../../environments/environment';
import { ConnectEngine, ConnectPuzzleDef } from './connect-engine';
import { C2SAction } from '../../../core/models/websocket.model';

export interface ConnectPlayerState {
  id: string;
  progress: number;
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
  isSpectator = computed(() => false);

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

    const state = this.rawState() as ConnectGameState;
    if (!state || !state.players) return null;
    return state.players[this.playerId()];
  });

  myProgress = computed(() => {
    const engine = this.localEngine();
    if (!engine) return 0;
    
    // Count filled cells
    let filled = 0;
    for (let r = 0; r < engine.height; r++) {
      for (let c = 0; c < engine.width; c++) {
        if (engine.grid[r][c] !== 0) filled++;
      }
    }
    const total = engine.width * engine.height;
    return total > 0 ? (filled / total) * 100 : 0;
  });

  opponents = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const state = this.rawState() as ConnectGameState;
    if (!state || !state.players) return [];
    
    return Object.values(state.players)
      .filter(p => p.id !== this.playerId())
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

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Easy, hostId?: string, target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);
    
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
    this.currentDifficulty.set('easy'); // Force default to easy
    // Watch for PK puzzle changes
    effect(() => {
      const state = this.rawState() as ConnectGameState;
      if (this.currentRoomMode() !== GameMode.Single && state?.puzzle) {
        try {
          const pDef: ConnectPuzzleDef = JSON.parse(state.puzzle);
          if (pDef && (!this.localEngine() || this.localEngine()?.width !== pDef.width)) {
             const pkLevelId = (pDef as any).id || 'pk-level';
             if (this.currentLevelId() !== pkLevelId) {
               untracked(() => {
                 this.currentLevelId.set(pkLevelId);
                 this.localEngine.set(new ConnectEngine(pDef));
                 this.singlePlayerFinished.set(false);
               });
             }
          }
        } catch (e) {
          console.error('Failed to parse PK puzzle', e);
        }
      }
    });
  }

  override leaveRoom() {
    super.leaveRoom();
    this.stopTimer();
    this.localEngine.set(null);
  }

  checkSolution() {
    const engine = this.localEngine();
    if (!engine) return;

    if (engine.isSolved()) {
      if (this.currentRoomMode() === GameMode.Single) {
        this.singlePlayerFinished.set(true);
        this.stopTimer();
        this.submitFinish();
      } else {
        // Send finish to server for PK
        this.ws.send({ action: 'finish' });
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
        this.ws.send({ action: 'progress', progress: filled });
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
      // Just reload the current level from memory
      const levelId = this.currentLevelId();
      if (levelId) {
        this.loadLevel(levelId);
      }
      return;
    }
    this.timeSpent.set(0);
    this.ws.send({ action: C2SAction.RestartGame });
  }

  changeSingleDifficulty(diff: string) {
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
      
      const parsed = JSON.parse(res.puzzle.endpoints);
      let endpointsDef: any[] = [];
      
      if (parsed.length > 0) {
        if (parsed[0].r !== undefined) {
          // Convert flat format [{"r": r, "c": c, "color": color}, ...]
          const colorMap = new Map<number, {r: number, c: number}[]>();
          for (const ep of parsed) {
            if (!colorMap.has(ep.color)) colorMap.set(ep.color, []);
            colorMap.get(ep.color)!.push({r: ep.r, c: ep.c});
          }
          for (const [color, pts] of colorMap.entries()) {
            if (pts.length === 2) {
              endpointsDef.push({ color, p1: pts[0], p2: pts[1] });
            }
          }
        } else if (Array.isArray(parsed[0].p1)) {
          // Convert array format {"color": 1, "p1": [c, r], "p2": [c, r]}
          endpointsDef = parsed.map((ep: any) => ({
            color: ep.color,
            p1: { r: ep.p1[1], c: ep.p1[0] },
            p2: { r: ep.p2[1], c: ep.p2[0] }
          }));
        } else {
          // Assume already correct format {r, c}
          endpointsDef = parsed;
        }
      }
      
      let blocksDef: any[] = [];
      if (typeof res.puzzle.blocks === 'string' && res.puzzle.blocks) {
        const parsedBlocks = JSON.parse(res.puzzle.blocks);
        blocksDef = parsedBlocks.map((b: any) => ({ r: b[0], c: b[1] }));
      }
      
      const puzzleDef = {
        width: res.puzzle.width,
        height: res.puzzle.height,
        endpoints: endpointsDef,
        blocks: blocksDef
      };
      
      this.localEngine.set(new ConnectEngine(puzzleDef));
      this.singlePlayerFinished.set(false);
      this.timeSpent.set(0);
      this.startTimer();
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
