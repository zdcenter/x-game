import { describe, it, expect, beforeEach } from 'vitest';
import { LocalTentsEngine, TentsCellState } from './tents-engine';
import { GameStatus } from '../../../../core/models/game.model';
import { TENTS_LEVELS, generateProceduralTents } from './tents-levels';

describe('LocalTentsEngine', () => {
  let engine: LocalTentsEngine;

  beforeEach(() => {
    engine = new LocalTentsEngine();
  });

  it('should initialize game state properly with procedural puzzle', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 0 });
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.moves).toBe(0);
    expect(engine.size).toBe(6);
    expect(engine.totalTrees).toBeGreaterThan(0);
    expect(engine.currentLevel.solution.length).toBe(engine.totalTrees);
  });

  it('should toggle cell states Empty -> Tent -> Empty on default click, and support explicit grass mode', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 0, seed: 1001 });
    let tr = 0, tc = 0;
    findEmpty: for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (engine.grid[r][c] === TentsCellState.Empty) {
          tr = r; tc = c;
          break findEmpty;
        }
      }
    }
    expect(engine.grid[tr][tc]).toBe(TentsCellState.Empty);

    // 点一下变帐篷
    engine.handleAction({ type: 'set_cell', row: tr, col: tc });
    expect(engine.grid[tr][tc]).toBe(TentsCellState.Tent);

    // 再点一下直接变回空格 (绝不在中间硬塞草丛折磨用户)
    engine.handleAction({ type: 'set_cell', row: tr, col: tc });
    expect(engine.grid[tr][tc]).toBe(TentsCellState.Empty);

    // 显式草丛画笔模式：草丛 ➔ 空格
    engine.handleAction({ type: 'set_cell', row: tr, col: tc, state: TentsCellState.Grass });
    expect(engine.grid[tr][tc]).toBe(TentsCellState.Grass);
    engine.handleAction({ type: 'set_cell', row: tr, col: tc, state: TentsCellState.Grass });
    expect(engine.grid[tr][tc]).toBe(TentsCellState.Empty);
  });

  it('should provide precise hint by illuminating a correct tent and correcting wrong tents', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 0, seed: 12345 });
    const sol = engine.currentLevel.solution[0];

    // 1. 正确点亮第 1 个帐篷
    engine.handleAction({ type: 'hint' });
    expect(engine.activeHint).not.toBeNull();
    expect(engine.activeHint?.text).toContain('已为您点亮');
    expect(engine.grid[sol.r][sol.c]).toBe(TentsCellState.Tent);

    // 2. 模拟用户放错了一个帐篷 (不在 solution 中且不是树)
    const solSet = new Set(engine.currentLevel.solution.map(s => `${s.r},${s.c}`));
    let wrongR = 0, wrongC = 0;
    for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (!solSet.has(`${r},${c}`) && engine.grid[r][c] === TentsCellState.Empty) {
          wrongR = r;
          wrongC = c;
          break;
        }
      }
    }
    engine.handleAction({ type: 'set_cell', row: wrongR, col: wrongC, state: TentsCellState.Tent });
    expect(engine.grid[wrongR][wrongC]).toBe(TentsCellState.Tent);

    // 再次点击提示：必须优先纠正清除该错误帐篷
    engine.handleAction({ type: 'hint' });
    expect(engine.activeHint?.text).toContain('帐篷放置有误，已帮您纠正清除');
    expect(engine.grid[wrongR][wrongC]).toBe(TentsCellState.Empty);
  });

  it('should detect tent conflicts when two tents touch', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 0, seed: 99 });
    engine.handleAction({ type: 'set_cell', row: 1, col: 1, state: TentsCellState.Tent });
    engine.handleAction({ type: 'set_cell', row: 1, col: 2, state: TentsCellState.Tent });

    expect(engine.tentConflicts.has('1,1')).toBe(true);
    expect(engine.tentConflicts.has('1,2')).toBe(true);
  });

  it('should support undo functionality', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 0, seed: 99 });
    const empty = engine.trees.some(t => t.r === 0 && t.c === 0) ? { r: 0, c: 1 } : { r: 0, c: 0 };
    engine.handleAction({ type: 'set_cell', row: empty.r, col: empty.c, state: TentsCellState.Tent });
    expect(engine.grid[empty.r][empty.c]).toBe(TentsCellState.Tent);

    engine.handleAction({ type: 'undo' });
    expect(engine.grid[empty.r][empty.c]).toBe(TentsCellState.Empty);
  });

  it('should correctly solve random procedural puzzle and trigger Finished status', () => {
    engine.initGame({ difficulty: 'easy', seed: 8888 });

    for (const tent of engine.currentLevel.solution) {
      engine.handleAction({ type: 'set_cell', row: tent.r, col: tent.c, state: TentsCellState.Tent });
    }

    expect(engine.placedTentsCount).toBe(engine.currentLevel.solution.length);
    expect(engine.tentConflicts.size).toBe(0);
    expect(engine.status).toBe(GameStatus.Finished);
    expect(engine.score).toBeGreaterThan(0);
  });

  it('should generate valid procedural levels that pass initial structure', () => {
    const puzzle = generateProceduralTents(6, 'easy', 42);
    expect(puzzle.size).toBe(6);
    expect(puzzle.trees.length).toBeGreaterThan(0);
    expect(puzzle.solution.length).toBe(puzzle.trees.length);
  });

  it('should progress smoothly from round to round via next_level', () => {
    // 初始第 1 局
    engine.initGame({ difficulty: 'easy', levelIndex: 0 });
    expect(engine.levelIndex).toBe(0);
    expect(engine.currentLevel.name).toBe('第 1 局');

    // 下一局 -> 第 2 局
    engine.handleAction({ type: 'next_level' });
    expect(engine.levelIndex).toBe(1);
    expect(engine.currentLevel.name).toBe('第 2 局');
    expect(engine.totalTrees).toBeGreaterThan(0);

    // 下一局 -> 第 3 局
    engine.handleAction({ type: 'next_level' });
    expect(engine.levelIndex).toBe(2);
    expect(engine.currentLevel.name).toBe('第 3 局');
  });

  it('should reset current level puzzle and moves without altering levelIndex', () => {
    engine.initGame({ difficulty: 'easy', levelIndex: 2 });
    const empty = engine.trees.some(t => t.r === 0 && t.c === 0) ? { r: 0, c: 1 } : { r: 0, c: 0 };
    engine.handleAction({ type: 'set_cell', row: empty.r, col: empty.c, state: TentsCellState.Tent });
    expect(engine.moves).toBe(1);

    engine.handleAction({ type: 'reset' });
    expect(engine.levelIndex).toBe(2);
    expect(engine.moves).toBe(0);
    expect(engine.grid[empty.r][empty.c]).toBe(TentsCellState.Empty);
  });

  it('should generate PK fair board when seed is provided', () => {
    engine.initGame({ difficulty: 'medium', seed: 998877 });
    expect(engine.currentLevel.name).toBe('竞技对决');
    expect(engine.size).toBe(8);
    expect(engine.totalTrees).toBeGreaterThan(0);
  });
});
