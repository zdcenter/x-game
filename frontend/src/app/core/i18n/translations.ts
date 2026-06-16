import { coreTranslations } from './core.translations';
import { retentionTranslations } from './retention.translations';
import { minesweeperTranslations } from '../../features/games/minesweeper/i18n/minesweeper.translations';
import { sudokuTranslations } from '../../features/games/sudoku/i18n/sudoku.translations';
import { slidingTranslations } from '../../features/games/sliding/i18n/sliding.translations';
import { hexaTranslations } from '../../features/games/hexa/i18n/hexa.translations';
import { tetrisTranslations } from '../../features/games/tetris/i18n/tetris.translations';
import { gomokuTranslations } from '../../features/games/gomoku/i18n/gomoku.translations';
import { codebreakerTranslations } from '../../features/games/codebreaker/i18n/codebreaker.translations';
import { blockTranslations } from '../../features/games/block/i18n/block.translations';
import { watersortTranslations } from '../../features/games/watersort/i18n/watersort.translations';

export type Lang = 'en' | 'zh';

// Game translation registry — add new game translations here
const gameTranslations: Record<Lang, Record<string, string>>[] = [
  minesweeperTranslations,
  sudokuTranslations,
  slidingTranslations,
  hexaTranslations,
  tetrisTranslations,
  gomokuTranslations,
  codebreakerTranslations,
  blockTranslations,
  watersortTranslations,
];

// Auto-merge core + retention + all game translations
export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: Object.assign({}, coreTranslations['en'], retentionTranslations['en'], ...gameTranslations.map(t => t['en'])),
  zh: Object.assign({}, coreTranslations['zh'], retentionTranslations['zh'], ...gameTranslations.map(t => t['zh'])),
};
