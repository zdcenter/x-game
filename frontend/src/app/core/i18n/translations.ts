import { coreTranslations } from './core.translations';
import { minesweeperTranslations } from '../../features/games/minesweeper/i18n/minesweeper.translations';
import { sudokuTranslations } from '../../features/games/sudoku/i18n/sudoku.translations';
import { slidingTranslations } from '../../features/games/sliding/i18n/sliding.translations';
import { hexaTranslations } from '../../features/games/hexa/i18n/hexa.translations';
import { tetrisTranslations } from '../../features/games/tetris/i18n/tetris.translations';

export type Lang = 'en' | 'zh';

// Game translation registry — add new game translations here
const gameTranslations: Record<Lang, Record<string, string>>[] = [
  minesweeperTranslations,
  sudokuTranslations,
  slidingTranslations,
  hexaTranslations,
  tetrisTranslations,
  // futureGameTranslations,  // ← 以后新游戏加一行就行
];

// Auto-merge core + all game translations
export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: Object.assign({}, coreTranslations['en'], ...gameTranslations.map(t => t['en'])),
  zh: Object.assign({}, coreTranslations['zh'], ...gameTranslations.map(t => t['zh'])),
};
