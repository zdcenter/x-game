import { signal, computed, inject, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { AudioService } from '../../../../core/services/audio.service';
import { GomokuAI, GomokuColor } from './gomoku-ai';

export interface GameStatus {
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  winner?: string; // Player ID
}

export class GomokuStore {
  private ws = inject(WebSocketService);
  gameState = computed(() => this.ws.gameState());
  private statsService = inject(GameStatsService);
  private audio = inject(AudioService);

  private emptyBoard = this.createEmptyBoard();

  // Raw State from WebSocket
  private rawState = computed(() => this.ws.gameState());

  // Single Player Mode local signals
  private localBoard = signal<GomokuColor[][]>(this.createEmptyBoard());
  private localCurrentTurn = signal<string>('');
  private localPlayerColors = signal<Record<string, GomokuColor>>({});
  private localGameStatus = signal<GameStatus>({ status: 'waiting' });
  private localPlayers = signal<string[]>([]);

  // Public computed states (reactive derivation from ws state or local state)
  board = computed<GomokuColor[][]>(() => {
    if (this.singlePlayerMode) return this.localBoard();
    return this.rawState()?.board || this.emptyBoard;
  });

  currentTurn = computed<string>(() => {
    if (this.singlePlayerMode) return this.localCurrentTurn();
    return this.rawState()?.currentTurn || '';
  });

  playerColors = computed<Record<string, GomokuColor>>(() => {
    if (this.singlePlayerMode) return this.localPlayerColors();
    return this.rawState()?.playerColors || {};
  });

  gameStatus = computed<GameStatus>(() => {
    if (this.singlePlayerMode) return this.localGameStatus();
    const st = this.rawState();
    if (!st) return { status: 'waiting' };
    
    let status = st.status;
    if (typeof status === 'number') {
      const statusMap: any[] = ['waiting', 'starting', 'playing', 'finished'];
      status = statusMap[status] || 'waiting';
    }
    return { status: status || 'waiting', winner: st.winner };
  });

  players = computed<string[]>(() => {
    if (this.singlePlayerMode) return this.localPlayers();
    const st = this.rawState();
    if (!st || !st.players) return [];
    if (Array.isArray(st.players)) {
      return st.players;
    } else {
      return Object.keys(st.players);
    }
  });

  myPlayerId = signal<string>('');
  
  // Single Player AI
  private ai: GomokuAI | null = null;
  public singlePlayerMode = false;
  private aiDifficulty = 'medium';

  constructor() {
    // Play drop sound on moves in multiplayer mode
    let lastTurn = '';
    effect(() => {
      const state = this.rawState();
      if (state && state.board && this.gameStatus().status === 'playing') {
        const turn = state.currentTurn || '';
        if (lastTurn && turn && turn !== lastTurn) {
          this.audio.playDrop();
        }
        lastTurn = turn;
      }
    });
  }

  createEmptyBoard(): GomokuColor[][] {
    const b: GomokuColor[][] = [];
    for (let i = 0; i < 15; i++) {
      b.push(new Array(15).fill(0));
    }
    return b;
  }

  init(mode: string, difficulty: string, roomId: string, playerId: string, hostId: string) {
    this.myPlayerId.set(playerId);
    this.singlePlayerMode = mode === 'single';
    this.aiDifficulty = difficulty;
    
    if (this.singlePlayerMode) {
      this.localBoard.set(this.createEmptyBoard());
      this.localGameStatus.set({ status: 'playing' });
      this.localPlayers.set([playerId, 'AI']);
      // In single player, player is always Black (1), AI is White (2)
      this.localPlayerColors.set({
        [playerId]: 1,
        'AI': 2
      });
      this.localCurrentTurn.set(playerId); // Black always goes first
      this.ai = new GomokuAI(2, this.aiDifficulty);
    } else {
      const cleanHostId = hostId === 'undefined' || hostId === undefined ? '' : hostId;
      this.ws.connect('gomoku', roomId, playerId, mode, difficulty, cleanHostId);
    }
  }

  destroy() {
    if (!this.singlePlayerMode) {
      this.ws.disconnect('gomoku');
    }
  }

  startGame() {
    if (this.singlePlayerMode) {
      this.localBoard.set(this.createEmptyBoard());
      this.localGameStatus.set({ status: 'playing', winner: undefined });
      this.localCurrentTurn.set(this.myPlayerId());
      if (this.ai) {
        this.ai = new GomokuAI(2, this.aiDifficulty);
      }
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  surrender() {
    if (this.singlePlayerMode) {
      this.localGameStatus.set({ status: 'finished', winner: 'AI' });
    } else {
      this.ws.send({ action: 'forfeit' });
    }
  }

  leaveGame() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'leave_game' });
      this.ws.disconnect('gomoku');
    }
  }

  dismissRoom() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'dismiss_room' });
    }
  }

  kickPlayer(playerId: string) {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (!this.singlePlayerMode) {
      this.ws.send({ type: 'cancel_ready' });
    }
  }

  makeMove(y: number, x: number) {
    if (this.gameStatus().status !== 'playing') return;
    if (this.currentTurn() !== this.myPlayerId()) return; // Not my turn
    
    const b = this.board();
    if (b[y][x] !== 0) return; // Cell occupied

    if (this.singlePlayerMode) {
      // Apply player move
      const currentB = this.localBoard();
      currentB[y][x] = this.playerColors()[this.myPlayerId()];
      this.localBoard.set([...currentB]);
      this.audio.playDrop();
      
      if (this.checkWin(y, x, currentB[y][x])) {
        this.localGameStatus.set({ status: 'finished', winner: this.myPlayerId() });
        this.submitSinglePlayerStats(true);
        return;
      }
      
      if (this.checkDraw(currentB)) {
        this.localGameStatus.set({ status: 'finished', winner: 'tie' });
        this.submitSinglePlayerStats(false);
        return;
      }

      // AI turn
      this.localCurrentTurn.set('AI');
      
      // Use setTimeout so UI can render the player's move first
      setTimeout(() => {
        if (this.ai && this.gameStatus().status === 'playing') {
          const [aiY, aiX] = this.ai.getBestMove(this.localBoard());
          if (aiY !== -1) {
            const aiB = this.localBoard();
            aiB[aiY][aiX] = this.playerColors()['AI'];
            this.localBoard.set([...aiB]);
            this.audio.playDrop();
            
            if (this.checkWin(aiY, aiX, aiB[aiY][aiX])) {
              this.localGameStatus.set({ status: 'finished', winner: 'AI' });
              this.submitSinglePlayerStats(false);
              return;
            }

            if (this.checkDraw(aiB)) {
              this.localGameStatus.set({ status: 'finished', winner: 'tie' });
              this.submitSinglePlayerStats(false);
              return;
            }
          }
          this.localCurrentTurn.set(this.myPlayerId());
        }
      }, 100);

    } else {
      this.ws.send({ action: 'move', y, x });
    }
  }

  private checkWin(y: number, x: number, color: GomokuColor): boolean {
    const b = this.board();
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    
    for (const [dy, dx] of dirs) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const ny = y + dy * i;
        const nx = x + dx * i;
        if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15 && b[ny][nx] === color) count++;
        else break;
      }
      for (let i = 1; i < 5; i++) {
        const ny = y - dy * i;
        const nx = x - dx * i;
        if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15 && b[ny][nx] === color) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  private checkDraw(b: GomokuColor[][]): boolean {
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        if (b[y][x] === 0) return false;
      }
    }
    return true;
  }

  private submitSinglePlayerStats(win: boolean) {
    this.statsService.submitStat('gomoku', {
      mode: 'single',
      difficulty: this.aiDifficulty,
      score: win ? 1 : 0,
      time: 0,
      won: win
    }).subscribe();
  }
}
