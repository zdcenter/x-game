import { describe, it, expect, beforeEach } from 'vitest';
import { GAME_DEFINITIONS } from './game-definitions';
import { GameDifficulty, GameId, GameMode } from '../models/game.model';
import { GameRegistryService } from '../services/game-registry.service';

describe('Game Definitions & Registry Integrity (游戏元数据完整性与架构守卫)', () => {
  it('should have all games properly registered with unique IDs', () => {
    expect(GAME_DEFINITIONS.length).toBeGreaterThanOrEqual(19);
    const seenIds = new Set<string>();
    for (const def of GAME_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(seenIds.has(def.id)).toBe(false);
      seenIds.add(def.id);
    }
  });

  it('every game MUST have valid route, titleKey, iconEmoji, and loadComponent', () => {
    for (const def of GAME_DEFINITIONS) {
      expect(def.route).toMatch(/^\/games\/[a-z0-9_]+$/);
      expect(def.titleKey).toBeTruthy();
      expect(def.iconEmoji).toBeTruthy();
      expect(typeof def.loadComponent).toBe('function');
    }
  });

  it('every game MUST have at least 1 mode, including Single and PK modes', () => {
    for (const def of GAME_DEFINITIONS) {
      expect(def.modes).toBeDefined();
      expect(def.modes.length).toBeGreaterThanOrEqual(1);
      const hasSingle = def.modes.some(m => m.id === GameMode.Single);
      expect(hasSingle, `Game ${def.id} is missing GameMode.Single`).toBe(true);
    }
  });

  it('every game MUST have at least 1 difficulty with valid id and labelKey', () => {
    for (const def of GAME_DEFINITIONS) {
      expect(def.difficulties).toBeDefined();
      expect(def.difficulties.length, `Game ${def.id} has empty difficulties array`).toBeGreaterThanOrEqual(1);
      for (const diff of def.difficulties) {
        expect(diff.id).toBeTruthy();
        expect(diff.labelKey).toBeTruthy();
      }
    }
  });

  describe('GameRegistryService Golden Guard', () => {
    let service: GameRegistryService;
    beforeEach(() => {
      service = new GameRegistryService({} as any);
    });

    it('should automatically provide default modes if registered with empty modes', () => {
      service.register({
        id: 'test_game_no_modes',
        route: '/games/test',
        titleKey: 'test',
        iconEmoji: '🧪',
        modes: [] as any,
        difficulties: [{ id: 'easy', labelKey: 'game.diff_easy' }] as any
      });
      const cfg = service.getConfig('test_game_no_modes');
      expect(cfg).toBeDefined();
      expect(cfg!.modes.length).toBeGreaterThan(0);
      expect(cfg!.modes[0].id).toBe(GameMode.Single);
    });

    it('should automatically provide default difficulties if registered with empty difficulties', () => {
      service.register({
        id: 'test_game_no_diff',
        route: '/games/test',
        titleKey: 'test',
        iconEmoji: '🧪',
        modes: [{ id: GameMode.Single, labelKey: 'single' }] as any,
        difficulties: [] as any
      });
      const cfg = service.getConfig('test_game_no_diff');
      expect(cfg).toBeDefined();
      expect(cfg!.difficulties.length).toBeGreaterThan(0);
      expect(cfg!.difficulties[0].id).toBe(GameDifficulty.Medium);
    });
  });
});
