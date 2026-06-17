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
    
    return Object.values(state.players)
      .filter((p: any) => p.id !== this.playerId())
      .map((p: any) => ({
        id: p.id,
        score: p.score,
        piecesPlaced: p.piecesPlaced,
        finished: p.finished
      }))
      .sort((a: any, b: any) => b.score - a.score);
  });

  readonly otherPlayers = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    return this.pkOpponents();
  });

  myPkState = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return null;
    const state = this.rawState();
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

  private currentSeed: number | null = null;
  private piecesPlaced = 0;

  constructor() {
    super();
    
    // Initialize single player game on startup
    if (!this.loadSinglePlayer()) {
      this.startSinglePlayer();
    }

    effect(() => {
      const state = this.rawState();
      if (this.currentRoomMode() !== GameMode.Single && (state?.status === GameStatus.Starting || state?.status === GameStatus.Playing)) {
        if (state.seed && this.currentSeed !== state.seed) {
          this.currentSeed = state.seed;
          this.engine.initGame({ seed: state.seed });
          this.updateSignals();
          
          if (state.status === GameStatus.Playing) {
            const me = state.players?.[this.playerId()];
            if (me) {
              // Note: For a robust replay, we'd need to simulate all their piece placements or just trust the score.
              // We'll trust the score for now and restore PRNG state implicitly.
              this.engine.score = me.score || 0;
              this.engine.piecesPlaced = me.piecesPlaced || 0;
              this.updateSignals();
              
              // We'd ideally need a way to restore the exact pieces.
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
      if (this.auth.isAuthenticated()) {
        this.getStats().subscribe(stats => {
          const stat = stats.find(s => s.Mode === GameMode.Single);
          if (stat) this.bestScore.set(stat.BestScore);
        });
      }
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
    
    const preScore = this.engine.score;
    this.engine.handleAction({ type: HexaActionType.PlacePiece, piece, origin, pieceIndex });
    this.updateSignals();

    const postScore = this.engine.score;
    const linesCleared = (postScore - preScore) > piece.shape.length;

    // Play sound effects
    if (linesCleared) {
      this.audio.playBlock('clear');
    } else {
      this.audio.playBlock('place');
    }

    if (this.gameOver()) {
      if (this.currentRoomMode() !== GameMode.Single) {
        this.ws.send({ action: C2SAction.GameOver });
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

  override restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.startSinglePlayer();
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
