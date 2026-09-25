import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ToastService } from './toast.service';
import { GameRegistryService } from './game-registry.service';
import { getOrigin } from '../utils/browser.util';

export interface TextShareData {
  gameId: string;
  isWin: boolean;
  stats?: { icon?: string; label?: string; value: string | number }[];
  /** Extra game-specific data for richer text cards */
  extras?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class TextShareService {
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private gameRegistry = inject(GameRegistryService);

  /**
   * Generate a Wordle-style emoji text card and copy to clipboard.
   * Returns the generated text.
   */
  async copyTextCard(data: TextShareData): Promise<string> {
    const text = this.generateTextCard(data);
    await this.copyToClipboard(text);
    return text;
  }

  /**
   * Generate the emoji text card string.
   */
  generateTextCard(data: TextShareData): string {
    const config = this.gameRegistry.getConfig(data.gameId);
    const emoji = config?.iconEmoji || '🧩';
    const gameName = config ? this.i18n.t(config.titleKey)() : data.gameId;
    const lang = this.i18n.currentLang();
    const origin = getOrigin() || 'https://www.puzzlepk.com';
    const url = `${origin}/${lang}/games/${data.gameId}`;

    const lines: string[] = [];

    // Header line
    lines.push(`${emoji} ${gameName} | Puzzle PK`);

    // Stats line
    if (data.stats && data.stats.length > 0) {
      const statsStr = data.stats
        .map(s => `${s.icon || ''} ${s.value}`)
        .join('  ');
      lines.push(statsStr);
    }

    // Result line
    const resultEmoji = data.isWin ? '✅' : '❌';
    const resultText = data.isWin
      ? (this.i18n.t('text_share.win')() || 'Solved!')
      : (this.i18n.t('text_share.lose')() || 'Game Over');
    lines.push(`${resultEmoji} ${resultText}`);

    // Game-specific visual block (compact emoji grid)
    const visualBlock = this.generateVisualBlock(data);
    if (visualBlock) {
      lines.push(visualBlock);
    }

    // URL
    lines.push(`👉 ${url}`);

    return lines.join('\n');
  }

  /**
   * Generate a game-specific visual emoji block.
   */
  private generateVisualBlock(data: TextShareData): string | null {
    const extras = data.extras || {};

    switch (data.gameId) {
      case 'minesweeper':
        return this.minesweeperBlock(data, extras);
      case 'sudoku':
        return this.sudokuBlock(data, extras);
      case 'classic2048':
        return this.block2048(data, extras);
      case 'nonogram':
        return this.nonogramBlock(data, extras);
      case 'tetris':
        return this.tetrisBlock(data, extras);
      case 'block':
        return this.blockPuzzleBlock(data, extras);
      case 'watersort':
        return this.watersortBlock(data, extras);
      default:
        return this.genericBlock(data);
    }
  }

  private minesweeperBlock(data: TextShareData, extras: Record<string, any>): string {
    if (!data.isWin) return '💥 BOOM!';
    const mines = extras['mines'] || '?';
    const hints = extras['hints'] || 0;
    const lines = ['🚩 ' + mines + ' mines cleared'];
    if (hints === 0) lines.push('🧠 No hints used!');
    return lines.join('\n');
  }

  private sudokuBlock(data: TextShareData, extras: Record<string, any>): string {
    const hints = extras['hints'] || 0;
    const difficulty = extras['difficulty'] || '';
    const lines: string[] = [];
    if (difficulty) lines.push(`⭐ ${difficulty}`);
    if (hints === 0) {
      lines.push('🧠 No hints used!');
    } else {
      lines.push(`💡 ${hints} hints`);
    }
    return lines.join('\n');
  }

  private block2048(data: TextShareData, extras: Record<string, any>): string {
    const score = extras['score'] || 0;
    const maxTile = extras['maxTile'] || 0;
    const tileEmoji = this.getTileEmoji(maxTile);
    return `🏆 ${score.toLocaleString()} pts\n📦 Max: ${tileEmoji} ${maxTile}`;
  }

  private nonogramBlock(data: TextShareData, extras: Record<string, any>): string {
    const size = extras['size'] || '';
    if (data.isWin) return `🎨 ${size} pixel art revealed!`;
    return `🎨 ${size}`;
  }

  private tetrisBlock(data: TextShareData, extras: Record<string, any>): string {
    const lines = extras['lines'] || 0;
    const level = extras['level'] || 1;
    return `📊 ${lines} lines | Lv.${level}`;
  }

  private blockPuzzleBlock(data: TextShareData, extras: Record<string, any>): string {
    const score = extras['score'] || 0;
    const combos = extras['combos'] || 0;
    const parts: string[] = [`📊 ${score.toLocaleString()} pts`];
    if (combos > 0) parts.push(`🔥 ${combos} combos`);
    return parts.join('\n');
  }

  private watersortBlock(data: TextShareData, extras: Record<string, any>): string {
    const moves = extras['moves'] || 0;
    if (data.isWin) return `🧪 Sorted in ${moves} moves!`;
    return `🧪 ${moves} moves`;
  }

  private genericBlock(data: TextShareData): string | null {
    // For games without custom blocks, generate a simple streak/result line
    if (data.isWin) {
      const streak = data.extras?.['streak'];
      if (streak && streak >= 3) {
        return `🔥 ${streak}-win streak!`;
      }
    }
    return null;
  }

  private getTileEmoji(tile: number): string {
    if (tile >= 2048) return '🟪';
    if (tile >= 1024) return '🟥';
    if (tile >= 512) return '🟧';
    if (tile >= 256) return '🟨';
    if (tile >= 128) return '🟩';
    if (tile >= 64) return '🟦';
    return '⬜';
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.toast.show(
        this.i18n.t('text_share.copied')() || '📋 Result copied! Paste it anywhere 🎉',
        'success'
      );
    } catch {
      this.toast.show('Failed to copy', 'error');
    }
  }
}
