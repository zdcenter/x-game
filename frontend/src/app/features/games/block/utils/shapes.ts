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

export function getRandomShapes(count: number): BlockShape[] {
  const result: BlockShape[] = [];
  for (let i = 0; i < count; i++) {
    const randomIdx = Math.floor(Math.random() * BLOCK_SHAPES.length);
    // Deep clone to avoid mutating original templates
    const shape = BLOCK_SHAPES[randomIdx];
    result.push({
      id: shape.id,
      color: shape.color,
      matrix: shape.matrix.map(row => [...row])
    });
  }
  return result;
}
