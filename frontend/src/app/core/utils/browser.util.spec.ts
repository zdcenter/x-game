import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedDifficulty,
  setSavedDifficulty,
  getSavedLevel,
  setSavedLevel
} from './browser.util';

describe('Browser Storage Utilities (游戏难度与关卡持久化)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default difficulty when no saved value exists', () => {
    expect(getSavedDifficulty('tents', 'easy')).toBe('easy');
    expect(getSavedDifficulty('minesweeper', 'medium')).toBe('medium');
  });

  it('should save and retrieve difficulty for any gameId', () => {
    setSavedDifficulty('tents', 'medium');
    expect(getSavedDifficulty('tents', 'easy')).toBe('medium');

    setSavedDifficulty('tents', 'hard');
    expect(getSavedDifficulty('tents', 'easy')).toBe('hard');
  });

  it('should support backwards compatible keys for legacy saves', () => {
    localStorage.setItem('sokoban_difficulty', 'hard');
    expect(getSavedDifficulty('sokoban', 'easy')).toBe('hard');

    localStorage.setItem('game_diff_minesweeper', 'expert');
    expect(getSavedDifficulty('minesweeper', 'easy')).toBe('expert');
  });

  it('should save and retrieve game level index', () => {
    expect(getSavedLevel('sokoban', 0)).toBe(0);

    setSavedLevel('sokoban', 5);
    expect(getSavedLevel('sokoban', 0)).toBe(5);

    setSavedLevel('tents', 12);
    expect(getSavedLevel('tents', 0)).toBe(12);
  });
});
