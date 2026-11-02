import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GAME_SHORTCUT_CATALOG, PwaService } from './pwa.service';
import { addRecentGame, getRecentGames, RECENT_GAMES_KEY } from '../utils/browser.util';

describe('PWA Dynamic App Shortcuts System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('GAME_SHORTCUT_CATALOG should have rich metadata for popular single player games', () => {
    expect(GAME_SHORTCUT_CATALOG['minesweeper']).toBeDefined();
    expect(GAME_SHORTCUT_CATALOG['minesweeper'].nameZh).toBe('经典扫雷');
    expect(GAME_SHORTCUT_CATALOG['minesweeper'].emoji).toBe('💣');

    expect(GAME_SHORTCUT_CATALOG['sudoku']).toBeDefined();
    expect(GAME_SHORTCUT_CATALOG['tilematch']).toBeDefined();
    expect(GAME_SHORTCUT_CATALOG['sliding']).toBeDefined();
    expect(GAME_SHORTCUT_CATALOG['classic2048']).toBeDefined();
  });

  it('addRecentGame should unshift new game and dispatch recent_games_updated event', () => {
    let eventFired = false;
    let eventDetail: any = null;

    const listener = (e: any) => {
      eventFired = true;
      eventDetail = e.detail;
    };

    window.addEventListener('recent_games_updated', listener);

    addRecentGame('tilematch');
    addRecentGame('sliding');

    const recent = getRecentGames();
    expect(recent[0]).toBe('sliding');
    expect(recent[1]).toBe('tilematch');
    expect(eventFired).toBe(true);
    expect(eventDetail.games[0]).toBe('sliding');

    window.removeEventListener('recent_games_updated', listener);
  });
});
