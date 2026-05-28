import { Injectable } from '@angular/core';
import { GameMode, GameDifficulty } from '../../shared/components/game-lobby-panel/game-lobby-panel.component';

/**
 * Central registry for all game metadata (modes, difficulties, routing info).
 * 
 * Each game module calls `register()` in its component constructor.
 * Shared components like GameLobbyPanel use `getConfig()` to look up labels
 * for ANY game — enabling proper cross-game room display.
 * 
 * Usage in a game component:
 *   constructor() {
 *     this.gameRegistry.register({
 *       id: 'minesweeper',
 *       route: '/games/minesweeper',
 *       titleKey: 'app.title',
 *       iconEmoji: '💣',
 *       modes: [...],
 *       difficulties: [...],
 *     });
 *   }
 */

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
}

@Injectable({ providedIn: 'root' })
export class GameRegistryService {
  private registry = new Map<string, GameConfig>();

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
