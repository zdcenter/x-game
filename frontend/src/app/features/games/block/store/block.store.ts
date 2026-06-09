import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { BlockShape, getRandomShapes } from '../utils/shapes';
import { GameTimerService } from '../../../../core/services/game-timer.service';
import { AudioService } from '../../../../core/services/audio.service';

export interface BlockGameState {
  status: string;
  globalStartAt?: number;
  players: Record<string, {
    id: string;
    score: number;
    matrix: number[][];
    hand: number[];
    finished: boolean;
  }>;
  winners: string[];
  seed: number;
}

@Injectable({ providedIn: 'root' })
export class BlockStore {
  private ws = inject(WebSocketService);
  private timer = inject(GameTimerService);
  private audio = inject(AudioService);
  private auth = inject(AuthStore);

  // Configuration
  boardSize = signal(10); // Default 10x10
  currentDifficulty = signal('medium');

  // Local State
  private _roomId = signal<string>('local');
  readonly roomId = computed(() => this._roomId());
  currentMode = signal<string>('single');
  localBoard = signal<number[][]>(this.createEmptyBoard(10));
  localScore = signal(0);
  localHand = signal<(BlockShape | null)[]>([null, null, null]);
  isDead = signal(false);

  // Computed from WS
  rawState = computed(() => this.ws.gameState() as BlockGameState);
  
  status = computed(() => {
    if (this.currentMode() === 'single') return this.isDead() ? 'finished' : 'playing';
    return this.rawState()?.status || 'waiting';
  });

  players = computed(() => {
    if (this.currentMode() === 'single') return ['local'];
    return Object.keys(this.rawState()?.players || {});
  });

  allPlayers = computed(() => {
    if (this.currentMode() === 'single') return [{ id: 'local' }];
    const state = this.rawState() as any;
    if (!state || !state.players) return [];
    return Object.values(state.players);
  });

  hostId = computed(() => {
    if (this.currentMode() === 'single') return this.playerId();
    return (this.rawState() as any)?.host || '';
  });

  readyPlayers = computed(() => {
    return (this.rawState() as any)?.readyPlayers || {};
  });

  // Derived state for rendering
  board = computed(() => {
    if (this.currentMode() === 'single') return this.localBoard();
    const st = this.rawState();
    if (!st || !st.players[this.playerId()]) return this.localBoard();
    return st.players[this.playerId()].matrix || this.localBoard();
  });

  score = computed(() => {
    if (this.currentMode() === 'single') return this.localScore();
    const st = this.rawState();
    if (!st || !st.players[this.playerId()]) return 0;
    return st.players[this.playerId()].score;
  });

  hand = computed(() => {
    if (this.currentMode() === 'single') return this.localHand();
    const st = this.rawState();
    // In PK, we only rely on local hand anyway since backend doesn't dictate random shapes (or we could use seed)
    return this.localHand();
  });

  playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  constructor() {
    // Handle game start for PK mode
    effect(() => {
      const st = this.rawState();
      if (this.currentMode() !== 'single' && st) {
        if (st.status === 'starting' && st.globalStartAt) {
          const delay = Math.max(0, st.globalStartAt - Date.now());
          this.timer.startCountdown();
          setTimeout(() => {
            this.audio.playClick();
            this.startLocalGame(st.seed);
          }, delay);
        }
      }
    }, { allowSignalWrites: true });
  }

  joinRoom(roomId: string, mode: string, diff: string, hostId?: string) {
    this.currentMode.set(mode);
    this.currentDifficulty.set(diff);
    this._roomId.set(roomId);
    
    // Set difficulty size
    const size = diff === 'easy' ? 8 : (diff === 'hard' ? 12 : 10);
    this.boardSize.set(size);
    this.localBoard.set(this.createEmptyBoard(size));

    if (mode === 'single') {
      this.loadSinglePlayerProgress();
    } else {
      this.ws.connect('block', roomId, this.playerId(), mode, diff, hostId);
    }
  }

  leaveRoom() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
      setTimeout(() => {
        this.ws.disconnect('block');
      }, 100);
    }
    this._roomId.set('local');
    this.currentMode.set('single');
  }

  createEmptyBoard(size: number): number[][] {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  startLocalGame(seed?: number) {
    this.isDead.set(false);
    this.localScore.set(0);
    this.localBoard.set(this.createEmptyBoard(this.boardSize()));
    this.fillHand();
    if (this.currentMode() === 'single') {
      this.saveSinglePlayerProgress();
    } else {
      this.syncState();
    }
  }

  fillHand() {
    this.localHand.set(getRandomShapes(3));
  }

  canPlace(shape: BlockShape, startRow: number, startCol: number, currentBoard: number[][]): boolean {
    const size = this.boardSize();
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          const br = startRow + r;
          const bc = startCol + c;
          if (br < 0 || br >= size || bc < 0 || bc >= size) return false;
          if (currentBoard[br][bc] !== 0) return false;
        }
      }
    }
    return true;
  }

  placeShape(handIndex: number, startRow: number, startCol: number): boolean {
    if (this.isDead() || this.status() !== 'playing') return false;
    
    const shape = this.localHand()[handIndex];
    if (!shape) return false;

    const board = this.localBoard().map(row => [...row]);
    
    if (!this.canPlace(shape, startRow, startCol, board)) return false;

    // Place the shape
    let blocksPlaced = 0;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          board[startRow + r][startCol + c] = shape.id;
          blocksPlaced++;
        }
      }
    }

    // Check for cleared lines
    const size = this.boardSize();
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    for (let r = 0; r < size; r++) {
      if (board[r].every(cell => cell !== 0)) rowsToClear.push(r);
    }
    for (let c = 0; c < size; c++) {
      let isFull = true;
      for (let r = 0; r < size; r++) {
        if (board[r][c] === 0) { isFull = false; break; }
      }
      if (isFull) colsToClear.push(c);
    }

    // Clear lines
    rowsToClear.forEach(r => {
      for (let c = 0; c < size; c++) board[r][c] = 0;
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < size; r++) board[r][c] = 0;
    });

    const linesCleared = rowsToClear.length + colsToClear.length;
    
    // Calculate score
    let points = blocksPlaced; // 1 point per block
    if (linesCleared > 0) {
      // 1 line = 20, 2 lines = 40, 3 lines = 80, 4 lines = 160... (exponential doubling)
      points += 20 * Math.pow(2, linesCleared - 1);
      this.audio.playClear();
    } else {
      this.audio.playDrop();
    }

    this.localScore.update(s => s + points);
    this.localBoard.set(board);

    // Update hand
    const newHand = [...this.localHand()];
    newHand[handIndex] = getRandomShapes(1)[0];
    this.localHand.set(newHand);

    this.checkGameOver();
    
    if (this.currentMode() === 'single') {
      this.saveSinglePlayerProgress();
    } else {
      this.syncState();
    }

    return true;
  }

  checkGameOver() {
    const board = this.localBoard();
    const hand = this.localHand();
    const size = this.boardSize();

    let canPlaceAny = false;
    for (const shape of hand) {
      if (!shape) continue;
      let placed = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (this.canPlace(shape, r, c, board)) {
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) {
        canPlaceAny = true;
        break;
      }
    }

    if (!canPlaceAny && hand.some(s => s !== null)) {
      this.isDead.set(true);
      this.audio.playLose();
      if (this.currentMode() !== 'single') {
        this.ws.send({ action: 'game_over', score: this.localScore(), matrix: this.localBoard() });
      } else {
        localStorage.removeItem('block_save');
      }
    }
  }

  syncState() {
    this.ws.send({
      action: 'update',
      score: this.localScore(),
      matrix: this.localBoard(),
      hand: this.localHand().map(s => s ? s.id : 0)
    });
  }

  // WS Methods
  ready() { this.ws.send({ type: 'ready' }); }
  cancelReady() { this.ws.send({ type: 'cancel_ready' }); }
  kickPlayer(playerId: string) { this.ws.send({ type: 'kick_player', target: playerId }); }
  dismissRoom() { this.ws.send({ type: 'dismiss_room' }); }
  leaveGame() {
    this.leaveRoom();
  }
  startGame() { this.ws.send({ action: 'start' }); }
  restartGame() { this.ws.send({ type: 'restart_game' }); }

  // Single Player Save
  private saveSinglePlayerProgress() {
    if (this.currentMode() !== 'single' || this.isDead()) return;
    const save = {
      score: this.localScore(),
      board: this.localBoard(),
      hand: this.localHand(),
      size: this.boardSize()
    };
    localStorage.setItem('block_save', JSON.stringify(save));
  }

  private loadSinglePlayerProgress() {
    const saveStr = localStorage.getItem('block_save');
    if (saveStr) {
      try {
        const save = JSON.parse(saveStr);
        if (save.size === this.boardSize()) {
          this.localScore.set(save.score || 0);
          this.localBoard.set(save.board || this.createEmptyBoard(this.boardSize()));
          const loadedHand = save.hand || [null, null, null];
          this.localHand.set(loadedHand);
          if (loadedHand.every((s: any) => s === null)) {
            this.fillHand();
          }
          return;
        }
      } catch (e) {}
    }
    this.startLocalGame();
  }
}
