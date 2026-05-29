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
