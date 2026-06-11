import { HexPiece } from './hexa-engine';

export const HEX_PIECES: HexPiece[] = [
  // Single dot (Red)
  { id: 'p1', color: 'url(#grad-red)', shape: [{ q: 0, r: 0, s: 0 }] },
  // Line of 2 (Blue)
  { id: 'p2_q', color: 'url(#grad-blue)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }] },
  { id: 'p2_r', color: 'url(#grad-blue)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'p2_s', color: 'url(#grad-blue)', shape: [{ q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }] },
  // Line of 3 (Blue)
  { id: 'p3_q', color: 'url(#grad-blue)', shape: [{ q: -1, r: 1, s: 0 }, { q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }] },
  { id: 'p3_r', color: 'url(#grad-blue)', shape: [{ q: 0, r: -1, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'p3_s', color: 'url(#grad-blue)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }] },
  // Line of 4 (Blue)
  { id: 'p4_q', color: 'url(#grad-blue)', shape: [{ q: -1, r: 1, s: 0 }, { q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 2, r: -2, s: 0 }] },
  { id: 'p4_r', color: 'url(#grad-blue)', shape: [{ q: 0, r: -1, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: 0, r: 2, s: -2 }] },
  { id: 'p4_s', color: 'url(#grad-blue)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 0, s: 0 }, { q: -1, r: 0, s: 1 }, { q: -2, r: 0, s: 2 }] },
  // Triangle (Amber)
  { id: 'pt_1', color: 'url(#grad-amber)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  { id: 'pt_2', color: 'url(#grad-amber)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 1, r: -1, s: 0 }] },
  // Diamond (Green)
  { id: 'pd_1', color: 'url(#grad-green)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -2, s: 1 }] },
  // V-Shape 3 (Pink)
  { id: 'pv_1', color: 'url(#grad-pink)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: 1, s: -1 }] },
  { id: 'pv_2', color: 'url(#grad-pink)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }] },
  { id: 'pv_3', color: 'url(#grad-pink)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 0, s: 1 }] },
  // Y-Shape 4 (Pink)
  { id: 'py_1', color: 'url(#grad-pink)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 0, s: 1 }] },
  { id: 'py_2', color: 'url(#grad-pink)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  // Trapezoid (Purple)
  { id: 'ptr_1', color: 'url(#grad-purple)', shape: [{ q: 0, r: 0, s: 0 }, { q: -1, r: 1, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 }] },
  { id: 'ptr_2', color: 'url(#grad-purple)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: -1, s: 1 }, { q: 0, r: 1, s: -1 }, { q: 1, r: 0, s: -1 }] },
  // Rhombus / Block 4 (Green)
  { id: 'pr_1', color: 'url(#grad-green)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }] },
  { id: 'pr_2', color: 'url(#grad-green)', shape: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }] },
  { id: 'pr_3', color: 'url(#grad-green)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: 1, s: -1 }] },
  // C-Shape / Arch (Purple)
  { id: 'pc_1', color: 'url(#grad-purple)', shape: [{ q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }] },
  { id: 'pc_2', color: 'url(#grad-purple)', shape: [{ q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }] },
  { id: 'pc_3', color: 'url(#grad-purple)', shape: [{ q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }] },
  // Big Hexagon (Red)
  { id: 'ph_1', color: 'url(#grad-red)', shape: [{ q: 0, r: 0, s: 0 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 }] },
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
