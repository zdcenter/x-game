import { describe, it, expect } from 'vitest';
import { HexaEngine } from './hexa-engine';
import { GameStatus } from '../../../../core/models/game.model';

describe('HexaEngine', () => {
  it('should initialize board with 61 empty cells', () => {
    const engine = new HexaEngine();
    engine.initGame();
    expect(engine.cells.size).toBe(61);
    expect(engine.score).toBe(0);
    expect(engine.gameOver).toBe(false);
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.availablePieces.length).toBe(3);
    for (const cell of engine.cells.values()) {
      expect(cell.filled).toBe(false);
    }
  });

  it('should clear board, reset gameOver and score on restart after deadlock', () => {
    const engine = new HexaEngine();
    engine.initGame();

    // Fill all cells to trigger deadlock
    for (const cell of engine.cells.values()) {
      cell.filled = true;
    }
    const isDeadlock = (engine as any).checkGameOver();
    expect(isDeadlock).toBe(true);
    engine.gameOver = true;
    engine.status = GameStatus.Finished;

    // Restart game
    engine.initGame();
    expect(engine.gameOver).toBe(false);
    expect(engine.score).toBe(0);
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.cells.size).toBe(61);
    for (const cell of engine.cells.values()) {
      expect(cell.filled).toBe(false);
    }
    expect(engine.availablePieces.length).toBe(3);
  });

  it('should use 3-piece triad lifecycle (slot becomes null, regenerates when all 3 used)', () => {
    const engine = new HexaEngine();
    engine.initGame({ seed: 12345 });

    const p0 = engine.availablePieces[0]!;
    expect(p0).not.toBeNull();

    // Place piece 0 at center (0,0,0)
    engine.handleAction({
      type: 'place_piece' as any,
      piece: p0,
      origin: { q: 0, r: 0, s: 0 },
      pieceIndex: 0
    });

    expect(engine.availablePieces[0]).toBeNull();
    expect(engine.availablePieces[1]).not.toBeNull();
    expect(engine.availablePieces[2]).not.toBeNull();

    const p1 = engine.availablePieces[1]!;
    // Place piece 1 at an open spot (e.g. q: -3, r: 0, s: 3)
    const canPlace1 = engine.canPlacePiece(p1, { q: -3, r: 0, s: 3 });
    if (canPlace1) {
      engine.handleAction({
        type: 'place_piece' as any,
        piece: p1,
        origin: { q: -3, r: 0, s: 3 },
        pieceIndex: 1
      });
      expect(engine.availablePieces[0]).toBeNull();
      expect(engine.availablePieces[1]).toBeNull();
      expect(engine.availablePieces[2]).not.toBeNull();
    }
  });

  it('should allow swapping pieces with new triad', () => {
    const engine = new HexaEngine();
    engine.initGame({ seed: 12345 });

    const initialPieceIds = engine.availablePieces.map(p => p?.id);
    const swapped = engine.swapPieces();
    expect(swapped).toBe(true);
    expect(engine.availablePieces.length).toBe(3);
    expect(engine.availablePieces.every(p => p !== null)).toBe(true);
  });
});
