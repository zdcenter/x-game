import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GameMode, GameDifficulty } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GAME_DEFINITIONS } from '../config/game-definitions';
import { isBrowser } from '../utils/browser.util';

export interface GameConfig {
  /** Unique game identifier, e.g. 'minesweeper', 'sudoku' */
  id: string;
  /** Route path, e.g. '/games/minesweeper' */
  route: string;
  /** i18n key for game title */
  titleKey: string;
  /** Emoji icon for display */
  iconEmoji: string;
  /** Available PK modes */
  modes: GameMode[];
  /** Available difficulty levels */
  difficulties: GameDifficulty[];
  /** Recommended games to show on the result screen */
  recommendations?: string[];
  /** Whether this game's engine supports multi-round PK series (Wins tracking). */
  multiRound?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GameRegistryService {
  private registry = new Map<string, GameConfig>();

  constructor(private http: HttpClient) {
    // Eagerly register TS seed data — SSR-safe, synchronous
    GAME_DEFINITIONS.forEach(config => this.register(config));
  }

  /**
   * Fetch DB config and merge over TS defaults (browser only).
   * Called via APP_INITIALIZER so data is ready before first render.
   * Silently falls back to TS seed if the request fails.
   */
  loadFromDB(): Promise<void> {
    if (!isBrowser()) return Promise.resolve();
    return firstValueFrom(
      this.http.get<{ id: string; config: string }[]>('/api/v1/games/meta')
    ).then(rows => {
      rows.forEach(row => {
        const meta = JSON.parse(row.config || '{}');
        const entry = this.registry.get(row.id);
        if (!entry) return;
        if (meta.icon)                  entry.iconEmoji = meta.icon;
        if (meta.modes?.length)         entry.modes = meta.modes;
        if (meta.difficulties?.length)  entry.difficulties = meta.difficulties;
        if (meta.multiRound != null)    entry.multiRound = meta.multiRound;
      });
    }).catch(() => {});
  }

  /**
   * Register a game's metadata. Safe to call multiple times (idempotent).
   */
  register(config: GameConfig): void {
    this.registry.set(config.id, config);
  }

  /**
   * Get config for a specific game.
   */
  getConfig(gameId: string): GameConfig | undefined {
    return this.registry.get(gameId);
  }

  /**
   * Get all registered games.
   */
  getAllConfigs(): GameConfig[] {
    return Array.from(this.registry.values());
  }

  /**
   * Look up a mode label for ANY registered game.
   * Useful for cross-game room display in the lobby panel.
   */
  getModeLabel(gameId: string, modeId: string): string | undefined {
    const config = this.registry.get(gameId);
    if (!config) return undefined;
    const mode = config.modes.find(m => m.id === modeId);
    return mode?.labelKey;
  }

  /**
   * Look up a difficulty label for ANY registered game.
   */
  getDifficultyLabel(gameId: string, diffId: string): string | undefined {
    const config = this.registry.get(gameId);
    if (!config) return undefined;
    const diff = config.difficulties.find(d => d.id === diffId);
    return diff?.labelKey;
  }
}
