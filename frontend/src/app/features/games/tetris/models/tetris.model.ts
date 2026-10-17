export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;

export enum Tetromino {
  NONE = 0,
  I = 1,
  J = 2,
  L = 3,
  O = 4,
  S = 5,
  T = 6,
  Z = 7,
  GARBAGE = 8
}

export type TetrisColorTheme = 'crystal' | 'gold' | 'ocean';

export const TETROMINO_COLORS_CRYSTAL: Record<Tetromino, string> = {
  [Tetromino.NONE]: 'transparent',
  [Tetromino.I]: '#06b6d4', // cyan-500
  [Tetromino.J]: '#3b82f6', // blue-500
  [Tetromino.L]: '#f97316', // orange-500
  [Tetromino.O]: '#eab308', // yellow-500
  [Tetromino.S]: '#22c55e', // green-500
  [Tetromino.T]: '#a855f7', // purple-500
  [Tetromino.Z]: '#ef4444', // red-500
  [Tetromino.GARBAGE]: '#64748b' // slate-500
};

export const TETROMINO_COLORS_GOLD: Record<Tetromino, string> = {
  [Tetromino.NONE]: 'transparent',
  [Tetromino.I]: '#fef08a', // yellow-200 champagne
  [Tetromino.J]: '#fde047', // yellow-300 light gold
  [Tetromino.L]: '#facc15', // yellow-400 rich gold
  [Tetromino.O]: '#eab308', // amber-500 amber gold
  [Tetromino.S]: '#ca8a04', // yellow-600 bronze gold
  [Tetromino.T]: '#d97706', // amber-600 imperial amber
  [Tetromino.Z]: '#b45309', // amber-700 deep honey
  [Tetromino.GARBAGE]: '#78716c' // stone-500
};

export const TETROMINO_COLORS_OCEAN: Record<Tetromino, string> = {
  [Tetromino.NONE]: 'transparent',
  [Tetromino.I]: '#38bdf8', // sky-400 ice blue
  [Tetromino.J]: '#0284c7', // sky-600 deep cobalt
  [Tetromino.L]: '#06b6d4', // cyan-500 electric cyan
  [Tetromino.O]: '#22d3ee', // cyan-400 neon cyan
  [Tetromino.S]: '#0ea5e9', // sky-500 azure
  [Tetromino.T]: '#2563eb', // blue-600 royal blue
  [Tetromino.Z]: '#0891b2', // cyan-600 glacier blue
  [Tetromino.GARBAGE]: '#475569' // slate-600
};

export const TETROMINO_THEMES: Record<TetrisColorTheme, Record<Tetromino, string>> = {
  crystal: TETROMINO_COLORS_CRYSTAL,
  gold: TETROMINO_COLORS_GOLD,
  ocean: TETROMINO_COLORS_OCEAN
};

export const TETROMINO_COLORS = TETROMINO_COLORS_CRYSTAL;

export const TETROMINO_SHAPES: Record<Tetromino, number[][]> = {
  [Tetromino.NONE]: [],
  [Tetromino.I]: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [Tetromino.J]: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  [Tetromino.L]: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  [Tetromino.O]: [
    [4, 4],
    [4, 4],
  ],
  [Tetromino.S]: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  [Tetromino.T]: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  [Tetromino.Z]: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
  [Tetromino.GARBAGE]: []
};

export interface Piece {
  x: number;
  y: number;
  shape: number[][];
  type: Tetromino;
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let y = 0; y < N; ++y) {
    for (let x = 0; x < N; ++x) {
      result[x][N - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

export function getEmptyGrid(): number[][] {
  return Array.from({ length: TETRIS_ROWS }, () => new Array(TETRIS_COLS).fill(Tetromino.NONE));
}
