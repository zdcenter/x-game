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
});
