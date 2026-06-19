export interface BlockShape {
  id: number;
  matrix: number[][]; // 1 for solid, 0 for empty
  color: string;      // Tailwind class or CSS var
}

// Standard 1010! shapes
export const BLOCK_SHAPES: BlockShape[] = [
  // 1x1
  { id: 1, color: 'bg-red-500', matrix: [[1]] },
  
  // 2x2
  { id: 2, color: 'bg-yellow-400', matrix: [[1,1], [1,1]] },
  
  // 3x3
  { id: 3, color: 'bg-orange-500', matrix: [[1,1,1], [1,1,1], [1,1,1]] },
  
  // Lines
  { id: 4, color: 'bg-green-400', matrix: [[1,1]] },
  { id: 5, color: 'bg-green-400', matrix: [[1],[1]] },
  { id: 6, color: 'bg-green-500', matrix: [[1,1,1]] },
  { id: 7, color: 'bg-green-500', matrix: [[1],[1],[1]] },
  { id: 8, color: 'bg-green-600', matrix: [[1,1,1,1]] },
  { id: 9, color: 'bg-green-600', matrix: [[1],[1],[1],[1]] },
  { id: 10, color: 'bg-emerald-500', matrix: [[1,1,1,1,1]] },
  { id: 11, color: 'bg-emerald-500', matrix: [[1],[1],[1],[1],[1]] },
  
  // L-Shapes (small)
  { id: 12, color: 'bg-blue-400', matrix: [[1,0], [1,1]] },
  { id: 13, color: 'bg-blue-400', matrix: [[0,1], [1,1]] },
  { id: 14, color: 'bg-blue-400', matrix: [[1,1], [1,0]] },
  { id: 15, color: 'bg-blue-400', matrix: [[1,1], [0,1]] },
  
  // L-Shapes (large 3x3)
  { id: 16, color: 'bg-indigo-500', matrix: [[1,0,0], [1,0,0], [1,1,1]] },
  { id: 17, color: 'bg-indigo-500', matrix: [[0,0,1], [0,0,1], [1,1,1]] },
  { id: 18, color: 'bg-indigo-500', matrix: [[1,1,1], [1,0,0], [1,0,0]] },
  { id: 19, color: 'bg-indigo-500', matrix: [[1,1,1], [0,0,1], [0,0,1]] },
  
  // T-shapes or crosses are rarely in classic 1010!, but we can add them for fun
  { id: 20, color: 'bg-purple-500', matrix: [[1,1,1], [0,1,0], [0,1,0]] },
  { id: 21, color: 'bg-purple-500', matrix: [[0,1,0], [0,1,0], [1,1,1]] },
  { id: 22, color: 'bg-purple-500', matrix: [[1,0,0], [1,1,1], [1,0,0]] },
  { id: 23, color: 'bg-purple-500', matrix: [[0,0,1], [1,1,1], [0,0,1]] },
];

// Weight per shape (index = shape array position). Medium shapes (3-4 cells) appear most.
// Small (1-2 cells) and huge (5x1, 3x3) shapes are rarer to avoid frustration.
const SHAPE_WEIGHTS = [
  4,   // 1:  1×1        (1 cell)
  10,  // 2:  2×2        (4 cells)
  4,   // 3:  3×3        (9 cells)
  8,   // 4:  1×2
  8,   // 5:  2×1
  12,  // 6:  1×3
  12,  // 7:  3×1
  8,   // 8:  1×4
  8,   // 9:  4×1
  5,   // 10: 1×5
  5,   // 11: 5×1
  12,  // 12-15: small-L ×4
  12,
  12,
  12,
  7,   // 16-19: large-L ×4
  7,
  7,
  7,
  6,   // 20-23: T/cross ×4
  6,
  6,
  6,
];

const WEIGHT_TOTAL = SHAPE_WEIGHTS.reduce((s, w) => s + w, 0);

function weightedRandomShape(): BlockShape {
  let r = Math.random() * WEIGHT_TOTAL;
  for (let i = 0; i < BLOCK_SHAPES.length; i++) {
    r -= SHAPE_WEIGHTS[i];
    if (r <= 0) return BLOCK_SHAPES[i];
  }
  return BLOCK_SHAPES[BLOCK_SHAPES.length - 1];
}

export function getRandomShapes(count: number): BlockShape[] {
  const result: BlockShape[] = [];
  for (let i = 0; i < count; i++) {
    const shape = weightedRandomShape();
    result.push({
      id: shape.id,
      color: shape.color,
      matrix: shape.matrix.map(row => [...row])
    });
  }
  return result;
}
