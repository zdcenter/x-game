import { HexPiece } from './hexa-engine';

export const HEX_PIECES: HexPiece[] = [
  // Single dot
  { id: 'p1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }] },
  // Line of 2
  { id: 'p2_q', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }] },
  { id: 'p2_r', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'p2_s', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }] },
  // Line of 3
  { id: 'p3_q', color: 'var(--color-accent-from)', shape: [{ q: -1, r: 1, s: 0 }, { q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }] },
  { id: 'p3_r', color: 'var(--color-accent-from)', shape: [{ q: 0, r: -1, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'p3_s', color: 'var(--color-accent-from)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }] },
  // Line of 4
  { id: 'p4_q', color: 'var(--color-accent-from)', shape: [{ q: -1, r: 1, s: 0 }, { q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 2, r: -2, s: 0 }] },
  { id: 'p4_r', color: 'var(--color-accent-from)', shape: [{ q: 0, r: -1, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: 0, r: 2, s: -2 }] },
  { id: 'p4_s', color: 'var(--color-accent-from)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }, { q: -2, r: 0, s: 2 }] },
  // Triangle
  { id: 'pt_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  { id: 'pt_2', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 1, r: -1, s: 0 }] },
  // Diamond
  { id: 'pd_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -2, s: 1 }] },
  // V-Shape (3 hexes)
  { id: 'pv_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'pv_2', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }] },
  { id: 'pv_3', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 0, s: 1 }] },
  // Y-Shape (4 hexes)
  { id: 'py_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 0, s: 1 }] },
  { id: 'py_2', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  // Trapezoid (4 hexes)
  { id: 'ptr_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: -1, r: 1, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  { id: 'ptr_2', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: -1, s: 1 }, { q: 0, r: 1, s: -1 }, { q: 1, r: 0, s: -1 }] },
  // Rhombus / Block of 4 (2x2 compact)
  { id: 'pr_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }] },
  { id: 'pr_2', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }] },
  { id: 'pr_3', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: 1, s: -1 }] },
  // C-Shape / Arch (4 hexes forming a half-ring)
  { id: 'pc_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }] },
  { id: 'pc_2', color: 'var(--color-accent-from)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }] },
  { id: 'pc_3', color: 'var(--color-accent-from)', shape: [{ q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }] },
  // Big Hexagon (7 hexes)
  { id: 'ph_1', color: 'var(--color-accent-from)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 }] },
];

export function getRandomPiece(prng?: { next: () => number }): HexPiece {
  const r = prng ? prng.next() : Math.random();
  const index = Math.floor(r * HEX_PIECES.length);
  return HEX_PIECES[index];
}

export function generatePieces(count: number, prng?: { next: () => number }): HexPiece[] {
  const pieces: HexPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push(getRandomPiece(prng));
  }
  return pieces;
}
