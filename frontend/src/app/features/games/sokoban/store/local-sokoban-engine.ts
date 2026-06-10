export class LocalSokobanEngine {
  board: string[][] = [];
  history: string[][][] = [];
  moves: number = 0;
  status: 'playing' | 'finished' = 'playing';
  difficulty: string;

  private levels: Record<string, string> = {
    'easy': `
  ###
  #.#
  # #
###$###
#.@.$.#
###$###
  # #
  #.#
  ###`,
    'medium': `
#######
#     #
# .$. #
###$###
# .@. #
#######`,
    'hard': `
  #####
###   #
#.@$  #
### $.#
#.##$ #
# # . ##
#$ *$$.#
#   .  #
########`
  };

  constructor(difficulty: string = 'easy', existingData?: any) {
    this.difficulty = difficulty;
    
    if (existingData) {
      this.board = existingData.board;
      this.history = existingData.history || [];
      this.moves = existingData.moves || 0;
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
    const levelStr = this.levels[this.difficulty] || this.levels['easy'];
    this.board = this.parseLevel(levelStr);
    this.history = [];
    this.moves = 0;
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

    if (targetCell === '#') return;

    if (targetCell === ' ' || targetCell === '.') {
      this.history.push(this.copyBoard(this.board));
      this.moves++;
      this.board[nr][nc] = this.movePlayer(targetCell);
      this.board[pr][pc] = this.leaveCell(this.board[pr][pc]);
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
        this.checkWin();
        this.saveToStorage();
        return;
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
    let finished = true;
    for (const row of this.board) {
      for (const val of row) {
        if (val === '$') {
          finished = false;
          break;
        }
      }
      if (!finished) break;
    }

    if (finished) {
      this.status = 'finished';
      localStorage.removeItem('sokoban_save');
    }
  }

  saveToStorage() {
    if (this.status === 'finished') {
      localStorage.removeItem('sokoban_save');
      return;
    }
    const data = {
      board: this.board,
      history: this.history,
      moves: this.moves,
      status: this.status,
      difficulty: this.difficulty
    };
    localStorage.setItem('sokoban_save', JSON.stringify(data));
  }

  static loadFromStorage(): { engine: LocalSokobanEngine, difficulty: string } | null {
    const saved = localStorage.getItem('sokoban_save');
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      const engine = new LocalSokobanEngine(data.difficulty, data);
      return { engine, difficulty: data.difficulty };
    } catch (e) {
      return null;
    }
  }
}
