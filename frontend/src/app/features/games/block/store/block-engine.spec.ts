import { describe, it, expect } from 'vitest';
import { BlockEngine, BlockActionType } from './block-engine';
import { GameStatus } from '../../../../core/models/game.model';

describe('BlockEngine', () => {
  it('should detect game over when no pieces can be placed', () => {
    const engine = new BlockEngine();
    engine.initGame({ difficulty: 'easy' }); // 8x8 board

    // Fill almost the entire board so nothing can be placed
    for (let r = 0; r < engine.boardSize; r++) {
      for (let c = 0; c < engine.boardSize; c++) {
        engine.board[r][c] = 1;
      }
    }
    // leave no empty cells
    expect(engine.isDead).toBe(false);

    // Call checkGameOver
    (engine as any).checkGameOver();
    expect(engine.isDead).toBe(true);
    expect(engine.status).toBe(GameStatus.Finished);

    // Now restart game
    engine.initGame({ difficulty: 'easy' });
    expect(engine.isDead).toBe(false);
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.score).toBe(0);
    // Board must be fully cleared to 0
    const allZero = engine.board.every(row => row.every(cell => cell === 0));
    expect(allZero).toBe(true);
    // New hand must have 3 shapes
    expect(engine.hand.length).toBe(3);
    expect(engine.hand.every(shape => shape !== null)).toBe(true);
  });
});
