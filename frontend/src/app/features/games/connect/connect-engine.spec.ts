import { describe, it, expect } from 'vitest';
import { ConnectEngine, normalizeConnectPuzzle } from './connect-engine';

describe('ConnectEngine & normalizeConnectPuzzle', () => {
  it('should safely normalize array format endpoints [x, y] / [col, row] used in PK and database seeds', () => {
    const raw = {
      id: 'CONNECT-TEST-001',
      width: 5,
      height: 5,
      endpoints: [
        { color: 1, p1: [1, 0], p2: [3, 4] },
        { color: 2, p1: [3, 1], p2: [0, 2] }
      ],
      blocks: [[2, 2]]
    };

    const puzzle = normalizeConnectPuzzle(raw);
    expect(puzzle.id).toBe('CONNECT-TEST-001');
    expect(puzzle.width).toBe(5);
    expect(puzzle.height).toBe(5);
    expect(puzzle.endpoints.length).toBe(2);
    // [col 1, row 0] -> { c: 1, r: 0 }
    expect(puzzle.endpoints[0].p1).toEqual({ c: 1, r: 0 });
    expect(puzzle.endpoints[0].p2).toEqual({ c: 3, r: 4 });
    expect(puzzle.blocks?.[0]).toEqual({ c: 2, r: 2 });
  });

  it('should instantiate ConnectEngine without crashing when given raw PK puzzle payload', () => {
    const rawPkPayload = {
      id: 'PK-CONNECT-01',
      width: 5,
      height: 5,
      endpoints: [
        { color: 1, p1: [1, 0], p2: [3, 4] },
        { color: 2, p1: [3, 1], p2: [0, 2] },
        { color: 3, p1: [0, 0], p2: [2, 2] },
        { color: 4, p1: [0, 3], p2: [2, 4] }
      ]
    };

    const engine = new ConnectEngine(rawPkPayload as any);
    expect(engine.width).toBe(5);
    expect(engine.height).toBe(5);
    expect(engine.grid.length).toBe(5);
    expect(engine.grid[0].length).toBe(5);

    // Verify endpoints placed in grid
    // color 1 at p1: [1, 0] -> row 0, col 1
    expect(engine.grid[0][1]).toBe(1);
    // color 1 at p2: [3, 4] -> row 4, col 3
    expect(engine.grid[4][3]).toBe(1);
    // color 3 at [0, 0] -> row 0, col 0
    expect(engine.grid[0][0]).toBe(3);

    expect(engine.isEndpoint(0, 1)).toBe(true);
    expect(engine.isEndpoint(4, 3)).toBe(true);
    expect(engine.isEndpointOfColor(0, 1, 1)).toBe(true);
    expect(engine.isSolved()).toBe(false);
  });

  it('should safely normalize JSON string endpoints and flat endpoints format', () => {
    const jsonStrPayload = JSON.stringify({
      width: 4,
      height: 4,
      endpoints: JSON.stringify([
        { r: 0, c: 0, color: 1 },
        { r: 3, c: 3, color: 1 }
      ])
    });

    const puzzle = normalizeConnectPuzzle(jsonStrPayload);
    expect(puzzle.width).toBe(4);
    expect(puzzle.endpoints.length).toBe(1);
    expect(puzzle.endpoints[0].color).toBe(1);
    expect(puzzle.endpoints[0].p1).toEqual({ r: 0, c: 0 });
    expect(puzzle.endpoints[0].p2).toEqual({ r: 3, c: 3 });

    const engine = new ConnectEngine(puzzle);
    expect(engine.grid[0][0]).toBe(1);
    expect(engine.grid[3][3]).toBe(1);
  });

  it('should export paths and load paths seamlessly for spectator real-time viewing', () => {
    const raw = {
      width: 5,
      height: 5,
      endpoints: [
        { color: 1, p1: [0, 0], p2: [0, 2] }
      ]
    };

    const playerEngine = new ConnectEngine(raw as any);
    // Draw pipe from (0, 0) to (0, 1) to (0, 2)
    playerEngine.drawTo(0, 1, 1);
    playerEngine.drawTo(0, 2, 1);
    expect(playerEngine.grid[0][1]).toBe(1);
    expect(playerEngine.hasPath(1)).toBe(true);

    const exported = playerEngine.exportPaths();
    expect(exported[1].length).toBe(3);

    // Spectator engine loads the player's paths
    const spectatorEngine = new ConnectEngine(raw as any);
    expect(spectatorEngine.grid[0][1]).toBe(0);

    spectatorEngine.loadPaths(exported);
    expect(spectatorEngine.grid[0][1]).toBe(1);
    expect(spectatorEngine.paths.get(1)?.length).toBe(3);
  });
});
