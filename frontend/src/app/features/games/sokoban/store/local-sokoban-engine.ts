export class LocalSokobanEngine {
  board: string[][] = [];
  history: string[][][] = [];
  moves: number = 0;
  timeSpent: number = 0;
  status: 'playing' | 'finished' = 'playing';
  difficulty: string;

  levelStr: string;

  levelId: string;
  onSound?: (sound: 'move' | 'push' | 'bump' | 'target') => void;

  constructor(levelId: string, difficulty: string, levelStr: string, existingData?: any, onSound?: (sound: 'move' | 'push' | 'bump' | 'target') => void) {
    this.levelId = levelId;
    this.difficulty = difficulty;
    this.levelStr = levelStr;
    this.onSound = onSound;
    this.levelStr = levelStr;
    
    if (existingData && existingData.levelStr === levelStr) {
      this.board = existingData.board;
      this.history = existingData.history || [];
      this.moves = existingData.moves || 0;
      this.timeSpent = existingData.timeSpent || 0;
      this.status = existingData.status || 'playing';
    } else {
      this.initBoard();
    }
  }

  private parseLevel(levelStr: string): string[][] {
    levelStr = levelStr.replace(/\r/g, '');
    const lines = levelStr.split('\n');
    if (lines[0] === '') lines.shift(); // Remove first empty line if exists
    if (lines[lines.length - 1] === '') lines.pop(); // Remove last empty line if exists

    let maxLen = 0;
    for (const line of lines) {
      if (line.length > maxLen) maxLen = line.length;
    }

    const board: string[][] = [];
    for (const line of lines) {
      let padded = line;
      while (padded.length < maxLen) {
        padded += ' ';
      }
      board.push(padded.split(''));
    }
    return board;
  }

  private copyBoard(b: string[][]): string[][] {
    return b.map(row => [...row]);
  }

  private initBoard() {
    this.board = this.parseLevel(this.levelStr);
    this.history = [];
    this.moves = 0;
    this.timeSpent = 0;
    this.status = 'playing';
  }

  restart() {
    this.initBoard();
    this.saveToStorage();
  }

  undo() {
    if (this.status === 'finished') return;
    if (this.history.length > 0) {
      const lastBoard = this.history.pop();
      if (lastBoard) {
        this.board = this.copyBoard(lastBoard);
        this.moves--;
        this.saveToStorage();
      }
    }
  }

  move(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.status === 'finished') return;

    let pr = -1, pc = -1;
    for (let r = 0; r < this.board.length; r++) {
      for (let c = 0; c < this.board[r].length; c++) {
        if (this.board[r][c] === '@' || this.board[r][c] === '+') {
          pr = r;
          pc = c;
          break;
        }
      }
      if (pr !== -1) break;
    }

    if (pr === -1) return;

    let dr = 0, dc = 0;
    switch (dir) {
      case 'up': dr = -1; break;
      case 'down': dr = 1; break;
      case 'left': dc = -1; break;
      case 'right': dc = 1; break;
    }

    const nr = pr + dr;
    const nc = pc + dc;

    if (nr < 0 || nr >= this.board.length || nc < 0 || nc >= this.board[nr].length) return;

    const targetCell = this.board[nr][nc];

    if (targetCell === '#') {
      if (this.onSound) this.onSound('bump');
      return;
    }

    if (targetCell === ' ' || targetCell === '.') {
      this.history.push(this.copyBoard(this.board));
      this.moves++;
      this.board[nr][nc] = this.movePlayer(targetCell);
      this.board[pr][pc] = this.leaveCell(this.board[pr][pc]);
      if (this.onSound) this.onSound('move');
      this.checkWin();
      this.saveToStorage();
      return;
    }

    if (targetCell === '$' || targetCell === '*') {
      const nnr = nr + dr;
      const nnc = nc + dc;

      if (nnr < 0 || nnr >= this.board.length || nnc < 0 || nnc >= this.board[nnr].length) return;

      const pushCell = this.board[nnr][nnc];
      if (pushCell === ' ' || pushCell === '.') {
        this.history.push(this.copyBoard(this.board));
        this.moves++;
        this.board[nnr][nnc] = this.pushBox(pushCell);
        this.board[nr][nc] = this.movePlayer(this.leaveCell(targetCell));
        this.board[pr][pc] = this.leaveCell(this.board[pr][pc]);
        
        if (this.onSound) {
          if (pushCell === '.') this.onSound('target');
          else this.onSound('push');
        }

        this.checkWin();
        this.saveToStorage();
        return;
      } else {
        if (this.onSound) this.onSound('bump');
      }
    }
  }

  private movePlayer(to: string): string {
    return to === '.' ? '+' : '@';
  }

  private leaveCell(from: string): string {
    return (from === '+' || from === '*') ? '.' : ' ';
  }

  private pushBox(to: string): string {
    return to === '.' ? '*' : '$';
  }

  private checkWin() {
    let win = true;
    for (let r = 0; r < this.board.length; r++) {
      for (let c = 0; c < this.board[r].length; c++) {
        if (this.board[r][c] === '$') {
          win = false;
          break;
        }
      }
      if (!win) break;
    }
    if (win) {
      this.status = 'finished';
      (typeof localStorage !== 'undefined' && localStorage.removeItem('sokoban_save'));
    }
  }

  applyHint(): { success: boolean; message: string } {
    if (this.status === 'finished') return { success: false, message: 'game.no_hint_available' };

    for (let r = 1; r < this.board.length - 1; r++) {
      for (let c = 1; c < this.board[r].length - 1; c++) {
        if (this.board[r][c] === '$') {
          const top = this.board[r - 1][c] === '#';
          const bottom = this.board[r + 1][c] === '#';
          const left = this.board[r][c - 1] === '#';
          const right = this.board[r][c + 1] === '#';
          
          if ((top || bottom) && (left || right)) {
            return { success: true, message: 'sokoban.hint_stuck_corner' };
          }
        }
      }
    }
    return { success: true, message: 'sokoban.hint_keep_pushing' };
  }

  saveToStorage() {
    if (this.status === 'finished') {
      (typeof localStorage !== 'undefined' && localStorage.removeItem('sokoban_save'));
      return;
    }
    const data = {
      levelId: this.levelId,
      board: this.board,
      history: this.history,
      moves: this.moves,
      timeSpent: this.timeSpent,
      status: this.status,
      difficulty: this.difficulty,
      levelStr: this.levelStr
    };
    (typeof localStorage !== 'undefined' && localStorage.setItem('sokoban_save', JSON.stringify(data)));
  }

  static loadFromStorage(levelId?: string): { engine: LocalSokobanEngine, difficulty: string } | null {
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('sokoban_save') : null);
    if (!saved) return null;
    
    try {
      const data = JSON.parse(saved);
      if (!data.levelStr) return null;
      
      // If a specific levelId was requested, and it doesn't match the saved one, return null
      if (levelId && data.levelId && data.levelId !== levelId) {
        return null;
      }
      
      // If no levelId was requested, use the saved one
      const targetLevelId = levelId || data.levelId;

      // Migrate legacy difficulties
      if (data.difficulty === 'easy') data.difficulty = 'beginner';
      if (data.difficulty === 'medium') data.difficulty = 'intermediate';
      if (data.difficulty === 'hard') data.difficulty = 'advanced';

      const engine = new LocalSokobanEngine(targetLevelId, data.difficulty, data.levelStr, data);
      return { engine, difficulty: data.difficulty };
    } catch (e) {
      return null;
    }
  }
}
