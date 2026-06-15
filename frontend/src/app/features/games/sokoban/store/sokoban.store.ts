import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocalSokobanEngine, SokobanActionType } from './local-sokoban-engine';
import { environment } from '../../../../../environments/environment';
import { AudioService } from '../../../../core/services/audio.service';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';

export interface SokobanPlayerState {
  id: string;
  board: string[][];
  moves: number;
  status: string;
}

export interface SokobanGameState {
  mode: string;
  difficulty: string;
  players: Record<string, SokobanPlayerState>;
}

@Injectable({
  providedIn: 'root'
})
export class SokobanStore extends BaseGameStore {
  override readonly singlePlayerWinners = computed<string[]>(() => []);

  readonly gameId = GameId.Sokoban;

  private http = inject(HttpClient);
  private audio = inject(AudioService);

  isDead = signal(false);
  timeSpent = signal<number>(0);
  private timer: any;
  
  localEngine = signal<LocalSokobanEngine | null>(null, { equal: () => false });
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
    const level = list.find(l => l.id === curr);
    return level ? level.level_num : 1;
  });

  override readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.localEngine()?.status || 'playing';
    const st = this.rawState() as any;
    if (!st) return GameStatus.Waiting;
    let status = st.status;
    if (typeof status === 'number') {
      const statusMap: any[] = [GameStatus.Waiting, GameStatus.Starting, GameStatus.Playing, GameStatus.Finished];
      status = statusMap[status] || 'waiting';
    }
    return status || 'waiting';
  });

  override readonly singlePlayerList = computed(() => [{id: this.playerId()}]);

  override readonly readyPlayers = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    return (this.rawState() as any)?.readyPlayers || {};
  });

  myPlayerState = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (!engine) return null;
      return { 
        id: this.playerId(), 
        board: engine.board, 
        moves: engine.moves, 
        status: engine.status 
      } as SokobanPlayerState;
    }

    const state = this.rawState() as SokobanGameState;
    if (!state || !state.players) return null;
    return state.players[this.playerId()];
  });

  myBoard = computed(() => {
    return this.myPlayerState()?.board || [];
  });

  myMoves = computed(() => {
    return this.myPlayerState()?.moves || 0;
  });

  myProgress = computed(() => {
    const board = this.myBoard();
    if (!board || board.length === 0) return 0;
    let targets = 0;
    let onTargets = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell === '.' || cell === '+' || cell === '*') targets++;
        if (cell === '*') onTargets++;
      }
    }
    return targets > 0 ? (onTargets / targets) * 100 : 0;
  });

  myCorrectCount = computed(() => {
    const board = this.myBoard();
    if (!board || board.length === 0) return 0;
    let onTargets = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell === '*') onTargets++;
      }
    }
    return onTargets;
  });

  totalTargets = computed(() => {
    const board = this.myBoard();
    if (!board || board.length === 0) return 0;
    let targets = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell === '.' || cell === '+' || cell === '*') targets++;
      }
    }
    return targets;
  });

  opponents = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const state = this.rawState() as SokobanGameState;
    if (!state || !state.players) return [];
    
    return Object.values(state.players)
      .filter(p => p.id !== this.playerId())
      .map(p => ({
        id: p.id,
        board: p.board,
        moves: p.moves,
        status: p.status,
        isHost: p.id === this.hostId()
      }));
  });

  override joinRoom(roomId: string, mode: string = GameMode.Single, difficulty: string = GameDifficulty.Easy, hostId?: string) {
    super.joinRoom(roomId, mode, difficulty, hostId);
    this.isDead.set(false);
    
    if (mode === GameMode.Single) {
      const saved = LocalSokobanEngine.loadFromStorage();
      if (saved) {
        this.currentDifficulty.set(saved.difficulty);
        saved.engine.onSound = (sound) => this.audio.playSokoban(sound);
        this.localEngine.set(saved.engine);
        this.timeSpent.set(saved.engine.timeSpent || 0);
        this.fetchLevelsAndLoad(saved.difficulty, saved.engine.levelStr, true);
      } else {
        this.timeSpent.set(0);
        this.fetchLevelsAndLoad(difficulty, '', false);
      }
      this.startTimer();
    } else {
      this.startTimer();
    }
  }

  loadLevelFromLobby(difficulty: string, puzzle: string, levelId: string) {
    this.currentDifficulty.set(difficulty);
    this.currentLevelId.set(levelId);
    
    const saved = LocalSokobanEngine.loadFromStorage(levelId);
    if (saved && saved.engine) {
      saved.engine.onSound = (sound) => this.audio.playSokoban(sound);
      this.localEngine.set(saved.engine);
      this.timeSpent.set(saved.engine.timeSpent || 0);
      this.fetchLevelsAndLoad(difficulty, saved.engine.levelStr, true);
    } else {
      const newEngine = new LocalSokobanEngine();
      newEngine.initGame({
        levelId, difficulty, levelStr: puzzle,
        onSound: (sound) => this.audio.playSokoban(sound)
      });
      this.localEngine.set(newEngine);
      this.timeSpent.set(0);
      newEngine.saveToStorage();
      this.fetchLevelsAndLoad(difficulty, puzzle, true);
    }
  }

  override leaveRoom() {
    super.leaveRoom();
    this.stopTimer();
  }

  move(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (!eng) return;
      eng.handleAction({ type: SokobanActionType.Move, dir });
      this.localEngine.set(eng);
      if (eng.status === GameStatus.Finished) {
        this.submitFinish();
      }
      return;
    }
    this.ws.send({ action: C2SAction.Move, dir });
  }

  private submitFinish() {
    const eng = this.localEngine();
    if (!eng || !this.currentLevelId()) return;
    this.http.post(`${environment.apiUrl}/sokoban/puzzle/${this.currentLevelId()}/finish`, {
      moves: eng.moves,
      time_spent: this.timeSpent(),
      stars: 3
    }).subscribe();
  }

  undo() {
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (eng) {
        eng.handleAction({ type: SokobanActionType.Undo });
        this.localEngine.set(eng);
      }
      return;
    }
    this.ws.send({ action: C2SAction.Undo });
  }

  restart() {
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (eng) {
        eng.handleAction({ type: SokobanActionType.Restart });
        this.localEngine.set(eng);
      }
      this.timeSpent.set(0);
      return;
    }
    this.timeSpent.set(0);
    this.ws.send({ action: C2SAction.RestartGame });
  }

  applyHint(): { success: boolean; message: string } {
    if (this.currentRoomMode() === GameMode.Single) {
      const engine = this.localEngine();
      if (engine) return engine.applyHint();
    }
    return { success: false, message: 'game.no_hint_available' };
  }

  changeSingleDifficulty(diff: string) {
    this.currentDifficulty.set(diff);
    this.fetchLevelsAndLoad(diff);
  }

  fetchLevelsAndLoad(difficulty: string, retainCurrentStr?: string, avoidNewLoad?: boolean) {
    this.http.get<any[]>(`${environment.apiUrl}/sokoban/levels/${difficulty}`).subscribe(res => {
      const levels = res || [];
      this.levelsList.set(levels);
      
      if (!levels.length) return;

      if (avoidNewLoad && this.localEngine()) {
        const found = levels.find(l => l.puzzle === retainCurrentStr || l.id === this.currentLevelId());
        if (found) this.currentLevelId.set(found.id);
        return;
      }

      let targetLevel = levels.find(l => !l.progress || l.progress.status !== GameStatus.Finished);
      if (!targetLevel) targetLevel = levels[levels.length - 1];

      if (targetLevel) {
        this.loadLevel(targetLevel.id);
      }
    });
  }

  loadLevel(id: string) {
    const saved = LocalSokobanEngine.loadFromStorage(id);
    if (saved && saved.engine) {
      this.currentLevelId.set(id);
      saved.engine.onSound = (sound) => this.audio.playSokoban(sound);
      this.localEngine.set(saved.engine);
      this.timeSpent.set(saved.engine.timeSpent || 0);
      this.currentDifficulty.set(saved.difficulty);
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/sokoban/puzzle/${id}`).subscribe(res => {
      this.currentLevelId.set(res.puzzle.id);
      const newEngine = new LocalSokobanEngine();
      newEngine.initGame({
        levelId: res.puzzle.id,
        difficulty: this.currentDifficulty() as string,
        levelStr: res.puzzle.puzzle,
        onSound: (sound) => this.audio.playSokoban(sound)
      });
      this.localEngine.set(newEngine);
      this.timeSpent.set(0);
      newEngine.saveToStorage();
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
        if (this.currentRoomMode() === GameMode.Single) {
          const eng = this.localEngine();
          if (eng) {
            eng.timeSpent = this.timeSpent();
            if (this.timeSpent() % 5 === 0) {
              eng.saveToStorage();
            }
          }
        }
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
