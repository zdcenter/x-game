import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AudioService } from '../../../../core/services/audio.service';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { C2SAction } from '../../../../core/models/websocket.model';
import { LocalMath24Engine, Math24ActionType } from './math24-engine';
import { environment } from '../../../../../environments/environment';

export interface Math24Card {
  id: string;
  value: number;
  expression: string;
  used: boolean;
}

export type Operator = '+' | '-' | '*' | '/';

@Injectable({
  providedIn: 'root'
})
export class Math24Store extends BaseGameStore {
  readonly gameId = GameId.Math24;
  private audio = inject(AudioService);
  private http = inject(HttpClient);

  private localEngine = signal<LocalMath24Engine | null>(null);
  private tick = signal(0);
  private timerInterval: any;
  
  localLevelIndex = signal<number>(0);
  completedLevels = signal<Record<string, number[]>>({});
  currentPuzzleId = signal<string>('');
  
  override readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    this.tick();
    return this.localEngine()?.status || 'waiting';
  });

  players = computed(() => (this.rawState() as any)?.players || {});

  override readonly singlePlayerList = computed(() => [{id: this.playerId()}]);

  override readonly singlePlayerWinners = computed(() => {
    this.tick();
    return this.localEngine()?.finished ? [this.playerId()] : [];
  });

  freezeUntil = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return 0;
    const p = this.players()[this.playerId()];
    return p?.freezeUntil || 0;
  });

  override isFinished = computed(() => {
    return this.status() === GameStatus.Finished;
  });

  timeSpent = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.timeSpent || 0;
    }
    return 0; // Handled by PK timer usually
  });

  currentPuzzle = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      const eng = this.localEngine();
      if (!eng || eng.boardHistory.length === 0) return null;
      return { cards: eng.boardHistory[0].map(c => c.value).join(',') };
    }
    const state = this.rawState() as any;
    if (!state) return null;
    
    if (this.currentRoomMode() === GameMode.Steal) {
      return state.puzzle;
    } else if (this.currentRoomMode() === GameMode.Speed) {
      const p = state.players[this.playerId()];
      if (p && state.puzzles && p.progress < state.puzzles.length) {
        return state.puzzles[p.progress];
      }
      return null;
    }
    return null;
  });

  // Multiplayer Board State (LocalEngine handles single player)
  boardCards = signal<Math24Card[]>([]);
  boardHistory = signal<Math24Card[][]>([]);

  readonly currentBoardCards = computed<Math24Card[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.boardCards || [];
    }
    return this.boardCards();
  });

  readonly currentBoardHistory = computed<Math24Card[][]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.boardHistory || [];
    }
    return this.boardHistory();
  });

  constructor() {
    super();
    effect(() => {
      const puzzle = this.currentPuzzle();
      const mode = this.currentRoomMode();
      
      if (mode !== GameMode.Single && puzzle && puzzle.cards) {
        untracked(() => {
          const id = puzzle.id || puzzle.cards;
          if (this.currentPuzzleId() !== id) {
            this.currentPuzzleId.set(id);
            this.loadMultiplayerPuzzle(puzzle.cards);
          }
        });
      }
    });
  }

  loadMultiplayerPuzzle(cardsStr: string) {
    if (!cardsStr) return;
    const vals = cardsStr.split(',').map(Number);
    const initial = vals.map((v, i) => ({
      id: `c_${i}`,
      value: v,
      expression: v.toString(),
      used: false
    }));
    this.boardCards.set(initial);
    this.boardHistory.set([initial]);
  }

  combineCards(c1: Math24Card, c2: Math24Card, op: Operator) {
    if (this.currentRoomMode() === GameMode.Single) {
      this.localEngine()?.handleAction({ type: Math24ActionType.Combine, c1, c2, op });
      this.tick.set(this.tick() + 1);
      return;
    }

    let result = 0;
    let exp = '';
    
    if (op === '+') {
      result = c1.value + c2.value;
      exp = `(${c1.expression}+${c2.expression})`;
    } else if (op === '-') {
      result = c1.value - c2.value;
      exp = `(${c1.expression}-${c2.expression})`;
    } else if (op === '*') {
      result = c1.value * c2.value;
      exp = `(${c1.expression}*${c2.expression})`;
    } else if (op === '/') {
      if (c2.value === 0) return;
      result = c1.value / c2.value;
      exp = `(${c1.expression}/${c2.expression})`;
    }

    const newCard: Math24Card = {
      id: `c_${Date.now()}`,
      value: result,
      expression: exp,
      used: false
    };

    const current = this.boardCards();
    const next = current.filter(c => c.id !== c1.id && c.id !== c2.id);
    next.push(newCard);

    this.boardHistory.update(h => [...h, next]);
    this.boardCards.set(next);

    this.audio.playMath24('flip');

    if (next.length === 1) {
      this.checkMultiplayerWin(next[0]);
    }
  }

  undo() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.localEngine()?.handleAction({ type: Math24ActionType.Undo });
      this.tick.set(this.tick() + 1);
      return;
    }
    const history = this.boardHistory();
    if (history.length > 1) {
      history.pop();
      this.boardHistory.set([...history]);
      this.boardCards.set(history[history.length - 1]);
      this.audio.playMath24('flip');
    }
  }

  reset() {
    if (this.currentRoomMode() === GameMode.Single) {
      const puzzleStr = this.currentPuzzle()?.cards;
      if (puzzleStr) {
        this.localEngine()?.handleAction({ type: Math24ActionType.Load, puzzle: puzzleStr });
        this.tick.set(this.tick() + 1);
      }
      return;
    }
    const history = this.boardHistory();
    if (history.length > 0) {
      const initial = history[0];
      this.boardHistory.set([initial]);
      this.boardCards.set(initial);
      this.audio.playMath24('flip');
    }
  }

  private checkMultiplayerWin(finalCard: Math24Card) {
    if (Math.abs(finalCard.value - 24) < 0.0001) {
      this.audio.playMath24('correct');
      this.ws.send({
        type: 'action',
        action: C2SAction.Solve,
        payload: { expression: finalCard.expression, isCorrect: true }
      });
    } else {
      this.audio.playMath24('error');
      this.ws.send({
        type: 'action',
        action: C2SAction.Solve,
        payload: { expression: finalCard.expression, isCorrect: false }
      });
      setTimeout(() => {
        const history = this.boardHistory();
        if (history.length > 0) {
          const initial = history[0];
          this.boardHistory.set([initial]);
          this.boardCards.set(initial);
        }
      }, 500);
    }
  }

  startSinglePlayer(id: string, puzzle: string, difficulty: string = GameDifficulty.Easy, levelIndex: number = 0) {
    this.currentRoomMode.set(GameMode.Single);
    this.currentDifficulty.set(difficulty);
    this.localLevelIndex.set(levelIndex);
    this.currentPuzzleId.set(id);
    this.ws.disconnect(GameId.Math24);

    const engine = new LocalMath24Engine();
    engine.initGame({
      playerId: this.playerId(),
      puzzleId: id,
      puzzle: puzzle,
      onWin: () => {
        this.audio.playMath24('correct');
        this.stopTimer();
        this.submitSinglePlayerStats();
        this.tick.set(this.tick() + 1);
      },
      onWrong: () => {
        this.audio.playMath24('error');
        this.tick.set(this.tick() + 1);
      },
      onFlip: () => {
        this.audio.playMath24('flip');
        this.tick.set(this.tick() + 1);
      }
    });
    this.localEngine.set(engine);
    this.startTimer();
    this.tick.set(this.tick() + 1);
  }

  loadNextLevel() {
    if (this.currentRoomMode() !== GameMode.Single) return;
    const diff = this.currentDifficulty() as string;
    const nextIndex = this.localLevelIndex() + 1;
    this.http.get<any>(`${environment.apiUrl}/math24/levels/${diff}`).subscribe(levels => {
      if (levels && levels.length > nextIndex) {
        const level = levels[nextIndex];
        this.startSinglePlayer(level.id, level.cards, diff, nextIndex);
      }
    });
  }

  loadPrevLevel() {
    if (this.currentRoomMode() !== GameMode.Single) return;
    const diff = this.currentDifficulty() as string;
    const prevIndex = this.localLevelIndex() - 1;
    if (prevIndex < 0) return;
    this.http.get<any>(`${environment.apiUrl}/math24/levels/${diff}`).subscribe(levels => {
      if (levels && levels.length > prevIndex) {
        const level = levels[prevIndex];
        this.startSinglePlayer(level.id, level.cards, diff, prevIndex);
      }
    });
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const eng = this.localEngine();
      if (eng && eng.status === GameStatus.Playing) {
        eng.timeSpent++;
        this.tick.set(this.tick() + 1);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private submitSinglePlayerStats() {
    let stars = 3;
    const time = this.localEngine()?.timeSpent || 0;
    if (time > 30) stars = 2;
    if (time > 60) stars = 1;

    if (this.auth.isAuthenticated() && this.currentPuzzleId()) {
      this.http.post<any>(`${environment.apiUrl}/math24/puzzle/${this.currentPuzzleId()}/finish`, {
        time_spent: time,
        stars,
        mode: GameMode.Single,
        difficulty: this.currentDifficulty()
      }).subscribe(res => {
        this.lastStatResult.set(res);
        if (res?.xp_result?.xp_earned) this.xpService.showXpGain(res.xp_result.xp_earned);
        if (res?.new_achievements?.length) this.achievementService.handleNewAchievements(res.new_achievements);
      });
    }
  }

  override leaveRoom() {
    super.leaveRoom();
    this.stopTimer();
  }
}
