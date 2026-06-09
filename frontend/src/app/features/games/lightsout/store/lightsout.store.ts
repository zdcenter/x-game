import { Injectable, computed, inject, signal } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';

@Injectable()
export class LightsoutStore {
  private ws = inject(WebSocketService);
  private authStore = inject(AuthStore);

  // Local State for Single Player Mode
  readonly localBoard = signal<boolean[][]>([]);
  readonly localMoves = signal<number>(0);
  readonly localDifficulty = signal<string>('medium');
  readonly currentRoomMode = signal<string>('single');
  readonly roomId = signal<string>('');
  readonly hostId = computed(() => {
    if (this.currentRoomMode() === 'single') return this.me();
    return (this.rawState() as any)?.host || '';
  });
  readonly localStatus = signal<'waiting' | 'starting' | 'playing' | 'finished'>('playing');

  private rawState = computed(() => this.ws.gameState());
  private me = computed(() => this.authStore.currentUser()?.username || this.authStore.guestId);

  // Derived Public Signals
  readonly status = computed(() => {
    if (this.currentRoomMode() === 'single') return this.localStatus();
    return this.rawState()?.status || 'waiting';
  });

  readonly board = computed<boolean[][]>(() => {
    if (this.currentRoomMode() === 'single') return this.localBoard();
    const st = this.rawState();
    if (st?.players && st.players[this.me()]) {
      return st.players[this.me()].board || [];
    }
    return [];
  });

  readonly moves = computed<number>(() => {
    if (this.currentRoomMode() === 'single') return this.localMoves();
    const st = this.rawState();
    if (st?.players && st.players[this.me()]) {
      return st.players[this.me()].moves || 0;
    }
    return 0;
  });

  readonly size = computed<number>(() => {
    if (this.currentRoomMode() === 'single') {
      const diff = this.localDifficulty();
      return diff === 'easy' ? 4 : diff === 'hard' ? 6 : 5;
    }
    return this.rawState()?.size || 5;
  });

  readonly playersList = computed<any[]>(() => {
    if (this.currentRoomMode() === 'single') return [{ id: this.me() }];
    const st = this.rawState();
    return st?.players ? Object.keys(st.players).map(id => ({ id })) : [];
  });

  readonly opponents = computed(() => {
    if (this.currentRoomMode() === 'single') return [];
    const st = this.rawState();
    if (!st?.players) return [];
    
    return Object.keys(st.players)
      .filter(id => id !== this.me())
      .map(id => {
        const p = st.players[id];
        // Calculate remaining lights
        let remaining = 0;
        if (p.board) {
          for (const row of p.board) {
            for (const light of row) {
              if (light) remaining++;
            }
          }
        }
        return {
          id,
          moves: p.moves || 0,
          remainingLights: remaining,
          finished: p.finished || false
        };
      });
  });

  readonly readyPlayers = computed(() => {
    if (this.currentRoomMode() === 'single') return [this.me()];
    return (this.rawState() as any)?.readyPlayers || {};
  });

  readonly winners = computed<string[]>(() => {
    if (this.currentRoomMode() === 'single') {
      return this.localStatus() === 'finished' ? [this.me()] : [];
    }
    return this.rawState()?.winners || [];
  });

  readonly isFinished = computed<boolean>(() => {
    if (this.currentRoomMode() === 'single') return this.localStatus() === 'finished';
    const st = this.rawState();
    if (st?.players && st.players[this.me()]) {
      return st.players[this.me()].finished || false;
    }
    return false;
  });

  // Actions
  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.currentRoomMode.set(mode);
    this.localDifficulty.set(difficulty);
    this.roomId.set(roomId);

    if (mode === 'single') {
      this.initSinglePlayerBoard(difficulty);
    } else {
      this.ws.connect('lightsout', roomId, this.me(), mode, difficulty, hostId);
    }
  }

  leaveRoom() {
    this.roomId.set('');
    if (this.currentRoomMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
      this.ws.disconnect('lightsout');
    }
  }

  ready() { this.ws.send({ type: 'ready' }); }
  cancelReady() { this.ws.send({ type: 'cancel_ready' }); }
  kickPlayer(playerId: string) { this.ws.send({ type: 'kick_player', target: playerId }); }
  dismissRoom() { this.ws.send({ type: 'dismiss_room' }); }

  startGame() {
    if (this.currentRoomMode() === 'single') {
      this.localStatus.set('playing');
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  restartGame() {
    if (this.currentRoomMode() === 'single') {
      this.initSinglePlayerBoard(this.localDifficulty());
      this.localStatus.set('playing');
    } else {
      this.ws.send({ action: 'restart_game' });
    }
  }

  toggle(row: number, col: number) {
    if (this.status() !== 'playing' || this.isFinished()) return;

    if (this.currentRoomMode() === 'single') {
      const board = [...this.localBoard().map(r => [...r])];
      const s = this.size();
      
      this.toggleCell(board, s, row, col);
      this.localBoard.set(board);
      this.localMoves.update(m => m + 1);

      if (this.checkWin(board)) {
        this.localStatus.set('finished');
      }
    } else {
      this.ws.send({ action: 'toggle', row, col });
    }
  }

  forfeit() {
    if (this.currentRoomMode() === 'single') {
      this.localStatus.set('finished');
    } else {
      this.ws.send({ action: 'forfeit' });
    }
  }

  changeDifficulty(diff: string) {
    if (this.currentRoomMode() === 'single') {
      this.localDifficulty.set(diff);
      this.initSinglePlayerBoard(diff);
    }
  }

  // Helpers
  private toggleCell(board: boolean[][], size: number, r: number, c: number) {
    board[r][c] = !board[r][c];
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < size - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < size - 1) board[r][c + 1] = !board[r][c + 1];
  }

  private checkWin(board: boolean[][]): boolean {
    for (const row of board) {
      for (const cell of row) {
        if (cell) return false; // If any light is ON, haven't won yet
      }
    }
    return true;
  }

  private initSinglePlayerBoard(difficulty: string) {
    const s = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 6 : 5;
    // Start with all lights OFF, then randomize, to ensure it's solvable to an all-OFF state
    const board: boolean[][] = Array(s).fill(null).map(() => Array(s).fill(false));
    
    // Reverse random clicks
    const clicks = s * s * 2;
    for (let i = 0; i < clicks; i++) {
      const r = Math.floor(Math.random() * s);
      const c = Math.floor(Math.random() * s);
      this.toggleCell(board, s, r, c);
    }
    
    if (this.checkWin(board)) {
      this.toggleCell(board, s, 0, 0);
      this.toggleCell(board, s, s-1, s-1);
    }

    this.localBoard.set(board);
    this.localMoves.set(0);
    this.localStatus.set('playing');
  }
}
