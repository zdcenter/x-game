import { describe, it, expect, beforeEach } from 'vitest';
import { LocalMinesweeperEngine, MinesweeperActionType } from './minesweeper-engine';
import { CellState } from './minesweeper.store';
import { GameStatus } from '../../../../core/models/game.model';

describe('LocalMinesweeperEngine', () => {
  let engine: LocalMinesweeperEngine;

  beforeEach(() => {
    engine = new LocalMinesweeperEngine();
  });

  it('should initialize a clean board with correct dimensions and mine count', () => {
    engine.initGame({ width: 9, height: 9, mines: 10 });
    expect(engine.width).toBe(9);
    expect(engine.height).toBe(9);
    expect(engine.mines).toBe(10);
    expect(engine.revealedCnt).toBe(0);
    expect(engine.isMinesPlaced).toBe(false);
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.cells.length).toBe(9);
    expect(engine.cells[0].length).toBe(9);

    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        expect(engine.cells[y][x].state).toBe(CellState.Hidden);
        expect((engine.cells[y][x] as any).isMine).toBe(false);
      }
    }
  });

  it('guarantees first click is 100% safe (First-Click Safe Rule)', () => {
    for (let run = 0; run < 10; run++) {
      const testEngine = new LocalMinesweeperEngine();
      testEngine.initGame({ width: 9, height: 9, mines: 10 });

      const clickX = 4;
      const clickY = 4;
      testEngine.handleAction({ type: MinesweeperActionType.Reveal, x: clickX, y: clickY });

      // First clicked cell must never be a mine and must not explode
      expect((testEngine.cells[clickY][clickX] as any).isMine).toBe(false);
      expect(testEngine.cells[clickY][clickX].state).toBe(CellState.Revealed);
      expect(testEngine.status).toBe(GameStatus.Playing);
      expect(testEngine.isMinesPlaced).toBe(true);
    }
  });

  it('toggles flag correctly and prevents revealing flagged cells', () => {
    engine.initGame({ width: 5, height: 5, mines: 3 });
    // Flag (1, 1)
    engine.handleAction({ type: MinesweeperActionType.Flag, x: 1, y: 1 });
    expect(engine.cells[1][1].state).toBe(CellState.Flagged);

    // Revealing a flagged cell must be blocked
    engine.handleAction({ type: MinesweeperActionType.Reveal, x: 1, y: 1 });
    expect(engine.cells[1][1].state).toBe(CellState.Flagged);

    // Unflag (1, 1)
    engine.handleAction({ type: MinesweeperActionType.Flag, x: 1, y: 1 });
    expect(engine.cells[1][1].state).toBe(CellState.Hidden);
  });

  it('handles tutorial board and win condition correctly', () => {
    engine.initTutorialBoard();
    expect(engine.width).toBe(5);
    expect(engine.height).toBe(5);
    expect(engine.mines).toBe(2);

    // Total safe cells = 25 - 2 = 23
    // Reveal all non-mine cells
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (!(engine.cells[y][x] as any).isMine) {
          engine.handleAction({ type: MinesweeperActionType.Reveal, x, y });
        }
      }
    }

    expect(engine.status).toBe(GameStatus.Finished);
    expect(engine.revealedCnt).toBe(23);
  });

  it('performs Chording correctly when surrounding flags match cell neighbors', () => {
    // Use tutorial board: mines at (1,1) and (3,2)
    engine.initTutorialBoard();
    // Reveal (0,0), neighbors = 1 (since mine is at 1,1)
    engine.handleAction({ type: MinesweeperActionType.Reveal, x: 0, y: 0 });
    expect(engine.cells[0][0].state).toBe(CellState.Revealed);
    expect(engine.cells[0][0].neighbors).toBe(1);

    // Flag the mine at (1,1)
    engine.handleAction({ type: MinesweeperActionType.Flag, x: 1, y: 1 });
    expect(engine.cells[1][1].state).toBe(CellState.Flagged);

    // Now neighbors count around (0,0) is 1, and flagged count is 1
    // Clicking/chording on (0,0) should sweep (1,0) and (0,1)
    engine.handleAction({ type: MinesweeperActionType.Reveal, x: 0, y: 0 });
    expect(engine.cells[0][1].state).toBe(CellState.Revealed);
    expect(engine.cells[1][0].state).toBe(CellState.Revealed);
  });
});
