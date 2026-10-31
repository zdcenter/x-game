import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { TentsPuzzle, TENTS_LEVELS, generateProceduralTents } from './tents-levels';

export enum TentsCellState {
  Empty = 0,
  Tree = 1,
  Tent = 2,
  Grass = 3
}

export interface CellChange {
  r: number;
  c: number;
  prev: TentsCellState;
  next: TentsCellState;
}

export type TentsAction =
  | { type: 'set_cell'; row: number; col: number; state?: TentsCellState }
  | { type: 'auto_grass_row'; row: number }
  | { type: 'auto_grass_col'; col: number }
  | { type: 'auto_grass_all' }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'hint' }
  | { type: 'set_level'; levelIndex: number }
  | { type: 'next_level' };

export class LocalTentsEngine implements ILocalEngine<any, TentsAction> {
  score: number = 0;
  moves: number = 0;
  status: GameStatusType = GameStatus.Waiting;
  difficulty: string = GameDifficulty.Easy;
  startAt: number = 0;

  size: number = 6;
  levelIndex: number = 0;
  currentLevel!: TentsPuzzle;

  onSound?: (sound: 'tent' | 'removeTent' | 'grass' | 'removeGrass' | 'autoGrass' | 'conflict' | 'hint' | 'win') => void;

  grid: number[][] = [];
  rowClues: number[] = [];
  colClues: number[] = [];
  trees: { r: number; c: number }[] = [];

  // 状态与辅助判定
  moveHistory: CellChange[] = [];
  tentConflicts = new Set<string>(); // "r,c"
  rowTentsCount: number[] = [];
  colTentsCount: number[] = [];
  rowSatisfied: boolean[] = [];
  colSatisfied: boolean[] = [];
  rowOver: boolean[] = [];
  colOver: boolean[] = [];

  activeHint: { r: number; c: number; text: string } | null = null;

  get totalTrees(): number {
    return this.trees.length;
  }

  get placedTentsCount(): number {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === TentsCellState.Tent) count++;
      }
    }
    return count;
  }

  initGame(config?: { difficulty?: string; levelIndex?: number; seed?: number; puzzle?: TentsPuzzle; onSound?: (sound: 'tent' | 'removeTent' | 'grass' | 'removeGrass' | 'autoGrass' | 'conflict' | 'hint' | 'win') => void }) {
    if (config?.onSound) {
      this.onSound = config.onSound;
    }
    this.difficulty = config?.difficulty || GameDifficulty.Easy;
    this.status = GameStatus.Playing;
    this.startAt = Date.now();
    this.score = 0;
    this.moves = 0;
    this.moveHistory = [];
    this.activeHint = null;

    const size = this.difficulty === 'hard' ? 10 : this.difficulty === 'medium' ? 8 : 6;
    const reqIndex = config?.levelIndex ?? (this.levelIndex ?? 0);
    this.levelIndex = Math.max(0, reqIndex);

    if (config?.puzzle) {
      this.currentLevel = config.puzzle;
    } else {
      // 像《扫雷》一样：每局纯随机生成全新棋盘，100% 保证有解！
      // 若提供了固定 seed（如 PK 对战），则使用该 seed 保证双方完全同构；否则生成全新随机种子
      const seed = config?.seed ?? Math.floor(Math.random() * 2147483647);
      const puzzle = generateProceduralTents(size, this.difficulty as any, seed);
      puzzle.id = `${this.difficulty}_rnd_${seed}`;
      puzzle.name = config?.seed !== undefined ? '竞技对决' : `第 ${this.levelIndex + 1} 局`;
      const diffName = this.difficulty === 'hard' ? '困难' : this.difficulty === 'medium' ? '中等' : '简单';
      puzzle.chapter = `${diffName}森林 · ${size}x${size}`;
      this.currentLevel = puzzle;
    }

    this.size = this.currentLevel.size;
    this.rowClues = [...this.currentLevel.rowClues];
    this.colClues = [...this.currentLevel.colClues];
    this.trees = [...this.currentLevel.trees];

    // 初始化网格
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(TentsCellState.Empty));
    for (const t of this.trees) {
      if (t.r >= 0 && t.r < this.size && t.c >= 0 && t.c < this.size) {
        this.grid[t.r][t.c] = TentsCellState.Tree;
      }
    }

    this.validateBoard();
  }

  handleAction(action: TentsAction): void {
    if (action.type === 'reset') {
      this.status = GameStatus.Playing;
      this.startAt = Date.now();
      this.score = 0;
      this.moves = 0;
      this.moveHistory = [];
      this.activeHint = null;

      this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(TentsCellState.Empty));
      for (const t of this.trees) {
        if (t.r >= 0 && t.r < this.size && t.c >= 0 && t.c < this.size) {
          this.grid[t.r][t.c] = TentsCellState.Tree;
        }
      }
      this.validateBoard();
      return;
    }

    if (action.type === 'set_level') {
      this.initGame({ difficulty: this.difficulty, levelIndex: action.levelIndex });
      return;
    }

    if (action.type === 'next_level') {
      this.levelIndex = (this.levelIndex ?? 0) + 1;
      this.initGame({ difficulty: this.difficulty, levelIndex: this.levelIndex });
      return;
    }

    if (this.status !== GameStatus.Playing) return;

    if (action.type === 'undo') {
      this.undo();
      return;
    }

    if (action.type === 'hint') {
      this.triggerHint();
      return;
    }

    if (action.type === 'auto_grass_row') {
      this.autoGrassRow(action.row);
      return;
    }

    if (action.type === 'auto_grass_col') {
      this.autoGrassCol(action.col);
      return;
    }

    if (action.type === 'auto_grass_all') {
      this.autoGrassAll();
      return;
    }

    if (action.type === 'set_cell') {
      this.setCell(action.row, action.col, action.state);
    }
  }

  setCell(r: number, c: number, explicitState?: TentsCellState) {
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return;
    if (this.grid[r][c] === TentsCellState.Tree) return; // 树木不可点

    const current = this.grid[r][c];
    let next: TentsCellState;

    if (explicitState !== undefined) {
      if (explicitState === TentsCellState.Tent) {
        next = current === TentsCellState.Tent ? TentsCellState.Empty : TentsCellState.Tent;
      } else if (explicitState === TentsCellState.Grass) {
        next = current === TentsCellState.Grass ? TentsCellState.Empty : TentsCellState.Grass;
      } else {
        next = explicitState;
      }
    } else {
      // 默认直觉二态切换：空白 ➔ 帐篷；再点一次直接变回空白！(彻底终结三态循环困惑)
      if (current === TentsCellState.Empty) next = TentsCellState.Tent;
      else if (current === TentsCellState.Tent) next = TentsCellState.Empty;
      else next = TentsCellState.Empty;
    }

    if (current === next) return;

    this.moveHistory.push({ r, c, prev: current, next });
    this.grid[r][c] = next;
    this.moves++;

    this.validateBoard();

    // 触发对应操作音效
    if (this.onSound) {
      if (next === TentsCellState.Tent) {
        if (this.tentConflicts.has(`${r},${c}`)) {
          this.onSound('conflict');
        } else {
          this.onSound('tent');
        }
      } else if (current === TentsCellState.Tent && next === TentsCellState.Empty) {
        this.onSound('removeTent');
      } else if (next === TentsCellState.Grass) {
        this.onSound('grass');
      } else if (current === TentsCellState.Grass && next === TentsCellState.Empty) {
        this.onSound('removeGrass');
      }
    }

    this.checkWinCondition();
  }

  undo() {
    if (this.moveHistory.length === 0) return;
    const last = this.moveHistory.pop()!;
    this.grid[last.r][last.c] = last.prev;
    this.validateBoard();
  }

  autoGrassRow(r: number) {
    if (r < 0 || r >= this.size) return;
    if (!this.rowSatisfied[r]) return;
    let placed = false;
    for (let c = 0; c < this.size; c++) {
      if (this.grid[r][c] === TentsCellState.Empty) {
        this.setCell(r, c, TentsCellState.Grass);
        placed = true;
      }
    }
    if (placed && this.onSound) {
      this.onSound('autoGrass');
    }
  }

  autoGrassCol(c: number) {
    if (c < 0 || c >= this.size) return;
    if (!this.colSatisfied[c]) return;
    let placed = false;
    for (let r = 0; r < this.size; r++) {
      if (this.grid[r][c] === TentsCellState.Empty) {
        this.setCell(r, c, TentsCellState.Grass);
        placed = true;
      }
    }
    if (placed && this.onSound) {
      this.onSound('autoGrass');
    }
  }

  autoGrassAll() {
    for (let r = 0; r < this.size; r++) {
      if (this.rowSatisfied[r]) this.autoGrassRow(r);
    }
    for (let c = 0; c < this.size; c++) {
      if (this.colSatisfied[c]) this.autoGrassCol(c);
    }
  }

  /**
   * 智能锦囊提示 (精准指导，绝不乱填草地)：
   * 1. 优先查错纠错：检查玩家当前放置的帐篷是否放错位置，如错则高亮并帮玩家清除
   * 2. 精准点亮帐篷：从谜题标准解 (solution) 中匹配首个尚未放置的正确帐篷并点亮
   */
  triggerHint() {
    if (this.status !== GameStatus.Playing) return;

    if (!this.currentLevel?.solution || this.currentLevel.solution.length === 0) {
      this.activeHint = { r: 0, c: 0, text: '当前谜题暂无可用提示' };
      return;
    }

    const solSet = new Set(this.currentLevel.solution.map(s => `${s.r},${s.c}`));

    // 1. 优先纠错：找出当前摆放错误的帐篷
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === TentsCellState.Tent && !solSet.has(`${r},${c}`)) {
          this.activeHint = {
            r,
            c,
            text: `⚠️ 第 ${r + 1} 行第 ${c + 1} 列帐篷放置有误，已帮您纠正清除`
          };
          this.setCell(r, c, TentsCellState.Empty);
          return;
        }
      }
    }

    // 2. 核心提示：直接帮玩家点亮下一个正确的露营帐篷
    for (const s of this.currentLevel.solution) {
      if (this.grid[s.r][s.c] !== TentsCellState.Tent) {
        this.activeHint = {
          r: s.r,
          c: s.c,
          text: `💡 已为您点亮第 ${s.r + 1} 行第 ${s.c + 1} 列的正确帐篷 ⛺`
        };
        this.setCell(s.r, s.c, TentsCellState.Tent);
        if (this.onSound) this.onSound('hint');
        return;
      }
    }

    this.activeHint = { r: 0, c: 0, text: '✨ 所有帐篷已全部正确定位！' };
  }

  /**
   * 实时校验盘面状态：
   * 1. 统计每行每列帐篷数，标记达标/超额
   * 2. 检查帐篷 8 邻域相互接触（冲突）
   */
  validateBoard() {
    this.rowTentsCount = Array(this.size).fill(0);
    this.colTentsCount = Array(this.size).fill(0);
    this.tentConflicts.clear();

    const tents: { r: number; c: number }[] = [];

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === TentsCellState.Tent) {
          this.rowTentsCount[r]++;
          this.colTentsCount[c]++;
          tents.push({ r, c });
        }
      }
    }

    // 检查帐篷是否挨着（Rule 2: 8邻域不能有其他帐篷）
    for (let i = 0; i < tents.length; i++) {
      for (let j = i + 1; j < tents.length; j++) {
        const t1 = tents[i];
        const t2 = tents[j];
        if (Math.abs(t1.r - t2.r) <= 1 && Math.abs(t1.c - t2.c) <= 1) {
          this.tentConflicts.add(`${t1.r},${t1.c}`);
          this.tentConflicts.add(`${t2.r},${t2.c}`);
        }
      }
    }

    this.rowSatisfied = this.rowTentsCount.map((cnt, r) => cnt === this.rowClues[r]);
    this.colSatisfied = this.colTentsCount.map((cnt, c) => cnt === this.colClues[c]);
    this.rowOver = this.rowTentsCount.map((cnt, r) => cnt > this.rowClues[r]);
    this.colOver = this.colTentsCount.map((cnt, c) => cnt > this.colClues[c]);
  }

  /**
   * 判定通关条件（三大法则全部满足）：
   * 1. 行列达标：所有行与列帐篷数刚好等于提示数
   * 2. 帐篷不挨：没有任何帐篷 8 邻域相邻冲突
   * 3. 一树一帐：每个帐篷正交相邻一棵树，且形成 1 对 1 最大二分图匹配
   */
  checkWinCondition() {
    // 1. 冲突检查
    if (this.tentConflicts.size > 0) return;

    // 2. 数量与行列检查
    if (this.placedTentsCount !== this.totalTrees) return;
    if (!this.rowSatisfied.every(Boolean)) return;
    if (!this.colSatisfied.every(Boolean)) return;

    // 3. 一树一帐二分图匹配验证 (Hopcroft-Karp / Augmenting Path)
    const tents: { r: number; c: number }[] = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === TentsCellState.Tent) tents.push({ r, c });
      }
    }

    if (this.verifyTreeTentMatching(this.trees, tents)) {
      this.status = GameStatus.Finished;
      // 算分: 基础分 1000 - 步数损耗 + 难度加成
      const diffMultiplier = this.difficulty === 'hard' ? 3 : this.difficulty === 'medium' ? 2 : 1;
      this.score = Math.max(200, (1000 - this.moves * 5) * diffMultiplier);
      if (this.onSound) {
        this.onSound('win');
      }
    }
  }

  /**
   * 校验树与帐篷的 1:1 正交匹配 (DFS 增广路二分图匹配)
   */
  private verifyTreeTentMatching(trees: { r: number; c: number }[], tents: { r: number; c: number }[]): boolean {
    if (trees.length !== tents.length) return false;

    // 构建邻接表: treeIndex -> tentIndex[]
    const adj: number[][] = trees.map((tree) => {
      const neighbors: number[] = [];
      tents.forEach((tent, tentIdx) => {
        const dr = Math.abs(tree.r - tent.r);
        const dc = Math.abs(tree.c - tent.c);
        // 正交相邻 (距离为 1，非对角)
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          neighbors.push(tentIdx);
        }
      });
      return neighbors;
    });

    const match = Array(tents.length).fill(-1); // tent -> tree

    const dfs = (treeIdx: number, visited: boolean[]): boolean => {
      for (const tentIdx of adj[treeIdx]) {
        if (!visited[tentIdx]) {
          visited[tentIdx] = true;
          if (match[tentIdx] === -1 || dfs(match[tentIdx], visited)) {
            match[tentIdx] = treeIdx;
            return true;
          }
        }
      }
      return false;
    };

    let matchCount = 0;
    for (let i = 0; i < trees.length; i++) {
      const visited = Array(tents.length).fill(false);
      if (dfs(i, visited)) matchCount++;
    }

    return matchCount === trees.length;
  }

  getState() {
    return this;
  }

  exportBoardState() {
    return {
      score: this.score,
      moves: this.moves,
      placed: this.placedTentsCount,
      total: this.totalTrees,
      finished: this.status === GameStatus.Finished,
      grid: this.grid
    };
  }

  loadBoardState(data: any): void {
    if (!data) return;
    if (typeof data.score === 'number') this.score = data.score;
    if (typeof data.moves === 'number') this.moves = data.moves;
    if (Array.isArray(data.grid)) this.grid = data.grid;
    if (data.finished) this.status = GameStatus.Finished;
  }
}
