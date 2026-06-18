import { GameDifficulty, GameMode, GameStatus } from '../../../../core/models/game.model';
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AudioService } from '../../../../core/services/audio.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { AdService } from '../../../../core/services/ad.service';
import { environment } from '../../../../../environments/environment';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { SudokuCell } from './sudoku-engine';
import { C2SAction } from '../../../../core/models/websocket.model';
export type { SudokuCell };



@Injectable()
export class SudokuStore extends BaseGameStore {
  readonly gameId = 'sudoku';

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private audio = inject(AudioService);
  private i18n = inject(I18nService);
  private adService = inject(AdService);

  private saveSubject = new Subject<void>();
  private history: SudokuCell[][][] = [];

  // Board state (Local)
  board = signal<SudokuCell[][]>([]);
  originalPuzzleStr = signal<string>('');
  solution = signal<string>('');
  selectedCell = signal<{ r: number, c: number } | null>(null);
  pencilMode = signal<boolean>(false);

  // History for Undo
  

  // Metadata
  view = signal<'lobby' | 'room' | 'countdown' | 'play'>('lobby');
  currentPuzzleId = signal<string>('');
  timeSpent = signal<number>(0);
  override isFinished = signal<boolean>(false);
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
  override rawState = computed(() => this.ws.gameState() || {
    status: 'waiting',
    difficulty: '',
    players: {},
    puzzle: '',
    currentBoard: '',
    winners: []
  });

  gameStatus = computed(() => this.rawState()?.status || 'waiting');
  players = computed(() => this.rawState()?.players || {});
  override readonly hostId = computed(() => this.rawState()?.host || '');

  override readonly singlePlayerStatus = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.isFinished() ? GameStatus.Finished : 'playing';
    return (this.rawState()?.status as string) || 'waiting';
  });
  private timer: any;

  constructor() {
    super();
    this.saveSubject.pipe(debounceTime(1000)).subscribe(() => {
      this.saveStateToBackend();
    });

    // Effect to handle Room -> Countdown -> Play transition
    effect(() => {
      const status = this.gameStatus();
      const currentView = this.view();
      const puzzle = this.rawState().puzzle;

      // When server sends GameStatus.Starting, show countdown overlay
      if (status === GameStatus.Starting && (currentView === 'room' || currentView === 'lobby')) {
        this.view.set('countdown');
        if (puzzle) {
          this.initBoard(puzzle);
        }
      }

      // When server sends GameStatus.Playing, transition to play view
      if (status === GameStatus.Playing) {
        if (currentView !== 'play') {
          this.view.set('play');
        }
        // Init board whenever play state is reached and board is empty (handles late-arriving puzzle)
        if (this.board().length === 0 && puzzle) {
          const savedState = localStorage.getItem(`sudoku_pk_${this.roomId()}`);
          this.initBoard(puzzle, '', savedState || undefined);
        }
      }
    });

    // Effect to auto-sync Steal mode board
    effect(() => {
      if (this.currentRoomMode() === GameMode.Steal) {
        const rState = this.rawState() as any;
        if (rState.status === GameStatus.Playing && rState.currentBoard) {
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
  // override joinRoom if we want to set 'view' or we can just rely on effect
  override joinRoom(roomId: string, mode: string, diff: string, hostId?: string, target: number = 1) {
    this.view.set('room');
    super.joinRoom(roomId, mode, diff, hostId, target);
  }

  override leaveRoom() {
    super.leaveRoom();
    this.view.set('lobby');
  }

  playAgain() {
    if (this.currentRoomMode() !== GameMode.Single) {
      super.restartGame();
    }
  }

  // --- SINGLE PLAYER INIT ---
  initBoard(puzzleStr: string, solutionStr: string = '', savedState?: string, savedTime?: number) {
    this.history = [];
    if (savedTime) this.timeSpent.set(savedTime);
    else this.timeSpent.set(0);

    this.originalPuzzleStr.set(puzzleStr);
    this.solution.set(solutionStr);
    this.isFinished.set(false);

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
      let diff: string = GameDifficulty.Easy;
      if (match) {
        if (match[1].includes(GameDifficulty.Medium)) diff = GameDifficulty.Medium;
        else if (match[1].includes(GameDifficulty.Hard)) diff = GameDifficulty.Hard;
      }
      this.getStats().subscribe(stats => {
        const stat = stats.find(s => s.Mode === GameMode.Single && s.Difficulty === diff);
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

    this.audio.playSudoku('input');

    if (this.currentRoomMode() === GameMode.Steal) {
      const myPlayer = this.players()[this.playerId()];
      if (myPlayer && myPlayer.freezeUntil > Date.now()) {
        this.toast.show('You are frozen!', 'error');
        return;
      }
      // In steal mode, we send directly to WS and wait for update
      this.ws.send({ action: C2SAction.Input, r: sel.r, c: sel.c, val: num });
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
    if (this.currentRoomMode() === GameMode.Speed) {
      this.ws.send({ action: C2SAction.Progress, progress: this.countFilledCells() });
    }

    this.triggerSave();
  }

  applyHint() {
    if (this.currentRoomMode() !== GameMode.Single || this.isFinished()) return;
    const sel = this.selectedCell();
    if (!sel) {
      this.toast.show(this.i18n.t('game.select_cell_first')() || 'Please select an empty cell first', 'info');
      return;
    }

    const b = this.board();
    if (b[sel.r][sel.c].fixed || b[sel.r][sel.c].val !== 0) {
      this.toast.show(this.i18n.t('game.cell_already_filled')() || 'Cell is already filled', 'info');
      return;
    }

    const solution = this.solution();
    if (!solution || solution.length !== 81) return;

    const targetVal = parseInt(solution[sel.r * 9 + sel.c], 10);
    
    this.audio.playSudoku('success');
    
    const newB = this.board();
    const cell = newB[sel.r][sel.c];
    cell.val = targetVal;
    // Optionally make it fixed so they know it's 100% correct and can't erase it easily
    cell.fixed = true; 
    cell.notes.clear();
    this.autoEraseNotes(sel.r, sel.c, targetVal);
    
    this.board.set([...newB]);
    this.checkErrors();
    this.checkWinCondition();
    this.triggerSave();
    
    this.toast.show(this.i18n.t('game.hint_sudoku')() || 'Hint applied!', 'success');
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

    this.audio.playSudoku('clear');

    if (this.currentRoomMode() === GameMode.Steal) {
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
    if (this.currentRoomMode() === GameMode.Steal) return;

    this.audio.playSudoku('clear');
    this.saveHistory();

    const orig = this.originalPuzzleStr();
    const b = this.board();
    const newBoard = b.map((row, r) => row.map((c, col) => {
      let isOrigFixed = false;
      if (orig && orig.length === 81) {
        const char = orig[r * 9 + col];
        isOrigFixed = (char !== '.' && char !== '0' && char !== '-');
      } else {
        isOrigFixed = c.fixed;
      }
      
      if (!isOrigFixed) {
        return { ...c, val: 0, fixed: false, notes: new Set<number>(), error: false };
      }
      return { ...c, error: false };
    }));

    this.board.set(newBoard);
    this.checkErrors();
    this.triggerSave();
  }

  canUndo = () => this.history.length > 0;

  undo() {
    if (this.currentRoomMode() !== GameMode.Single || this.isFinished()) return;
    if (this.history.length === 0) return;
    this.audio.playSudoku('input');
    const last = this.history.pop()!;
    this.board.set(last.map(row => row.map(c => ({ ...c, notes: new Set(c.notes) }))));
    this.checkErrors();
    this.saveSubject.next();
  }

  private saveHistory() {
    const clone = this.board().map(row => row.map(c => ({ ...c, notes: new Set(c.notes) })));
    this.history.push(clone);
    if (this.history.length > 20) this.history.shift();
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

    if (valid && this.currentRoomMode() === GameMode.Single) {
      this.isFinished.set(true);
      this.stopTimer();
      this.finishPuzzle();
    }

    if (valid) {
      if (this.currentRoomMode() === GameMode.Speed) {
        const serialized = this.serializeBoard();
        this.ws.send({ action: C2SAction.Finish, board: serialized });
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
    if (this.currentRoomMode() === GameMode.Single) {
      this.saveSubject.next();
    } else if (this.roomId()) {
      // Multiplayer: save locally to localStorage so it can be restored on reconnect
      const serialized = JSON.stringify(this.board().map(row =>
        row.map(c => ({ ...c, notes: Array.from(c.notes) }))
      ));
      localStorage.setItem(`sudoku_pk_${this.roomId()}`, serialized);
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

    this.saveStateToBackend();

    let stars = 3;
    if (this.timeSpent() > 300) stars = 2;
    if (this.timeSpent() > 600) stars = 1;

    const match = this.currentPuzzleId().match(/^(.*)-(\d+)$/);
    let diff: string = GameDifficulty.Easy;
    if (match) {
      if (match[1].includes(GameDifficulty.Medium)) diff = GameDifficulty.Medium;
      else if (match[1].includes(GameDifficulty.Hard)) diff = GameDifficulty.Hard;
    }

    this.http.post<any>(`${environment.apiUrl}/sudoku/puzzle/${this.currentPuzzleId()}/finish`, {
      time_spent: this.timeSpent(),
      stars,
      mode: GameMode.Single,
      difficulty: diff
    }).subscribe(res => {
      if (res?.isNewRecord) this.bestTime.set(this.timeSpent());
      this.lastStatResult.set(res);
      if (res?.xp_result?.xp_earned) this.xpService.showXpGain(res.xp_result.xp_earned);
      if (res?.new_achievements?.length) this.achievementService.handleNewAchievements(res.new_achievements);
    });
  }

  pauseAndSave() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.stopTimer();
      this.saveStateToBackend();
    }
  }

  destroy() {
    this.pauseAndSave();
  }
}
