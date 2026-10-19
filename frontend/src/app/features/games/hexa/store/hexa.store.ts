import { GameMode, GameModeType, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { HexaEngine, HexPiece, HexCell, HexCoord, HexaActionType, HexaState } from './hexa-engine';
import { AudioService } from '../../../../core/services/audio.service';
import { storageGet, storageSet } from '../../../../core/utils/browser.util';
import { C2SAction } from '../../../../core/models/websocket.model';

@Injectable()
export class HexaStore extends BaseGameStore {
  readonly gameId = 'hexa';
  
  private audio = inject(AudioService);

  // Local Engine
  engine = new HexaEngine();

  // Hexa State Signals
  cells = signal<HexCell[]>(Array.from(this.engine.cells.values()));
  score = signal<number>(0);
  combo = signal<number>(0);
  availablePieces = signal<HexPiece[]>([]);
  gameOver = signal<boolean>(false);
  bestScore = signal<number>(0);
  comboTrigger = signal<number>(0);
  shakeTrigger = signal<number>(0);
  lastScoreGain = signal<{ score: number; combo: number; lines: number; ts: number } | null>(null);
  clearingCells = signal<Map<string, string>>(new Map());
  private clearTimerId: any = null;
  fillPct = computed(() => this.cells().filter(c => c.filled).length / 61);

  // Visual Palette Theme: 'crystal' (Harmonious Multi-Gem) | 'gold' (Royal Amber Gold) | 'ocean' (Deep Ocean Ice)
  colorTheme = signal<'crystal' | 'gold' | 'ocean'>((storageGet('hexa_theme') as any) || 'crystal');

  setColorTheme(theme: 'crystal' | 'gold' | 'ocean') {
    this.colorTheme.set(theme);
    storageSet('hexa_theme', theme);
  }

  cycleColorTheme() {
    const cur = this.colorTheme();
    const next = cur === 'crystal' ? 'gold' : (cur === 'gold' ? 'ocean' : 'crystal');
    this.setColorTheme(next);
  }

  // PK Mode
  globalStartAt = computed(() => this.rawState()?.globalStartAt || 0);

  readonly allPlayers = computed(() => {
    const state = this.rawState() as any;
    if (!state || !state.players) return [];
    return Object.values(state.players);
  });



  readonly pkOpponents = computed(() => {
    const state = this.rawState() as any;
    if (!state || !state.players) return [];
    
    const rawPlayers = state.players;
    const playersMap: Record<string, any> = {};
    if (Array.isArray(rawPlayers)) {
      rawPlayers.forEach((p: any) => { if (p?.id) playersMap[p.id] = p; });
    } else if (typeof rawPlayers === 'object') {
      Object.assign(playersMap, rawPlayers);
    }

    return Object.values(playersMap)
      .filter((p: any) => p && p.id !== this.playerId())
      .map((p: any) => ({
        id: p.id,
        score: Number(p.score || 0),
        piecesPlaced: Number(p.piecesPlaced || 0),
        finished: Boolean(p.finished)
      }))
      .sort((a: any, b: any) => b.score - a.score);
  });

  readonly otherPlayers = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    return this.pkOpponents();
  });

  myPkState = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return null;
    const state = this.rawState() as any;
    if (!state || !state.players) return null;
    return state.players[this.playerId()];
  });

  readonly singlePlayerStatus = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.gameOver() ? GameStatus.Finished : 'playing';
    }
    const s = this.rawState()?.status;
    return s ? (s as GameStatusType) : 'waiting';
  });

  private currentSeed: any = null;
  private piecesPlaced = 0;

  loadBestScore() {
    const savedBest = parseInt(storageGet('hexa_best_score') || '0', 10);
    if (savedBest > this.bestScore()) {
      this.bestScore.set(savedBest);
    }
    if (this.auth.isAuthenticated()) {
      this.getStats().subscribe(stats => {
        const stat = stats?.find(s => s.Mode === GameMode.Single);
        if (stat) {
          const maxBest = Math.max(stat.BestScore, this.bestScore(), savedBest);
          this.bestScore.set(maxBest);
          storageSet('hexa_best_score', maxBest.toString());
        }
      });
    }
  }

  constructor() {
    super();
    
    // Always load personal best score from local storage and user stats immediately
    this.loadBestScore();

    // Initialize single player game on startup
    if (!this.loadSinglePlayer()) {
      this.startSinglePlayer();
    }

    effect(() => {
      const state = this.rawState();
      if (this.currentRoomMode() !== GameMode.Single && (state?.status === GameStatus.Starting || state?.status === GameStatus.Playing)) {
        const roundKey = state.globalStartAt || state.seed || 'round';
        if (this.currentSeed !== roundKey) {
          this.currentSeed = roundKey;
          this.engine.initGame({ seed: state.seed || undefined });
          this.updateSignals();
          
          if (state.status === GameStatus.Playing) {
            const me = state.players?.[this.playerId()];
            if (me) {
              this.engine.score = me.score || 0;
              this.engine.piecesPlaced = me.piecesPlaced || 0;
              this.updateSignals();
            }
          }
        }
      }
    });
  }

  override joinRoom(roomId: string, mode: GameModeType | string = GameMode.Single, difficulty: string = '', hostId: string = '', target: number = 1) {
    super.joinRoom(roomId, mode, difficulty, hostId, target);
    if (mode === GameMode.Single) {
      this.startSinglePlayer();
      this.loadBestScore();
    } else {
      this.currentSeed = null;
    }
  }

  // --- Action: Place piece ---
  canPlacePiece(piece: HexPiece, origin: HexCoord): boolean {
    return this.engine.canPlacePiece(piece, origin);
  }

  placePiece(piece: HexPiece, origin: HexCoord, pieceIndex: number) {
    if (this.gameOver() || this.status() !== GameStatus.Playing) return;

    // Snapshot filled-cell colors before action (engine deletes color on clear)
    const prevFilled = new Map<string, string>();
    for (const [k, cell] of this.engine.cells.entries()) {
      if (cell.filled && cell.color) prevFilled.set(k, cell.color);
    }

    const prevScore = this.score();
    const prevCombo = this.engine.combo;
    this.engine.handleAction({ type: HexaActionType.PlacePiece, piece, origin, pieceIndex });

    // Compute clearing map BEFORE updateSignals so both render in the same frame
    const clearingMap = new Map<string, string>();
    for (const [k, cell] of this.engine.cells.entries()) {
      if (!cell.filled && prevFilled.has(k)) {
        clearingMap.set(k, prevFilled.get(k)!);
      }
    }
    if (clearingMap.size > 0) {
      this.clearingCells.set(clearingMap);
    }

    this.updateSignals();

    if (clearingMap.size > 0) {
      if (this.clearTimerId) {
        clearTimeout(this.clearTimerId);
      }
      this.clearTimerId = setTimeout(() => {
        this.clearingCells.set(new Map());
        this.clearTimerId = null;
      }, 320);
    }

    const newCombo = this.engine.combo;
    const linesCleared = newCombo > prevCombo;
    const linesCount = linesCleared ? (this.engine.lastLinesCleared || 1) : 0;
    const scoreGained = this.score() - prevScore;
    if (scoreGained > 0) {
      this.lastScoreGain.set({ score: scoreGained, combo: linesCleared ? newCombo : 0, lines: linesCount, ts: Date.now() });
    }

    if (linesCleared) {
      this.comboTrigger.set(newCombo);
      setTimeout(() => this.comboTrigger.set(0), 1100);
      if (newCombo >= 2) {
        this.shakeTrigger.update(n => n + 1);
      }
    }

    // Play sound effects
    if (linesCleared) {
      this.audio.playBlock('clear', newCombo);
    } else {
      this.audio.playBlock('place');
    }

    if (this.gameOver()) {
      if (this.currentRoomMode() !== GameMode.Single) {
        this.ws.send({ action: C2SAction.GameOver, score: this.score() });
      } else {
        if (this.auth.isAuthenticated()) {
          this.submitSingleStat({ score: this.score(), won: false }).subscribe();
        }
      }
    }

    // Sync with server if PK
    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({
        action: C2SAction.Move, 
        score: this.score(),
        piecesPlaced: this.engine.piecesPlaced,
        finished: this.gameOver()
      });
    } else {
      if (this.score() > this.bestScore()) {
        this.bestScore.set(this.score());
        storageSet('hexa_best_score', this.score().toString());
      }
      this.saveSinglePlayer();
    }
  }

  private updateSignals() {
    const state = this.engine.getState();
    this.cells.set(state.cells);
    this.score.set(state.score);
    this.combo.set(state.combo);
    this.availablePieces.set([...state.availablePieces]);
    this.gameOver.set(state.gameOver);
    this.piecesPlaced = state.piecesPlaced;
  }

  override startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startSinglePlayer();
      this.loadBestScore();
    } else {
      super.startGame();
    }
  }

  override restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startSinglePlayer();
      this.loadBestScore();
    } else {
      super.restartGame();
    }
  }

  // Single Player
  private startSinglePlayer() {
    this.engine.initGame(); // Uses Math.random
    this.updateSignals();
  }

  private saveSinglePlayer() {
    storageSet('hexa_single_save', JSON.stringify(this.engine.getState()));
  }

  loadSinglePlayer() {
    const saved = storageGet('hexa_single_save');
    if (saved) {
      try {
        const data = JSON.parse(saved) as HexaState;
        if (!data.availablePieces || data.availablePieces.length === 0 || !data.availablePieces[0]) {
          throw new Error('Save data corrupted: missing available pieces');
        }
        this.engine.handleAction({
          type: HexaActionType.LoadState,
          cells: data.cells,
          score: data.score,
          combo: data.combo,
          pieces: data.availablePieces,
          piecesPlaced: data.piecesPlaced || 0,
          gameOver: data.gameOver || false
        });
        this.updateSignals();
        return true;
      } catch (e) {
        console.error("Failed to load hexa state", e);
      }
    }
    return false;
  }
}
