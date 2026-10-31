import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameMode, GameDifficulty } from '../models/game.model';
import { GAME_DEFINITIONS } from '../config/game-definitions';
import { isBrowser } from '../utils/browser.util';

export interface GameFinishFlowConfig {
  winAction?: 'modal' | 'auto_next';
  loseAction?: 'modal' | 'board_overlay' | 'auto_restart';
  autoNextAdFreq?: number; // -1: inherit global, 0: disabled, >0: custom
  autoNextDelayMs?: number; // default 1500
}

export interface GameModeConfig {
  id: string;
  labelKey: string;
  descKey?: string;
  desc?: string;
  icon?: string;
}

export interface GameDifficultyConfig {
  id: string;
  labelKey: string;
  descKey?: string;
  desc?: string;
}

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
  modes: GameModeConfig[];
  /** Available difficulty levels */
  difficulties: GameDifficultyConfig[];
  /** Recommended games to show on the result screen */
  recommendations?: string[];
  /** Whether this game's engine supports multi-round PK series (Wins tracking). */
  multiRound?: boolean;
  /** Custom open graph cover image (filename in assets or public folder) */
  coverImage?: string;
  /** Admin recommendation / pin priority (higher values appear first in lobby) */
  priority?: number;
  /** Visual badge status in lobby card: 'none' | 'pinned' | 'new' | 'hot' */
  badgeType?: 'none' | 'pinned' | 'new' | 'hot';
  /** Post-game finish flow orchestration (modal vs auto_next, in-board overlay, ad frequency) */
  finishFlow?: GameFinishFlowConfig;
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
      this.http.get<{ id: string; config: string }[]>(`${environment.apiUrl}/games/meta`)
    ).then(rows => {
      rows.forEach(row => {
        const meta = JSON.parse(row.config || '{}');
        const entry = this.registry.get(row.id);
        if (!entry) return;
        if (meta.icon)                  entry.iconEmoji = meta.icon;
        if (meta.modes?.length)         entry.modes = meta.modes;
        if (meta.difficulties?.length)  entry.difficulties = meta.difficulties;
        if (meta.multiRound != null)    entry.multiRound = meta.multiRound;
        if (meta.priority != null)      entry.priority = Number(meta.priority);
        if (meta.badgeType !== undefined) entry.badgeType = meta.badgeType;
        if (meta.finishFlow) {
          entry.finishFlow = { ...entry.finishFlow, ...meta.finishFlow };
        }
      });
    }).catch(() => {});
  }

  /**
   * Register a game's metadata. Safe to call multiple times (idempotent).
   * 黄金守卫 (Golden Guard): 强制防御性规范化，确保 modes 与 difficulties 绝非空数组，从根源杜绝未捕获异常。
   */
  register(config: GameConfig): void {
    if (!config.modes || config.modes.length === 0) {
      config.modes = [
        { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
        { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '⚡', desc: 'Speed PK' }
      ];
    }
    if (!config.difficulties || config.difficulties.length === 0) {
      config.difficulties = [
        { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_medium_desc', desc: 'Normal' }
      ];
    }
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
