import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatsService } from '../../../../core/services/game-stats.service';
import { environment } from '../../../../../environments/environment';

export interface SudokuCell {
  r: number;
  c: number;
  val: number; // 0 means empty
  fixed: boolean;
  notes: Set<number>;
  error: boolean;
}

export interface SudokuHistory {
  board: SudokuCell[][];
}

@Injectable()
export class SudokuStore {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private auth = inject(AuthStore);
  private audio = inject(AudioService);
  private i18n = inject(I18nService);
  ws = inject(WebSocketService);
  private statsService = inject(GameStatsService);

  private saveSubject = new Subject<void>();

  playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Modes: 'single', 'pk_steal', 'pk_speed'
  currentMode = signal<string>('single');
  roomId = signal<string>('');

  // Board state (Local)
  board = signal<SudokuCell[][]>([]);
  selectedCell = signal<{ r: number, c: number } | null>(null);
  pencilMode = signal<boolean>(false);

  // History for Undo
  private history: SudokuHistory[] = [];

  // Metadata
  view = signal<'lobby' | 'room' | 'countdown' | 'play'>('lobby');
  currentPuzzleId = signal<string>('');
  timeSpent = signal<number>(0);
  isFinished = signal<boolean>(false);
  bestTime = signal<number>(0);

  filledCells = computed(() => {
    let count = 0;
    const b = this.board();
    if (!b || b.length === 0) return 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r] && b[r][c] && b[r][c].val !== 0) count++;
      }
    }
    return count;
  });

  // WS State derived
  rawState = computed(() => this.ws.gameState() || {
    status: 'waiting',
    difficulty: '',
    players: {},
    puzzle: '',
    currentBoard: '',
    winners: []
  });

  gameStatus = computed(() => this.rawState().status || 'waiting');
  players = computed(() => this.rawState().players || {});
  host = computed(() => this.rawState().host || '');

  private timer: any;

  constructor() {
    this.saveSubject.pipe(debounceTime(1000)).subscribe(() => {
      this.saveStateToBackend();
    });

    // Effect to handle Room -> Countdown -> Play transition
    effect(() => {
      const status = this.gameStatus();
      const currentView = this.view();

      // When server sends 'starting', show countdown overlay
      if (status === 'starting' && (currentView === 'room' || currentView === 'lobby')) {
        this.view.set('countdown');
        // Pre-init the board so it's ready when countdown ends
        const puzzle = this.rawState().puzzle;
        if (puzzle) {
          this.initBoard(puzzle);
        }
      }

      // When server sends 'playing', transition to play view
      if (status === 'playing' && (currentView === 'countdown' || currentView === 'room')) {
        this.view.set('play');
        // Init board if not already done during countdown
        if (this.board().length === 0) {
          const puzzle = this.rawState().puzzle;
          if (puzzle) {
            this.initBoard(puzzle);
          }
        }
      }
    });

    // Effect to auto-sync Steal mode board
    effect(() => {
      if (this.currentMode() === 'pk_steal') {
        const rState = this.rawState() as any;
        if (rState.status === 'playing' && rState.currentBoard) {
          // Compare and update our local board
          if (this.board().length > 0) {
            const currentStr = rState.currentBoard;
            const b = this.board();
            let changed = false;
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                const char = currentStr[r * 9 + c];
                const expectedVal = (char === '.' || char === '0' || char === '-') ? 0 : parseInt(char, 10);
                if (b[r][c].val !== expectedVal && expectedVal !== 0) {
                  b[r][c].val = expectedVal;
                  b[r][c].fixed = true; // Mark as fixed once filled by anyone
                  b[r][c].notes.clear();
                  this.autoEraseNotes(r, c, expectedVal);
                  changed = true;
                }
              }
            }
            if (changed) {
              this.board.set([...b]);
              this.checkErrors();
            }
          }
        }
      }
    });
  }

  // --- ROOM MANAGEMENT ---
  async joinRoom(roomId: string, mode: string, diff: string, hostId?: string) {
    this.currentMode.set(mode);
    this.roomId.set(roomId);
    this.view.set('room');
    await this.ws.connect('sudoku', roomId, this.playerId(), mode, diff, hostId);
  }

  leaveRoom() {
    this.ws.disconnect('sudoku');
    this.roomId.set('');
    this.currentMode.set('single');
    this.view.set('lobby');
  }

  startGame() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ action: 'start' });
    }
  }

  playAgain() {
    if (this.currentMode() !== 'single') {
      this.ws.send({ type: 'restart_game' });
    }
  }

  dismissRoom() {
    if (this.currentMode() !== 'single') {
      this.toast.confirm({
        title: 'Dismiss Room',
        message: 'Are you sure you want to dismiss this room? All players will be kicked out.',
        confirmText: 'Dismiss',
        cancelText: 'Cancel',
        onConfirm: () => {
          this.ws.send({ type: 'dismiss_room' });
          this.toast.show('Room dismissed successfully', 'success');
        }
      });
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

  // --- SINGLE PLAYER INIT ---
  initBoard(puzzleStr: string, savedState?: string, savedTime?: number) {
    if (savedTime) this.timeSpent.set(savedTime);
    else this.timeSpent.set(0);

    this.isFinished.set(false);
    this.history = [];

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Convert array back to Set for notes
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            parsed[r][c].notes = new Set(parsed[r][c].notes);
          }
        }
        this.board.set(parsed);
      } catch (e) {
        this.createBoardFromString(puzzleStr);
      }
    } else {
      this.createBoardFromString(puzzleStr);
    }

    // Load best time
    if (this.auth.isAuthenticated()) {
      const match = this.currentPuzzleId().match(/^(.*)-(\d+)$/);
      let diff = 'easy';
      if (match) {
        if (match[1].includes('medium')) diff = 'medium';
        else if (match[1].includes('hard')) diff = 'hard';
      }
      this.statsService.getStats('sudoku').subscribe(stats => {
        const stat = stats.find(s => s.Mode === 'single' && s.Difficulty === diff);
        if (stat) this.bestTime.set(stat.BestTime);
      });
    }

    this.startTimer();
    this.checkErrors(); // Initial check
  }

  private createBoardFromString(str: string) {
    const newBoard: SudokuCell[][] = [];
    for (let r = 0; r < 9; r++) {
      const row: SudokuCell[] = [];
      for (let c = 0; c < 9; c++) {
        const char = str[r * 9 + c];
        const val = (char === '.' || char === '0' || char === '-') ? 0 : parseInt(char, 10);
        row.push({
          r, c, val,
          fixed: val !== 0,
          notes: new Set<number>(),
          error: false
        });
      }
      newBoard.push(row);
    }
    this.board.set(newBoard);
  }

  // Interaction
  selectCell(r: number, c: number) {
    this.selectedCell.set({ r, c });
  }

  togglePencilMode() {
    this.pencilMode.set(!this.pencilMode());
  }

  inputNumber(num: number) {
    if (this.isFinished()) return;
    const sel = this.selectedCell();
    if (!sel) return;

    const b = this.board();
    const cell = b[sel.r][sel.c];
    if (cell.fixed) return;

    this.audio.playClick();

    if (this.currentMode() === 'pk_steal') {
      const myPlayer = this.players()[this.playerId()];
      if (myPlayer && myPlayer.freezeUntil > Date.now()) {
        this.toast.show('You are frozen!', 'error');
        return;
      }
      // In steal mode, we send directly to WS and wait for update
      this.ws.send({ action: 'input', r: sel.r, c: sel.c, val: num });
      return;
    }

    this.saveHistory();

    if (this.pencilMode()) {
      if (cell.val !== 0) {
        cell.val = 0; // Clear value if switching to notes
      }
      if (cell.notes.has(num)) {
        cell.notes.delete(num);
      } else {
        cell.notes.add(num);
      }
    } else {
      // Inputting a real number
      if (cell.val === num) {
        cell.val = 0; // Toggle off
      } else {
        cell.val = num;
        cell.notes.clear();
        this.autoEraseNotes(sel.r, sel.c, num);
      }
    }

    // Trigger reactivity
    this.board.set([...b]);
    this.checkErrors();
    this.checkWinCondition();

    // Speed mode progress tracking
    if (this.currentMode() === 'pk_speed') {
      this.ws.send({ action: 'progress', progress: this.countFilledCells() });
    }

    this.triggerSave();
  }

  private countFilledCells(): number {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board()[r][c].val !== 0) count++;
      }
    }
    return count;
  }

  erase() {
    if (this.isFinished()) return;
    const sel = this.selectedCell();
    if (!sel) return;

    const b = this.board();
    const cell = b[sel.r][sel.c];
    if (cell.fixed) return;

    this.audio.playClick();

    if (this.currentMode() === 'pk_steal') {
      // Cannot erase in steal mode unless we implement it, but standard rules say only add.
      return;
    }

    this.saveHistory();
    cell.val = 0;
    cell.notes.clear();
    this.board.set([...b]);
    this.checkErrors();
    this.triggerSave();
  }

  clearBoard() {
    if (this.isFinished()) return;
    if (this.currentMode() === 'pk_steal') return;

    this.audio.playClick();
    this.saveHistory();

    const b = this.board();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!b[r][c].fixed) {
          b[r][c].val = 0;
          b[r][c].notes.clear();
        }
      }
    }
    this.board.set([...b]);
    this.checkErrors();
    this.triggerSave();
  }

  undo() {
    if (this.isFinished()) return;
    if (this.currentMode() === 'pk_steal') return;
    if (this.history.length === 0) return;

    this.audio.playClick();

    const prevState = this.history.pop()!;
    this.board.set(prevState.board);
    this.checkErrors();
    this.triggerSave();
  }

  private saveHistory() {
    const currentBoard = this.board().map(row =>
      row.map(c => ({ ...c, notes: new Set(c.notes) }))
    );
    this.history.push({ board: currentBoard });
    if (this.history.length > 50) this.history.shift();
  }

  private autoEraseNotes(r: number, c: number, num: number) {
    const b = this.board();
    // Clear in row
    for (let i = 0; i < 9; i++) b[r][i].notes.delete(num);
    // Clear in col
    for (let i = 0; i < 9; i++) b[i][c].notes.delete(num);
    // Clear in block
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        b[br + i][bc + j].notes.delete(num);
      }
    }
  }

  private checkErrors() {
    const b = this.board();
    // Reset errors
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        b[r][c].error = false;
      }
    }

    // Check rows, cols, blocks for conflicts
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = b[r][c].val;
        if (val === 0) continue;

        let conflict = false;
        // Check row
        for (let i = 0; i < 9; i++) if (i !== c && b[r][i].val === val) conflict = true;
        // Check col
        for (let i = 0; i < 9; i++) if (i !== r && b[i][c].val === val) conflict = true;
        // Check block
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if ((br + i !== r || bc + j !== c) && b[br + i][bc + j].val === val) conflict = true;
          }
        }

        if (conflict) b[r][c].error = true;
      }
    }
  }

  private checkWinCondition() {
    const b = this.board();
    let complete = true;
    let hasError = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c].val === 0) complete = false;
        if (b[r][c].error) hasError = true;
      }
    }

    const valid = complete && !hasError;

    if (valid && this.currentMode() === 'single') {
      this.isFinished.set(true);
      this.stopTimer();

      // Submit stat
      if (this.auth.isAuthenticated()) {
        const match = this.currentPuzzleId().match(/^(.*)-(\d+)$/);
        let diff = 'easy';
        if (match) {
          if (match[1].includes('medium')) diff = 'medium';
          else if (match[1].includes('hard')) diff = 'hard';
        }
        this.statsService.submitStat('sudoku', {
          mode: 'single',
          difficulty: diff,
          score: 0,
          time: this.timeSpent(),
          won: true
        }).subscribe(res => {
          if (res.isNewRecord) {
            this.bestTime.set(this.timeSpent());
          }
        });
      }
    }

    if (valid) {
      if (this.currentMode() === 'single') {
        this.finishPuzzle();
      } else if (this.currentMode() === 'pk_speed') {
        const serialized = this.serializeBoard();
        this.ws.send({ action: 'finish', board: serialized });
      }
    }
  }

  private serializeBoard(): string {
    let res = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = this.board()[r][c].val;
        res += val === 0 ? '.' : val.toString();
      }
    }
    return res;
  }

  // Timer
  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeSpent.update(t => t + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private triggerSave() {
    if (this.currentMode() === 'single') {
      this.saveSubject.next();
    }
  }

  // Backend sync
  private saveStateToBackend() {
    if (!this.currentPuzzleId()) return;

    // Serialize board, converting Sets to arrays
    const serialized = JSON.stringify(this.board().map(row =>
      row.map(c => ({ ...c, notes: Array.from(c.notes) }))
    ));

    this.http.post(`${environment.apiUrl}/sudoku/puzzle/${this.currentPuzzleId()}/save`, {
      current_state: serialized,
      time_spent: this.timeSpent()
    }).subscribe();
  }

  private finishPuzzle() {
    if (!this.currentPuzzleId()) return;

    // Save the final board state immediately
    this.saveStateToBackend();

    let stars = 3;
    if (this.timeSpent() > 300) stars = 2; // > 5 mins
    if (this.timeSpent() > 600) stars = 1; // > 10 mins

    this.http.post(`${environment.apiUrl}/sudoku/puzzle/${this.currentPuzzleId()}/finish`, {
      time_spent: this.timeSpent(),
      stars: stars
    }).subscribe();
  }

  pauseAndSave() {
    if (this.currentMode() === 'single') {
      this.stopTimer();
      this.saveStateToBackend();
    }
  }

  destroy() {
    this.pauseAndSave();
  }
}
