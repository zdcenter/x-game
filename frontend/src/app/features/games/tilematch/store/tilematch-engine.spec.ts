import { describe, it, expect, beforeEach } from 'vitest';
import { LocalTilematchEngine } from './tilematch-engine';
import { GameDifficulty, GameStatus } from '../../../../core/models/game.model';

describe('LocalTilematchEngine', () => {
  let engine: LocalTilematchEngine;

  beforeEach(() => {
    engine = new LocalTilematchEngine();
  });

  it('should initialize game with cards whose counts are multiples of 3', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    const state = engine.getState();

    expect(state.status).toBe(GameStatus.Playing);
    expect(state.cards.length).toBeGreaterThan(0);
    expect(state.cards.length % 3).toBe(0);

    // 统计每种图案是否为 3 的倍数
    const counts: Record<string, number> = {};
    for (const card of state.cards) {
      counts[card.type] = (counts[card.type] || 0) + 1;
    }
    for (const type of Object.keys(counts)) {
      expect(counts[type] % 3).toBe(0);
    }

    // 验证每一张卡牌的 (x, y, layer) 都是唯一的，绝无死锁重合
    const coordSet = new Set<string>();
    for (const card of state.cards) {
      const key = `${card.x},${card.y},${card.layer}`;
      expect(coordSet.has(key)).toBe(false);
      coordSet.add(key);
    }

    // 验证开局至少拥有 4 张以上高亮未遮挡卡牌
    const unblockedCount = state.cards.filter(c => !c.isBlocked).length;
    expect(unblockedCount).toBeGreaterThanOrEqual(4);
  });

  it('should initialize Medium and Hard difficulty with correct counts and unique coordinates', () => {
    // Medium (60 tiles)
    engine.initGame({ difficulty: GameDifficulty.Medium });
    const medState = engine.getState();
    expect(medState.cards.length).toBe(60);
    expect(medState.cards.length % 3).toBe(0);
    const medCoords = new Set<string>();
    for (const card of medState.cards) {
      const key = `${card.x},${card.y},${card.layer}`;
      expect(medCoords.has(key)).toBe(false);
      medCoords.add(key);
    }
    expect(medState.cards.filter(c => !c.isBlocked).length).toBeGreaterThanOrEqual(4);

    // Hard (96 tiles)
    engine.initGame({ difficulty: GameDifficulty.Hard });
    const hardState = engine.getState();
    expect(hardState.cards.length).toBe(96);
    expect(hardState.cards.length % 3).toBe(0);
    const hardCoords = new Set<string>();
    for (const card of hardState.cards) {
      const key = `${card.x},${card.y},${card.layer}`;
      expect(hardCoords.has(key)).toBe(false);
      hardCoords.add(key);
    }
    expect(hardState.cards.filter(c => !c.isBlocked).length).toBeGreaterThanOrEqual(4);
  });

  it('should accurately detect AABB overlapping occlusion between layers', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    // 人为构造两张重叠卡牌
    engine.cards = [
      { id: 1, type: 'carrot', x: 2, y: 2, layer: 0, isBlocked: false, status: 'board' },
      { id: 2, type: 'bell', x: 2.5, y: 2.5, layer: 1, isBlocked: false, status: 'board' },
      { id: 3, type: 'sheep', x: 10, y: 10, layer: 0, isBlocked: false, status: 'board' },
    ];
    engine.updateBlockedStatus();

    const c1 = engine.cards.find(c => c.id === 1)!;
    const c2 = engine.cards.find(c => c.id === 2)!;
    const c3 = engine.cards.find(c => c.id === 3)!;

    expect(c1.isBlocked).toBe(true); // 被 c2 遮挡
    expect(c2.isBlocked).toBe(false); // 最顶层未被遮挡
    expect(c3.isBlocked).toBe(false); // 孤立未被遮挡
  });

  it('should reject clicking blocked card and accept unblocked card into slot', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    engine.cards = [
      { id: 1, type: 'carrot', x: 2, y: 2, layer: 0, isBlocked: false, status: 'board' },
      { id: 2, type: 'bell', x: 2, y: 2, layer: 1, isBlocked: false, status: 'board' },
    ];
    engine.updateBlockedStatus();

    // 点击被遮挡的底层卡牌 1，无效
    engine.handleAction({ type: 'select_tile', cardId: 1 });
    expect(engine.slot.length).toBe(0);

    // 点击顶层卡牌 2，成功入槽，且底层卡牌 1 自动解除遮挡
    engine.handleAction({ type: 'select_tile', cardId: 2 });
    expect(engine.slot.length).toBe(1);
    expect(engine.slot[0].id).toBe(2);

    const c1 = engine.cards.find(c => c.id === 1)!;
    expect(c1.isBlocked).toBe(false);
  });

  it('should auto cluster identical tiles and trigger match-3 clearance', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    engine.cards = [
      { id: 1, type: 'carrot', x: 0, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 2, type: 'bell', x: 4, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 3, type: 'carrot', x: 8, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 4, type: 'carrot', x: 12, y: 0, layer: 0, isBlocked: false, status: 'board' },
    ];

    engine.handleAction({ type: 'select_tile', cardId: 1 }); // slot: [carrot]
    engine.handleAction({ type: 'select_tile', cardId: 2 }); // slot: [carrot, bell]
    expect(engine.slot.map(c => c.type)).toEqual(['carrot', 'bell']);

    engine.handleAction({ type: 'select_tile', cardId: 3 }); // slot: [carrot, carrot, bell]
    expect(engine.slot.map(c => c.type)).toEqual(['carrot', 'carrot', 'bell']);

    // 选入第 3 个 carrot，触发 3 消
    engine.handleAction({ type: 'select_tile', cardId: 4 });
    // carrot 被消除，槽内仅剩 bell
    expect(engine.slot.length).toBe(1);
    expect(engine.slot[0].type).toBe('bell');
    expect(engine.score).toBeGreaterThan(0);
    expect(engine.combo).toBe(1);
  });

  it('should fail when slot fills up to 7 without matches', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    // 7 张互不相同的牌
    engine.cards = [
      { id: 1, type: 'carrot', x: 0, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 2, type: 'bell', x: 4, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 3, type: 'sheep', x: 8, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 4, type: 'wool', x: 12, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 5, type: 'apple', x: 16, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 6, type: 'corn', x: 20, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 7, type: 'milk', x: 24, y: 0, layer: 0, isBlocked: false, status: 'board' },
    ];

    for (let i = 1; i <= 7; i++) {
      engine.handleAction({ type: 'select_tile', cardId: i });
    }

    expect(engine.slot.length).toBe(7);
    expect(engine.status).toBe(GameStatus.Finished);
    expect(engine.isVictory).toBe(false);
  });

  it('should support powerups: stash, undo and shuffle', () => {
    engine.initGame({ difficulty: GameDifficulty.Easy });
    engine.cards = [
      { id: 1, type: 'carrot', x: 0, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 2, type: 'bell', x: 4, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 3, type: 'sheep', x: 8, y: 0, layer: 0, isBlocked: false, status: 'board' },
      { id: 4, type: 'apple', x: 12, y: 0, layer: 0, isBlocked: false, status: 'board' },
    ];

    // 1. 测试 Undo 撤销
    engine.handleAction({ type: 'select_tile', cardId: 1 });
    expect(engine.slot.length).toBe(1);
    engine.handleAction({ type: 'use_undo' });
    expect(engine.slot.length).toBe(0);
    expect(engine.cards.find(c => c.id === 1)!.status).toBe('board');

    // 2. 测试 Stash 移出暂存
    engine.handleAction({ type: 'select_tile', cardId: 1 });
    engine.handleAction({ type: 'select_tile', cardId: 2 });
    expect(engine.slot.length).toBe(2);
    engine.handleAction({ type: 'use_stash' });
    expect(engine.slot.length).toBe(0);
    expect(engine.stash.length).toBe(2);

    // 点回暂存区牌
    engine.handleAction({ type: 'select_stash_tile', cardId: 1 });
    expect(engine.slot.length).toBe(1);
    expect(engine.stash.length).toBe(1);

    // 3. 测试 Shuffle 打乱
    const initialTypes = engine.cards.filter(c => c.status === 'board').map(c => c.type);
    expect(initialTypes.length).toBeGreaterThan(0);
    engine.handleAction({ type: 'use_shuffle' });
    expect(engine.shuffleRemaining).toBe(1);
  });

  it('should scale total cards by +3 per level smoothly in endless mode', () => {
    // Level 1: 18 cards
    engine.initGame({ level: 1 });
    expect(engine.level).toBe(1);
    expect(engine.totalCards).toBe(18);
    expect(engine.cards.length).toBe(18);
    expect(engine.difficulty).toBe(GameDifficulty.Easy);

    // Level 2: 21 cards
    engine.initGame({ level: 2 });
    expect(engine.level).toBe(2);
    expect(engine.totalCards).toBe(21);
    expect(engine.cards.length).toBe(21);

    // Level 5: 30 cards
    engine.initGame({ level: 5 });
    expect(engine.totalCards).toBe(30);
    expect(engine.cards.length).toBe(30);

    // Level 15: 60 cards -> Medium
    engine.initGame({ level: 15 });
    expect(engine.totalCards).toBe(60);
    expect(engine.difficulty).toBe(GameDifficulty.Medium);

    // Level 27: 96 cards -> Hard
    engine.initGame({ level: 27 });
    expect(engine.totalCards).toBe(96);
    expect(engine.difficulty).toBe(GameDifficulty.Hard);
  });

  it('should generate identical board cards for two engines with the same seed', () => {
    const e1 = new LocalTilematchEngine();
    const e2 = new LocalTilematchEngine();
    e1.initGame({ level: 15, difficulty: GameDifficulty.Medium, seed: 12345 });
    e2.initGame({ level: 15, difficulty: GameDifficulty.Medium, seed: 12345 });

    expect(e1.cards.length).toBe(e2.cards.length);
    for (let i = 0; i < e1.cards.length; i++) {
      expect(e1.cards[i].type).toBe(e2.cards[i].type);
      expect(e1.cards[i].x).toBe(e2.cards[i].x);
      expect(e1.cards[i].y).toBe(e2.cards[i].y);
      expect(e1.cards[i].layer).toBe(e2.cards[i].layer);
    }
  });

  it('should load authoritative server cards correctly', () => {
    const serverCards = [
      { id: 1, type: 'apple', x: 1, y: 1, layer: 0, isBlocked: false, status: 'board' as const },
      { id: 2, type: 'apple', x: 2, y: 1, layer: 0, isBlocked: false, status: 'board' as const },
      { id: 3, type: 'apple', x: 3, y: 1, layer: 0, isBlocked: false, status: 'board' as const },
    ];
    engine.loadCards(serverCards);
    expect(engine.cards.length).toBe(3);
    expect(engine.status).toBe(GameStatus.Playing);
    expect(engine.cards[0].type).toBe('apple');
    expect(engine.cards[0].isBlocked).toBe(false);
  });
});

