import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AudioService } from '../../../../core/services/audio.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';

export interface DropBlock {
  id: string; // Unique ID for DOM tracking
  val: number;
  r: number;
  c: number;
  mergedFrom?: string[]; // IDs of blocks that merged into this
  isNew?: boolean;
}

export interface ComboText {
  id: string;
  text: string;
  r: number;
  c: number;
}

export interface DropGameState {
  status: string;
  globalStartAt?: number;
  players: Record<string, { id: string; score: number; finished: boolean }>;
  winners: string[];
}

@Injectable()
export class Drop2048Store {
  private ws = inject(WebSocketService);
  private auth = inject(AuthStore);
  private audio = inject(AudioService);
  private statsService = inject(GameStatsService);

  // Constants
  readonly ROWS = 7;
  readonly COLS = 5;

  // Global State from WS
  private rawState = computed(() => this.ws.gameState() as DropGameState);
  
  // Local Game State
  board = signal<DropBlock[]>([]);
  activeBlock = signal<{ id: string, val: number, c: number, r: number } | null>(null);
  nextVal = signal<number>(2);
  localScore = signal<number>(0);
  isDead = signal<boolean>(false);
  combos = signal<ComboText[]>([]);
  particles = signal<{ id: string, x: number, y: number, color: string }[]>([]);
  bestScore = signal<number>(parseInt(localStorage.getItem('drop2048_best') || '0', 10));
  private gravityInterval: any;

  // Computed state
  localStatus = signal<'waiting' | 'playing' | 'finished'>('waiting');
  
  status = computed(() => {
    if (this.currentMode() === 'single') return this.localStatus();
    return this.rawState()?.status || 'waiting';
  });

  constructor() {
    effect(() => {
      if (this.localMode() === 'single') {
        const state = {
          board: this.board(),
          activeBlock: this.activeBlock(),
          nextVal: this.nextVal(),
          localScore: this.localScore(),
          isDead: this.isDead(),
          localStatus: this.localStatus()
        };
        localStorage.setItem('drop2048_save', JSON.stringify(state));
      }
    });
  }

  score = computed(() => {
    if (this.currentMode() === 'single') return this.localScore();
    const st = this.rawState();
    const me = st?.players?.[this.playerId];
    return me ? me.score : this.localScore();
  });

  players = computed(() => this.rawState()?.players || {});
  playersList = computed(() => {
    const p = this.players();
    return Object.keys(p).map(id => ({ ...p[id], id }));
  });
  otherPlayers = computed(() => {
    const p = this.players();
    return Object.values(p).filter(pl => pl.id !== this.playerId);
  });

  host = computed(() => (this.rawState() as any)?.host || '');
  winners = computed(() => this.rawState()?.winners || []);
  readyPlayers = computed(() => (this.rawState() as any)?.readyPlayers || {});

  get playerId(): string {
    return this.auth.currentUser()?.username || this.auth.guestId;
  }

  localMode = signal<string>('single');
  localDifficulty = signal<string>('standard');
  roomId = signal<string>('');

  currentMode(): string {
    return this.localMode();
  }

  joinGame(roomId: string, playerId: string, mode: string = 'single', diff: string = 'standard', hostId?: string) {
    this.roomId.set(roomId);
    this.localMode.set(mode);
    this.localDifficulty.set(diff);
    if (mode !== 'single') {
      this.ws.connect('drop2048', roomId, playerId, mode, diff, hostId);
    }
  }

  startGame() {
    if (this.currentMode() === 'single') {
      const saved = localStorage.getItem('drop2048_save');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.localStatus === 'playing') {
            this.board.set(state.board || []);
            this.activeBlock.set(state.activeBlock || null);
            this.nextVal.set(state.nextVal || 2);
            this.localScore.set(state.localScore || 0);
            this.isDead.set(state.isDead || false);
            this.localStatus.set('playing');
            this.startGravity();
            return;
          }
        } catch (e) {}
      }
      this.initLocalGame();
    } else {
      this.ws.send({ action: 'start' });
    }
  }

  playAgain() {
    if (this.currentMode() === 'single') {
      this.initLocalGame();
    } else {
      this.ws.send({ type: 'restart_game' });
    }
  }

  leaveGame() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'leave_game' });
    }
    this.stopGravity();
    setTimeout(() => {
      this.ws.disconnect('drop2048');
    }, 100);
    this.localMode.set('single');
    this.localStatus.set('waiting');
  }

  dismissRoom() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'dismiss_room' });
    }
  }

  kickPlayer(playerId: string) {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'kick_player', target: playerId });
    }
  }

  ready() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'ready' });
    }
  }

  cancelReady() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'cancel_ready' });
    }
  }

  private initLocalGame() {
    this.resetForPK();

    if (this.auth.isAuthenticated()) {
      this.statsService.getStats('drop2048').subscribe(stats => {
        const stat = stats.find(s => s.Mode === 'single');
        if (stat) this.bestScore.set(stat.BestScore);
      });
    }

    this.localStatus.set('playing');
    this.spawnBlock();
  }

  resetForPK() {
    this.board.set([]);
    this.localScore.set(0);
    this.isDead.set(false);
    this.combos.set([]);
    this.particles.set([]);
    this.activeBlock.set(null);
    this.stopGravity();
  }

  // Calculate current level based on score
  level = computed(() => {
    const s = this.score();
    if (s < 1000) return 1;
    if (s < 3000) return 2;
    if (s < 6000) return 3;
    if (s < 10000) return 4;
    if (s < 20000) return 5;
    if (s < 40000) return 6;
    return 7; // Max level
  });

  // Calculate drop speed based on level
  private getDropSpeed(): number {
    const lvl = this.level();
    switch (lvl) {
      case 1: return 1000;
      case 2: return 800;
      case 3: return 600;
      case 4: return 500;
      case 5: return 400;
      case 6: return 300;
      default: return 200; // Level 7+
    }
  }

  // Generate a random block with probabilities scaling by level
  private generateRandomValue(): number {
    const r = Math.random();
    const lvl = this.level();
    
    if (lvl >= 5) {
      // High levels: spawn bigger blocks more often
      if (r < 0.1) return 2;
      if (r < 0.3) return 4;
      if (r < 0.5) return 8;
      if (r < 0.7) return 16;
      if (r < 0.85) return 32;
      if (r < 0.95) return 64;
      return 128;
    } else if (lvl >= 3) {
      // Medium levels
      if (r < 0.2) return 2;
      if (r < 0.45) return 4;
      if (r < 0.65) return 8;
      if (r < 0.85) return 16;
      if (r < 0.95) return 32;
      return 64;
    } else {
      // Low levels
      if (r < 0.3) return 2;
      if (r < 0.55) return 4;
      if (r < 0.75) return 8;
      if (r < 0.88) return 16;
      if (r < 0.96) return 32;
      return 64;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  spawnBlock() {
    if (this.isDead()) return;

    const val = this.nextVal();
    this.nextVal.set(this.generateRandomValue());
    
    // Spawn at top middle (r=0, c=2)
    this.activeBlock.set({ id: this.generateId(), val, c: 2, r: 0 });
    
    // Check if spawn position is blocked (Game Over)
    const blocked = this.board().some(b => b.c === 2 && b.r === 0);
    if (blocked) {
      this.gameOver();
    } else {
      this.startGravity();
    }
  }

  private startGravity() {
    this.stopGravity();
    const speed = this.getDropSpeed();
    this.gravityInterval = setInterval(() => {
      if (!this.activeBlock() || this.isDead()) {
        this.stopGravity();
        return;
      }
      const curr = this.activeBlock()!;
      // Check if we can move down
      if (curr.r >= this.ROWS - 1 || this.board().some(b => b.c === curr.c && b.r === curr.r + 1)) {
        // Can't move down, so drop/lock it in place
        this.dropActive();
      } else {
        this.activeBlock.set({ ...curr, r: curr.r + 1 });
      }
    }, speed);
  }

  private stopGravity() {
    if (this.gravityInterval) {
      clearInterval(this.gravityInterval);
      this.gravityInterval = null;
    }
  }

  moveActive(dc: number) {
    if (this.isDead() || !this.activeBlock()) return;
    
    const curr = this.activeBlock()!;
    const nc = curr.c + dc;
    
    if (nc >= 0 && nc < this.COLS) {
      this.activeBlock.set({ ...curr, c: nc });
      this.audio.playClick();
    }
  }

  dropActive() {
    if (this.isDead() || !this.activeBlock()) return;
    
    const curr = this.activeBlock()!;
    this.activeBlock.set(null); // Remove from control
    
    // Calculate drop position
    let targetR = this.ROWS - 1;
    for (let r = 0; r < this.ROWS; r++) {
      if (this.board().some(b => b.c === curr.c && b.r === r)) {
        targetR = r - 1;
        break;
      }
    }

    if (targetR < 0) {
      this.gameOver();
      return;
    }

    // Add to board
    const newBlock: DropBlock = { id: curr.id, val: curr.val, r: targetR, c: curr.c, isNew: true };
    this.board.update(b => [...b, newBlock]);
    
    this.audio.playDrop();
    if (navigator.vibrate) navigator.vibrate(10); // Light haptic

    // Start merge checking cycle
    setTimeout(() => this.processMerges(0), 150); // wait for drop animation
  }

  private processMerges(comboCount: number) {
    let board = [...this.board()];
    let hasMerged = false;
    let scoreGained = 0;
    
    // Sort by row (bottom up), then process merges
    // Simple logic: check down, then left/right
    
    let toRemove = new Set<string>();
    let toUpdate = new Map<string, DropBlock>();

    for (let r = this.ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < this.COLS; c++) {
        const block = board.find(b => b.r === r && b.c === c && !toRemove.has(b.id));
        if (!block) continue;

        // Find adjacent blocks with same value
        const neighbors = board.filter(b => 
          !toRemove.has(b.id) && b.id !== block.id && b.val === block.val &&
          ((b.r === r && Math.abs(b.c - c) === 1) || (b.c === c && Math.abs(b.r - r) === 1))
        );

        if (neighbors.length > 0) {
          hasMerged = true;
          // Merge them all into block
          const mergeScore = block.val * Math.pow(2, neighbors.length);
          scoreGained += mergeScore;
          
          let updatedBlock = toUpdate.get(block.id) || { ...block };
          updatedBlock.val = mergeScore;
          updatedBlock.isNew = true;
          toUpdate.set(block.id, updatedBlock);
          
          neighbors.forEach(n => toRemove.add(n.id));
        }
      }
    }

    if (hasMerged) {
      // Apply merges
      board = board.filter(b => !toRemove.has(b.id));
      toUpdate.forEach(u => {
        const idx = board.findIndex(b => b.id === u.id);
        if (idx >= 0) board[idx] = u;
      });

      // Apply gravity
      let gravityApplied = false;
      for (let c = 0; c < this.COLS; c++) {
        let colBlocks = board.filter(b => b.c === c).sort((a, b) => b.r - a.r); // bottom to top
        let bottomFree = this.ROWS - 1;
        for (let b of colBlocks) {
          if (b.r !== bottomFree) {
            b.r = bottomFree;
            gravityApplied = true;
          }
          bottomFree--;
        }
      }

      this.board.set(board);
      this.addScore(scoreGained);
      
      // Vibrate & Sound
      if (navigator.vibrate) {
        if (comboCount > 1) navigator.vibrate([30, 50, 30]);
        else navigator.vibrate(20);
      }
      
      // Pitch up audio based on combo
      this.audio.playClear(); 
      
      // Show combo text & particles
      if (comboCount > 0) {
        const comboId = this.generateId();
        const firstMerge = Array.from(toUpdate.values())[0];
        if (firstMerge) {
          this.combos.update(c => [...c, { id: comboId, text: '+' + scoreGained, r: firstMerge.r, c: firstMerge.c }]);
          
          // Generate fireworks particles
          const newParticles: any[] = [];
          for (let i = 0; i < 8; i++) {
            newParticles.push({
              id: this.generateId(),
              x: firstMerge.c,
              y: firstMerge.r,
              color: this.getColorForValue(firstMerge.val)
            });
          }
          this.particles.update(p => [...p, ...newParticles]);
          
          setTimeout(() => {
            this.combos.update(c => c.filter(x => x.id !== comboId));
          }, 1000);
          setTimeout(() => {
            const pIds = new Set(newParticles.map(p => p.id));
            this.particles.update(p => p.filter(x => !pIds.has(x.id)));
          }, 600);
        }
      }

      // Chain reaction
      setTimeout(() => this.processMerges(comboCount + 1), 300);
    } else {
      // Done merging, spawn next
      this.syncState();
      this.spawnBlock();
    }
  }

  private addScore(pts: number) {
    const newScore = this.localScore() + pts;
    this.localScore.set(newScore);
    if (newScore > this.bestScore()) {
      this.bestScore.set(newScore);
      localStorage.setItem('drop2048_best', newScore.toString());
    }
  }

  private gameOver() {
    this.isDead.set(true);
    this.stopGravity();
    if (this.currentMode() === 'single') {
      this.localStatus.set('finished');

      if (this.auth.isAuthenticated()) {
        this.statsService.submitStat('drop2048', {
          mode: 'single',
          difficulty: this.localDifficulty(),
          score: this.localScore(),
          time: 0,
          won: true
        }).subscribe(res => {
          if (res.isNewRecord) {
            this.bestScore.set(this.localScore());
          }
        });
      }
    }
    this.activeBlock.set(null);
    if (this.currentMode() !== 'single') {
      this.ws.send({ action: 'game_over' });
    }
  }

  private syncState() {
    if (this.currentMode() !== 'single' && !this.isDead()) {
      this.ws.send({ action: 'update', score: this.localScore() });
    }
  }

  getColorForValue(val: number): string {
    switch (val) {
      case 2: return '#ef4444'; // red-500
      case 4: return '#22c55e'; // green-500
      case 8: return '#eab308'; // yellow-500
      case 16: return '#3b82f6'; // blue-500
      case 32: return '#a855f7'; // purple-500
      case 64: return '#ec4899'; // pink-500
      case 128: return '#f97316'; // orange-500
      case 256: return '#14b8a6'; // teal-500
      case 512: return '#6366f1'; // indigo-500
      case 1024: return '#e11d48'; // rose-600
      case 2048: return '#d97706'; // amber-600
      default: return '#fbbf24'; // amber-400
    }
  }
}
