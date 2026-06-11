import { Injectable, computed, inject, signal, effect } from '@angular/core';
export type TetrisGameStatus = 'waiting' | 'starting' | 'playing' | 'finished' | 'disconnected';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AudioService } from '../../../../core/services/audio.service';
import { getEmptyGrid, Piece, rotateMatrix, Tetromino, TETROMINO_SHAPES, TETRIS_COLS, TETRIS_ROWS } from '../models/tetris.model';
import { PRNG } from '../../../../core/utils/prng';

export interface TetrisOpponent {
  id: string;
  score: number;
  lines: number;
  matrix: number[][];
  finished: boolean;
  garbageReceived: number;
}

@Injectable()
export class TetrisStore {
  private ws = inject(WebSocketService);
  gameState = computed(() => this.ws.gameState());
  private statsService = inject(GameStatsService);
  private authStore = inject(AuthStore);
  private audio = inject(AudioService);

  // Connection & Room state
  status = computed(() => {
    if (this.mode() === 'single') return this.localStatus();

    const st = this.ws.gameState();
    if (!st) return 'disconnected';
    return st.status || 'waiting';
  });

  private _localMode = signal<string>('single');
  mode = computed(() => this.ws.gameState()?.mode || this._localMode());
  host = computed(() => {
    if (this.mode() === 'single') return this.authStore.currentUser()?.username || this.authStore.guestId;
    return this.ws.gameState()?.host || '';
  });
  winners = computed(() => this.ws.gameState()?.winners || []);

  // Opponents State
  opponents = computed<TetrisOpponent[]>(() => {
    const st = this.ws.gameState();
    if (!st || !st.players) return [];
    const myId = this.authStore.currentUser()?.username || this.authStore.guestId;
    return Object.values(st.players)
      .filter((p: any) => p.id !== myId)
      .map((p: any) => ({
        id: p.id,
        score: p.score,
        lines: p.lines,
        matrix: p.matrix || [],
        finished: p.finished,
        garbageReceived: p.garbageReceived || 0
      }));
  });

  // Local State
  localStatus = signal<TetrisGameStatus>('waiting');
  grid = signal<number[][]>(getEmptyGrid());
  currentPiece = signal<Piece | null>(null);
  nextPieces = signal<Tetromino[]>([]);
  holdPiece = signal<Tetromino | null>(null);
  canHold = signal<boolean>(true);
  score = signal<number>(0);
  lines = signal<number>(0);
  level = signal<number>(1);
  bestScore = signal<number>(0);

  private dropInterval: any;
  private localGarbageApplied = 0;
  private prng: PRNG | undefined;
  
  isDead = signal<boolean>(false);

  constructor() {
    effect(() => {
      const st = this.ws.gameState();
      if (this.mode() !== 'single') {
        if (st?.status === 'playing') { // PLAYING
          if (!this.dropInterval && !this.isDead()) {
            this.onGlobalStart();
          }
        } else if (st?.status === 'finished') { // FINISHED
          this.stopGameLoop();
        } else if (st?.status === 'starting' || st?.status === 'waiting') {
          this.isDead.set(false);
        }
      }
    });
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId: string) {
    if (roomId === 'local') {
      this._localMode.set('single');
      this.localStatus.set('waiting');
      this.resetLocalState();
    } else {
      this._localMode.set(mode);
      this.ws.connect('tetris', roomId, this.authStore.currentUser()?.username || this.authStore.guestId, mode, difficulty, hostId);
    }
  }

  leaveRoom() {
    this.stopGameLoop();
    if (this.mode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
      setTimeout(() => {
        this.ws.disconnect('tetris');
      }, 100);
    }
  }

  startGame() {
    if (this.mode() === 'single') {
      this.localStatus.set('playing');
      this.resetLocalState();
      
      // Load best score
      if (this.authStore.isAuthenticated()) {
        this.statsService.getStats('tetris').subscribe(stats => {
          const stat = stats.find(s => s.Mode === 'single');
          if (stat) this.bestScore.set(stat.BestScore);
        });
      }

      this.spawnPiece();
      this.startGameLoop();
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  gameOver() {
    this.stopGameLoop();
    this.localStatus.set('finished');
    this.isDead.set(true);
    if (this.mode() === 'single') {
      
      // Submit stat
      if (this.authStore.isAuthenticated()) {
        this.statsService.submitStat('tetris', {
          mode: 'single',
          difficulty: '',
          score: this.score(),
          time: 0,
          won: true
        }).subscribe(res => {
          if (res.isNewRecord) {
            this.bestScore.set(this.score());
          }
        });
      }
    } else {
      this.ws.send({ action: 'game_over' });
    }
  }

  playAgain() {
    if (this.mode() === 'single') {
      this.startGame();
    } else {
      this.ws.send({ type: 'restart_game' });
    }
  }

  dismissRoom() {
    if (this.mode() !== 'single') {
      this.ws.send({ type: 'dismiss_room' });
    }
  }

  kickPlayer(playerId: string) {
    if (this.mode() !== 'single') {
      this.ws.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (this.mode() !== 'single') {
      this.ws.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (this.mode() !== 'single') {
      this.ws.send({ type: 'cancel_ready' });
    }
  }

  onGlobalStart() {
    this.resetLocalState();
    this.spawnPiece();
    this.startGameLoop();
  }

  resetLocalState() {
    this.grid.set(getEmptyGrid());
    this.score.set(0);
    this.lines.set(0);
    this.level.set(1);
    this.holdPiece.set(null);
    this.canHold.set(true);
    this.localGarbageApplied = 0;
    this.isDead.set(false);
    
    if (this.mode() === 'single') {
      this.prng = new PRNG(Date.now());
    } else {
      const seed = this.ws.gameState()?.seed || Date.now();
      this.prng = new PRNG(seed);
    }
    
    this.generateNextPieces();
  }

  private shuffleBag(arr: number[]): number[] {
    const p = this.prng;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor((p ? p.next() : Math.random()) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private generateNextPieces() {
    const bag1 = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
    const bag2 = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
    this.nextPieces.set([...bag1, ...bag2]);
  }

  private spawnPiece(type?: Tetromino) {
    if (!type) {
      const next = this.nextPieces();
      type = next.shift()!;
      if (next.length < 5) {
        const bag = this.shuffleBag([1, 2, 3, 4, 5, 6, 7]);
        next.push(...bag);
      }
      this.nextPieces.set([...next]);
    }

    const shape = TETROMINO_SHAPES[type];
    const piece: Piece = {
      type,
      shape,
      x: Math.floor(TETRIS_COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0
    };

    if (this.checkCollision(piece.x, piece.y, piece.shape, this.grid())) {
      this.gameOver();
      return;
    }
    
    this.currentPiece.set(piece);
    this.canHold.set(true);
  }

  hold() {
    if (!this.canHold()) return;
    const current = this.currentPiece();
    if (!current) return;

    const hold = this.holdPiece();
    this.holdPiece.set(current.type);
    this.canHold.set(false);
    this.spawnPiece(hold || undefined);
  }

  // Movements
  moveLeft() {
    const p = this.currentPiece();
    if (!p) return;
    if (!this.checkCollision(p.x - 1, p.y, p.shape, this.grid())) {
      this.currentPiece.update(curr => ({ ...curr!, x: curr!.x - 1 }));
      this.audio.playTetris('move');
    }
  }

  moveRight() {
    const p = this.currentPiece();
    if (!p) return;
    if (!this.checkCollision(p.x + 1, p.y, p.shape, this.grid())) {
      this.currentPiece.update(curr => ({ ...curr!, x: curr!.x + 1 }));
      this.audio.playTetris('move');
    }
  }

  rotate() {
    const p = this.currentPiece();
    if (!p) return;
    const rotated = rotateMatrix(p.shape);
    if (!this.checkCollision(p.x, p.y, rotated, this.grid())) {
      this.currentPiece.update(curr => ({ ...curr!, shape: rotated }));
      this.audio.playTetris('rotate');
    }
  }

  softDrop() {
    const p = this.currentPiece();
    if (!p) return;
    if (!this.checkCollision(p.x, p.y + 1, p.shape, this.grid())) {
      this.currentPiece.update(curr => ({ ...curr!, y: curr!.y + 1 }));
      this.score.update(s => s + 1);
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    const p = this.currentPiece();
    if (!p) return;
    let y = p.y;
    while (!this.checkCollision(p.x, y + 1, p.shape, this.grid())) {
      y++;
      this.score.update(s => s + 2);
    }
    this.currentPiece.update(curr => ({ ...curr!, y }));
    this.audio.playTetris('land');
    this.lockPiece();
  }

  private lockPiece() {
    const p = this.currentPiece();
    if (!p) return;

    const newGrid = this.grid().map(row => [...row]);
    p.shape.forEach((row, dy) => {
      row.forEach((val, dx) => {
        if (val !== 0) {
          const cy = p.y + dy;
          const cx = p.x + dx;
          if (cy >= 0 && cy < TETRIS_ROWS && cx >= 0 && cx < TETRIS_COLS) {
            newGrid[cy][cx] = val;
          }
        }
      });
    });

    this.grid.set(newGrid);
    this.currentPiece.set(null);
    this.clearLines();

    if (this.mode() === 'diff_pk_attack') {
      this.checkAndApplyGarbage();
    }

    this.spawnPiece();
  }

  private clearLines() {
    const currentGrid = this.grid();
    let linesCleared = 0;
    const newGrid = currentGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0 && cell !== Tetromino.GARBAGE);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newGrid.length < TETRIS_ROWS) {
      newGrid.unshift(new Array(TETRIS_COLS).fill(0));
    }

    if (linesCleared > 0) {
      this.grid.set(newGrid);
      this.lines.update(l => l + linesCleared);
      
      const lineScores = [0, 100, 300, 500, 800];
      this.score.update(s => s + lineScores[linesCleared] * this.level());
      this.level.set(Math.floor(this.lines() / 10) + 1);
      this.updateDropSpeed();
      this.audio.playTetris('clear');

      if (this.mode() === 'diff_pk_attack' && linesCleared >= 2) {
        // Send garbage (1 line for 2 lines, 2 for 3, 4 for Tetris)
        const garbageSent = linesCleared === 4 ? 4 : linesCleared - 1;
        this.ws.send({ action: 'attack', lines: garbageSent });
      }
    }

    if (this.mode() !== 'single') {
      this.syncState();
    }
  }

  private checkAndApplyGarbage() {
    const st = this.ws.gameState();
    if (!st || !st.players) return;
    const myId = this.authStore.currentUser()?.username || this.authStore.guestId;
    const me = st.players[myId];
    if (!me) return;

    const totalGarbage = me.garbageReceived || 0;
    if (totalGarbage > this.localGarbageApplied) {
      const garbageToApply = totalGarbage - this.localGarbageApplied;
      this.localGarbageApplied = totalGarbage;
      
      const currentGrid = this.grid();
      const newGrid = currentGrid.slice(garbageToApply);
      for (let i = 0; i < garbageToApply; i++) {
        const row = new Array(TETRIS_COLS).fill(Tetromino.GARBAGE);
        row[Math.floor(Math.random() * TETRIS_COLS)] = Tetromino.NONE;
        newGrid.push(row);
      }
      this.grid.set(newGrid);
    }
  }

  private syncState() {
    this.ws.send({
      action: 'update',
      score: this.score(),
      lines: this.lines(),
      matrix: this.grid()
    });
  }



  // --- Game Loop ---
  private startGameLoop() {
    this.updateDropSpeed();
  }

  private stopGameLoop() {
    if (this.dropInterval) {
      clearInterval(this.dropInterval);
      this.dropInterval = null;
    }
  }

  private updateDropSpeed() {
    this.stopGameLoop();
    const speed = Math.max(100, 1000 - (this.level() - 1) * 100);
    this.dropInterval = setInterval(() => {
      if (this.status() === 'playing') {
        this.softDrop();
      }
    }, speed);
  }

  // --- Helpers ---
  private checkCollision(x: number, y: number, shape: number[][], grid: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = y + r;
          const nx = x + c;
          if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS || (ny >= 0 && grid[ny][nx] !== 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }

}
