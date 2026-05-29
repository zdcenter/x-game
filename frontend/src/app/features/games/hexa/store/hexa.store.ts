import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { HexaEngine, HexPiece, PRNG, HexCell, HexCoord } from './hexa-engine';
import { generatePieces } from './hexa-pieces';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AudioService } from '../../../../core/services/audio.service';

export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

@Injectable()
export class HexaStore {
  private wsService = inject(WebSocketService);
  private authStore = inject(AuthStore);
  private audio = inject(AudioService);

  // Local Engine
  private engine = new HexaEngine();
  private prng: PRNG | undefined;

  // Derive mode from local setting or WS room
  private _localMode = signal<string>('single');
  private _roomId = signal<string>('local');
  
  readonly currentMode = computed(() => this._localMode());
  readonly roomId = computed(() => this._roomId());

  // Signals
  readonly status = computed(() => {
    if (this.currentMode() === 'single') {
      return this.gameOver() ? GameStatus.FINISHED : GameStatus.PLAYING;
    }
    const s = this.wsService.gameState()?.status;
    return s ? (s as GameStatus) : GameStatus.WAITING;
  });

  // Host info
  readonly host = computed(() => {
    if (this.currentMode() === 'single') return this.playerId();
    return this.wsService.gameState()?.host || '';
  });

  // Current user
  playerId = computed(() => this.authStore.currentUser()?.username || this.authStore.guestId);

  // Hexa State
  cells = signal<HexCell[]>(Array.from(this.engine.cells.values()));
  score = signal<number>(0);
  combo = signal<number>(0);
  availablePieces = signal<HexPiece[]>([]);
  gameOver = signal<boolean>(false);

  // PK Mode
  globalStartAt = computed(() => this.wsService.gameState()?.globalStartAt || 0);
  
  readonly allPlayers = computed(() => {
    const state = this.wsService.gameState() as any;
    if (!state || !state.players) return [];
    return Object.values(state.players);
  });

  readonly pkOpponents = computed(() => {
    const state = this.wsService.gameState() as any;
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
    if (this.currentMode() === 'single') return [];
    return this.pkOpponents();
  });

  myPkState = computed(() => {
    if (this.currentMode() === 'single') return null;
    const state = this.wsService.gameState();
    if (!state || !state.players) return null;
    return state.players[this.playerId()];
  });

  piecesPlaced = 0;

  constructor() {
    effect(() => {
      const state = this.wsService.gameState();
      if (this.currentMode() !== 'single' && state?.status === 'starting') {
        if (state.seed && !this.prng) {
          this.prng = new PRNG(state.seed);
          this.resetLocalGame();
        }
      }
    });
  }

  // --- BaseGameComponent required methods ---
  
  joinRoom(roomId: string, mode: string, difficulty: string, hostId: string = '') {
    this._roomId.set(roomId);
    if (mode === 'single') {
      this._localMode.set('single');
      this.startSinglePlayer();
    } else {
      this._localMode.set(mode);
      this.prng = undefined;
      this.wsService.connect('hexa', roomId, this.playerId(), mode, difficulty, hostId);
    }
  }

  leaveRoom() {
    if (this.currentMode() !== 'single') {
      this.wsService.send({ type: 'leave_game' });
      setTimeout(() => {
        this.wsService.disconnect();
      }, 100);
    }
  }

  // --- Action: Place piece ---
  canPlacePiece(piece: HexPiece, origin: HexCoord): boolean {
    return this.engine.canPlacePiece(piece, origin);
  }

  placePiece(piece: HexPiece, origin: { q: number, r: number, s: number }, pieceIndex: number) {
    if (this.gameOver() || this.status() !== GameStatus.PLAYING) return;
    if (!this.engine.canPlacePiece(piece, origin)) return;

    const result = this.engine.placePiece(piece, origin);
    if (result) {
      this.piecesPlaced++;
      this.updateSignals();
      
      // Play sound effects
      if (result.linesCleared > 0) {
        this.audio.playClear();
      } else {
        this.audio.playDrop();
      }

      // Remove the used piece but keep the slot
      const pieces = [...this.availablePieces()];
      pieces[pieceIndex] = null as any;
      
      const remainingPieces = pieces.filter(p => p !== null);
      
      // If all pieces used, draw 3 new ones
      if (remainingPieces.length === 0) {
        this.drawPieces();
      } else {
        this.availablePieces.set(pieces);
      }

      // Check Game Over
      if (this.engine.checkGameOver(remainingPieces)) {
        this.gameOver.set(true);
        if (this.currentMode() !== 'single') {
          this.wsService.send({
            action: 'game_over'
          });
        }
      }

      // Sync with server if PK
      if (this.currentMode() !== 'single') {
        this.wsService.send({
          action: 'update', 
          score: this.score(),
          piecesPlaced: this.piecesPlaced,
          finished: this.gameOver()
        });
      } else {
        this.saveSinglePlayer();
      }
    }
  }

  private drawPieces() {
    const p = generatePieces(3, this.prng);
    this.availablePieces.set(p);
  }

  private updateSignals() {
    this.cells.set(Array.from(this.engine.cells.values()));
    this.score.set(this.engine.score);
    this.combo.set(this.engine.combo);
  }

  // PK Actions
  startGame() {
    this.wsService.send({ action: 'start' });
  }

  // Single Player
  startSinglePlayer() {
    this.prng = undefined; // Use Math.random for single player
    this.resetLocalGame();
  }

  private resetLocalGame() {
    this.engine = new HexaEngine();
    this.piecesPlaced = 0;
    this.gameOver.set(false);
    this.drawPieces();
    this.updateSignals();
  }

  private saveSinglePlayer() {
    localStorage.setItem('hexa_single_save', JSON.stringify({
      state: this.engine.getState(),
      pieces: this.availablePieces(),
      piecesPlaced: this.piecesPlaced
    }));
  }

  loadSinglePlayer() {
    const saved = localStorage.getItem('hexa_single_save');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.engine.loadState(data.state.cells, data.state.score, data.state.combo);
        this.availablePieces.set(data.pieces);
        this.piecesPlaced = data.piecesPlaced || 0;
        this.updateSignals();
        return true;
      } catch (e) {
        console.error("Failed to load hexa state", e);
      }
    }
    return false;
  }
}
