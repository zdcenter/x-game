import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { Tube } from './watersort.store';

export enum WatersortActionType {
  Pour = 'pour',
  Restart = 'restart'
}

export type WatersortAction =
  | { type: WatersortActionType.Pour, from: number, to: number }
  | { type: WatersortActionType.Restart };

export class LocalWatersortEngine implements ILocalEngine<any, WatersortAction> {
  status: GameStatusType = GameStatus.Waiting;
  tubes: Tube[] = [];
  moves: number = 0;
  finished: boolean = false;
  playerId: string = '';
  difficulty: string = GameDifficulty.Easy;

  private initialTubes: Tube[] = [];
  private onWin?: () => void;
  private onPour?: () => void;
  private onInvalid?: () => void;

  initGame(config: { playerId: string, difficulty: string, onWin?: () => void, onPour?: () => void, onInvalid?: () => void }) {
    this.playerId = config.playerId;
    this.difficulty = config.difficulty;
    this.onWin = config.onWin;
    this.onPour = config.onPour;
    this.onInvalid = config.onInvalid;

    this.moves = 0;
    this.finished = false;
    this.status = GameStatus.Playing;
    this.generateBoard();
  }

  getState() {
    return this;
  }

  handleAction(action: WatersortAction) {
    if (this.status !== GameStatus.Playing || this.finished) return;

    if (action.type === WatersortActionType.Restart) {
      this.restart();
    } else if (action.type === WatersortActionType.Pour) {
      this.pour(action.from, action.to);
    }
  }

  private pour(from: number, to: number) {
    if (from === to) {
      if (this.onInvalid) this.onInvalid();
      return;
    }
    const tFrom = this.tubes[from];
    const tTo = this.tubes[to];

    if (!tFrom || !tTo || tFrom.colors.length === 0 || tTo.colors.length >= 4) {
      if (this.onInvalid) this.onInvalid();
      return;
    }

    const colorToPour = tFrom.colors[tFrom.colors.length - 1];
    if (tTo.colors.length > 0 && tTo.colors[tTo.colors.length - 1] !== colorToPour) {
      if (this.onInvalid) this.onInvalid();
      return;
    }

    // Determine how many blocks of the same color can be poured
    let count = 0;
    for (let i = tFrom.colors.length - 1; i >= 0; i--) {
      if (tFrom.colors[i] === colorToPour) count++;
      else break;
    }
    const space = 4 - tTo.colors.length;
    const toPour = Math.min(count, space);

    // Create new array references so Angular's ngOnChanges detects the change
    this.tubes[from] = { colors: tFrom.colors.slice(0, tFrom.colors.length - toPour) };
    this.tubes[to] = { colors: [...tTo.colors, ...Array(toPour).fill(colorToPour)] };
    this.tubes = [...this.tubes];

    this.moves++;
    if (this.onPour) this.onPour();

    if (this.checkWin()) {
      this.status = GameStatus.Finished;
      this.finished = true;
      if (this.onWin) this.onWin();
    }
  }

  private restart() {
    this.tubes = this.initialTubes.map(t => ({ colors: [...t.colors] }));
    this.moves = 0;
    this.status = GameStatus.Playing;
    this.finished = false;
  }

  private checkWin(): boolean {
    for (const tube of this.tubes) {
      if (tube.colors.length > 0 && tube.colors.length < 4) return false;
      if (tube.colors.length === 4) {
        const c = tube.colors[0];
        for (let i = 1; i < 4; i++) {
          if (tube.colors[i] !== c) return false;
        }
      }
    }
    return true;
  }

  // High-depth master seeds for 14-color (Hard) mode, guaranteed depth 41-45 moves
  private static readonly HARD_MASTER_SEEDS: number[][][] = [
    [[11,5,3,8],[8,10,9,5],[6,12,2,8],[10,1,1,0],[10,0,6,6],[12,2,2,1],[0,4,13,6],[8,4,11,3],[13,13,5,1],[10,4,11,12],[7,11,7,7],[9,3,3,9],[13,2,0,5],[9,7,4,12]],
    [[3,7,13,4],[5,12,3,1],[11,2,13,0],[7,3,13,5],[11,11,8,5],[2,4,4,13],[2,0,2,10],[6,9,9,1],[7,11,12,8],[5,8,10,6],[6,7,8,9],[3,0,0,10],[6,4,12,12],[1,9,10,1]],
    [[11,9,9,6],[6,6,2,1],[4,10,7,13],[2,13,8,10],[2,0,13,5],[4,3,6,0],[1,1,0,1],[8,7,10,4],[13,8,10,12],[12,5,3,8],[12,5,4,0],[7,5,9,11],[7,3,9,12],[2,3,11,11]]
  ];

  private generateBoard() {
    let numColors = 5;
    let minMoves = 10;
    if (this.difficulty === GameDifficulty.Medium) {
      numColors = 9;
      minMoves = 20;
    } else if (this.difficulty === GameDifficulty.Hard) {
      numColors = 14;
      minMoves = 35;
    }

    const colorPalette = [
      'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink',
      'brown', 'gray', 'lime', 'teal', 'navy', 'magenta'
    ];
    const activeColors = colorPalette.slice(0, numColors);

    let board: string[][];
    if (numColors === 14) {
      board = this.generateHardBoard(activeColors);
    } else {
      board = this.generateDynamicSolvableBoard(activeColors, minMoves);
    }

    this.tubes = board.map(c => ({ colors: c }));
    this.initialTubes = board.map(c => ({ colors: [...c] }));
  }

  private generateHardBoard(colors: string[]): string[][] {
    const seedIndex = Math.floor(Math.random() * LocalWatersortEngine.HARD_MASTER_SEEDS.length);
    const masterSeed = LocalWatersortEngine.HARD_MASTER_SEEDS[seedIndex];

    // Create random bijective mapping of 14 colors
    const shuffledColors = [...colors];
    for (let i = shuffledColors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
    }

    // Map each number in master seed to its mapped color
    const mappedTubes: string[][] = masterSeed.map(tube => tube.map(colorId => shuffledColors[colorId]));

    // Shuffle the order of the 14 filled tubes
    for (let i = mappedTubes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mappedTubes[i], mappedTubes[j]] = [mappedTubes[j], mappedTubes[i]];
    }

    // Append 2 empty buffer tubes
    mappedTubes.push([]);
    mappedTubes.push([]);
    return mappedTubes;
  }

  private generateDynamicSolvableBoard(colors: string[], minMoves: number): string[][] {
    const numColors = colors.length;
    const numTubes = numColors + 2;
    const capacity = 4;
    const maxAttempts = 15;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Build deck of 4 of each color
      const deck: string[] = [];
      for (const c of colors) {
        for (let k = 0; k < capacity; k++) deck.push(c);
      }

      // Shuffle deck
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      // Distribute into numColors tubes of capacity 4
      const tubes: string[][] = [];
      for (let i = 0; i < numColors; i++) {
        tubes.push(deck.slice(i * capacity, (i + 1) * capacity));
      }

      // Reject if any tube starts already completely monocolor
      if (tubes.some(t => t.every(c => c === t[0]))) {
        continue;
      }

      // Add 2 empty buffer tubes
      tubes.push([]);
      tubes.push([]);

      // Verify solvability with BFS solver
      const depth = this.solveBFS(tubes, capacity);
      if (depth >= minMoves) {
        return tubes;
      }
    }

    // Fallback: simple valid shuffle if maxAttempts exceeded
    const fallbackDeck: string[] = [];
    for (const c of colors) {
      for (let k = 0; k < capacity; k++) fallbackDeck.push(c);
    }
    for (let i = fallbackDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackDeck[i], fallbackDeck[j]] = [fallbackDeck[j], fallbackDeck[i]];
    }
    const fallbackTubes: string[][] = [];
    for (let i = 0; i < numColors; i++) {
      fallbackTubes.push(fallbackDeck.slice(i * capacity, (i + 1) * capacity));
    }
    fallbackTubes.push([]);
    fallbackTubes.push([]);
    return fallbackTubes;
  }

  private solveBFS(initialTubes: string[][], capacity: number = 4): number {
    const numTubes = initialTubes.length;
    const targetCompleted = numTubes - 2;

    const isSolved = (state: string[][]): boolean => {
      let completed = 0;
      for (const t of state) {
        if (t.length === 0) continue;
        if (t.length !== capacity) return false;
        const c = t[0];
        for (let i = 1; i < capacity; i++) {
          if (t[i] !== c) return false;
        }
        completed++;
      }
      return completed === targetCompleted;
    };

    const serialize = (state: string[][]): string => {
      return state.map(t => t.join(',')).sort().join('|');
    };

    const queue: { state: string[][], depth: number }[] = [{ state: initialTubes, depth: 0 }];
    const visited = new Set<string>();
    visited.add(serialize(initialTubes));

    const maxVisited = 15000;
    while (queue.length > 0) {
      const { state, depth } = queue.shift()!;
      if (isSolved(state)) return depth;
      if (visited.size > maxVisited) return -1;

      for (let i = 0; i < numTubes; i++) {
        const src = state[i];
        if (src.length === 0) continue;
        if (src.length === capacity && src.every(c => c === src[0])) continue;

        const top = src[src.length - 1];
        let run = 0;
        for (let k = src.length - 1; k >= 0; k--) {
          if (src[k] === top) run++;
          else break;
        }
        const isPure = (src.length === run);
        let usedEmpty = false;

        for (let j = 0; j < numTubes; j++) {
          if (i === j) continue;
          const dst = state[j];
          if (dst.length === capacity) continue;

          if (dst.length === 0) {
            if (isPure || usedEmpty) continue;
            usedEmpty = true;
            const toMove = Math.min(run, capacity);
            const next = state.map((t, idx) => {
              if (idx === i) return t.slice(0, t.length - toMove);
              if (idx === j) return Array(toMove).fill(top);
              return t;
            });
            const key = serialize(next);
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({ state: next, depth: depth + 1 });
            }
          } else if (dst[dst.length - 1] === top) {
            const space = capacity - dst.length;
            const toMove = Math.min(run, space);
            const next = state.map((t, idx) => {
              if (idx === i) return t.slice(0, t.length - toMove);
              if (idx === j) return [...t, ...Array(toMove).fill(top)];
              return t;
            });
            const key = serialize(next);
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({ state: next, depth: depth + 1 });
            }
          }
        }
      }
    }
    return -1;
  }
}
