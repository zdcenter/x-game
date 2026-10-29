import { describe, it, expect, beforeEach } from 'vitest';
import { Classic2048Engine } from './classic2048-engine';

describe('Classic2048Engine', () => {
  let engine: Classic2048Engine;

  beforeEach(() => {
    engine = new Classic2048Engine();
  });

  it('should initialize a 4x4 board with 2 random tiles', () => {
    engine.initGame({ difficulty: 'medium' });
    expect(engine.boardSize).toBe(4);
    expect(engine.status).toBe('playing');
    expect(engine.score).toBe(0);
    expect(engine.moves).toBe(0);

    let nonZeroCount = 0;
    for (const row of engine.cells) {
      for (const val of row) {
        if (val > 0) nonZeroCount++;
      }
    }
    expect(nonZeroCount).toBe(2);
  });

  it('should merge identical adjacent tiles and increase score upon move', () => {
    engine.initGame({ difficulty: 'medium' });
    // Manually set row: [2, 2, 0, 0]
    engine.cells = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    engine.score = 0;

    const moved = engine.handleAction({ action: 'move', dir: 'left' });
    expect(moved).toBe(true);
    // Merged: 2+2=4 at column 0
    expect(engine.cells[0][0]).toBe(4);
    expect(engine.score).toBe(4);
    expect(engine.moves).toBe(1);
    expect(engine.history.length).toBe(1);
  });

  it('should support undo to roll back board state and score', () => {
    engine.initGame({ difficulty: 'medium' });
    engine.cells = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    engine.score = 0;

    engine.handleAction({ action: 'move', dir: 'left' });
    expect(engine.score).toBe(4);
    expect(engine.moves).toBe(1);

    const undone = engine.handleAction({ action: 'undo' });
    expect(undone).toBe(true);
    expect(engine.cells[0][0]).toBe(2);
    expect(engine.cells[0][1]).toBe(2);
    expect(engine.score).toBe(0);
    expect(engine.moves).toBe(0);
  });
});
