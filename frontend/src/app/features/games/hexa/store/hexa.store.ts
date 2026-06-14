import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { HexaEngine, HexPiece, HexCell, HexCoord } from './hexa-engine';
import { PRNG } from '../../../../core/utils/prng';
import { generatePieces } from './hexa-pieces';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AudioService } from '../../../../core/services/audio.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { GameStoreInterface } from '../../../../core/interfaces/game-store.interface';

import { GameStatusType, GameStatus } from '../../../../core/models/game.model';

@Injectable()
export class HexaStore implements GameStoreInterface {
  private wsService = inject(WebSocketService);
  gameState = computed(() => this.wsService.gameState());
  private authStore = inject(AuthStore);
  private audio = inject(AudioService);
  private statsService = inject(GameStatsService);

  // Local Engine
  private engine = new HexaEngine();
  private prng: PRNG | undefined;

  // Derive mode from local setting or WS room
  private _localMode = signal<string>('single');
  
  readonly currentMode = computed(() => this._localMode());
  readonly roomId = signal<string>('local');

  // GameStoreInterface aliases
  readonly currentRoomMode = computed(() => this.currentMode());
  readonly hostId = computed(() => this.host());
  readonly playersList = computed<any[]>(() => this.allPlayers());
  readonly readyPlayers = computed<Record<string, boolean>>(() => {
    return (this.wsService.gameState() as any)?.readyPlayers || {};
  });

  // Signals
  readonly status = computed(() => {
    if (this.currentMode() === 'single') {
      return this.gameOver() ? GameStatus.Finished : GameStatus.Playing;
    }
    const s = this.wsService.gameState()?.status;
    return s ? (s as GameStatusType) : GameStatus.Waiting;
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
  bestScore = signal<number>(0);

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

  readonly winners = computed(() => {
    return this.wsService.gameState()?.winners || [];
  });

  piecesPlaced = 0;
  private currentSeed: number | null = null;

  constructor() {
    effect(() => {
      const state = this.wsService.gameState();
      if (this.currentMode() !== 'single' && (state?.status === 'starting' || state?.status === 'playing')) {
        if (state.seed && this.currentSeed !== state.seed) {
          this.currentSeed = state.seed;
          this.prng = new PRNG(state.seed);
          this.resetLocalGame();
          
          if (state.status === 'playing') {
            const me = state.players?.[this.playerId()];
            if (me) {
              this.engine.score = me.score || 0;
              this.piecesPlaced = me.piecesPlaced || 0;
              this.updateSignals();
              
              // Advance PRNG to match their progress
              this.drawPieces(); // initial 3
              for (let i = 0; i < this.piecesPlaced; i++) {
                generatePieces(1, this.prng);
              }
              // Generate current hand
              this.drawPieces();
            }
          }
        }
      }
    });
  }

  // --- BaseGameComponent required methods ---
  
  joinRoom(roomId: string, mode: string, difficulty: string, hostId: string = '') {
    this.roomId.set(roomId);
    if (mode === 'single') {
      this._localMode.set('single');
      this.startSinglePlayer();
      if (this.authStore.isAuthenticated()) {
        this.statsService.getStats('hexa').subscribe(stats => {
          const stat = stats.find(s => s.Mode === 'single');
          if (stat) this.bestScore.set(stat.BestScore);
        });
      }
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
        this.wsService.disconnect('hexa');
      }, 100);
    }
  }

  // --- Action: Place piece ---
  canPlacePiece(piece: HexPiece, origin: HexCoord): boolean {
    return this.engine.canPlacePiece(piece, origin);
  }

  placePiece(piece: HexPiece, origin: { q: number, r: number, s: number }, pieceIndex: number) {
    if (this.gameOver() || this.status() !== GameStatus.Playing) return;
    if (!this.engine.canPlacePiece(piece, origin)) return;

    const result = this.engine.placePiece(piece, origin);
    if (result) {
      this.piecesPlaced++;
      this.updateSignals();
      
      // Play sound effects
      if (result.linesCleared > 0) {
        this.audio.playBlock('clear');
      } else {
        this.audio.playBlock('place');
      }

      // Replace the used piece with a new one
      const pieces = [...this.availablePieces()];
      pieces[pieceIndex] = generatePieces(1, this.prng)[0];
      this.availablePieces.set(pieces);

      // Check Game Over
      const currentPieces = this.availablePieces().filter(p => p !== null && p !== undefined);
      if (this.engine.checkGameOver(currentPieces)) {
        this.gameOver.set(true);
        if (this.currentMode() !== 'single') {
          this.wsService.send({
            action: 'game_over'
          });
        } else {
          // Submit best score in single player mode
          if (this.authStore.isAuthenticated()) {
            this.statsService.submitStat('hexa', {
              mode: 'single',
              difficulty: '',
              score: this.score(),
              time: 0,
              won: false
            }).subscribe();
          }
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

  playAgain() {
    if (this.currentMode() === 'single') {
      this.startSinglePlayer();
    } else {
      this.wsService.send({ type: 'restart_game' });
    }
  }

  restartGame() {
    this.playAgain();
  }

  dismissRoom() {
    if (this.currentMode() !== 'single') {
      this.wsService.send({ type: 'dismiss_room' });
    }
  }

  kickPlayer(playerId: string) {
    if (this.currentMode() !== 'single') {
      this.wsService.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (this.currentMode() !== 'single') {
      this.wsService.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (this.currentMode() !== 'single') {
      this.wsService.send({ type: 'cancel_ready' });
    }
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
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('hexa_single_save') : null);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.engine.loadState(data.state.cells, data.state.score, data.state.combo);
        this.availablePieces.set(data.pieces);
        this.piecesPlaced = data.piecesPlaced || 0;
        
        // Restore game over state if the loaded board is already dead
        const currentPieces = data.pieces.filter((p: any) => p !== null && p !== undefined);
        if (this.engine.checkGameOver(currentPieces)) {
          this.gameOver.set(true);
        } else {
          this.gameOver.set(false);
        }

        this.updateSignals();
        return true;
      } catch (e) {
        console.error("Failed to load hexa state", e);
      }
    }
    return false;
  }
}
