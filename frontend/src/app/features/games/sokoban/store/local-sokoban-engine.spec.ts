import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSokobanEngine, SokobanActionType } from './local-sokoban-engine';
import { GameStatus } from '../../../../core/models/game.model';

describe('LocalSokobanEngine', () => {
  let engine: LocalSokobanEngine;

  // Simple test level:
  // ######
  // #@  $.#
  // ######
  // @: player, $: box, .: target, #: wall
  const simpleLevel = '######\n#@  $.#\n######';

  beforeEach(() => {
    engine = new LocalSokobanEngine('test-1', 'easy', simpleLevel);
  });

  it('should parse level string correctly into board grid and find player position', () => {
    expect(engine.board.length).toBe(3);
    expect(engine.board[1][1]).toBe('@');
    expect(engine.board[1][4]).toBe('$');
    expect(engine.board[1][5]).toBe('.');
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.moves).toBe(0);
  });

  it('should support undo to reverse player move during playing state', () => {
    // Player moves right into empty space
    engine.handleAction({ type: SokobanActionType.Move, dir: 'right' });
    expect(engine.moves).toBe(1);
    expect(engine.board[1][1]).toBe(' ');
    expect(engine.board[1][2]).toBe('@');
    expect(engine.status).toBe(GameStatus.Playing);

    // Undo
    engine.handleAction({ type: SokobanActionType.Undo });
    expect(engine.moves).toBe(0);
    expect(engine.board[1][1]).toBe('@');
    expect(engine.board[1][2]).toBe(' ');
  });

  it('should push a box into the target and trigger victory condition', () => {
    // Move right twice towards the box
    engine.handleAction({ type: SokobanActionType.Move, dir: 'right' });
    engine.handleAction({ type: SokobanActionType.Move, dir: 'right' });
    // Push box into target
    engine.handleAction({ type: SokobanActionType.Move, dir: 'right' });

    expect(engine.board[1][5]).toBe('*'); // Box on target ($ + . = *)
    expect(engine.status).toBe(GameStatus.Finished); // Won!
  });

  it('should block movement when walking into a wall', () => {
    // Move up into wall #
    engine.handleAction({ type: SokobanActionType.Move, dir: 'up' });
    expect(engine.moves).toBe(0);
    expect(engine.board[1][1]).toBe('@');
  });
});
