import { coreTranslations } from './core.translations';
import { minesweeperTranslations } from '../../features/games/minesweeper/i18n/minesweeper.translations';
import { sudokuTranslations } from '../../features/games/sudoku/i18n/sudoku.translations';
import { slidingTranslations } from '../../features/games/sliding/i18n/sliding.translations';
import { hexaTranslations } from '../../features/games/hexa/i18n/hexa.translations';
import { tetrisTranslations } from '../../features/games/tetris/i18n/tetris.translations';
import { gomokuTranslations } from '../../features/games/gomoku/i18n/gomoku.translations';
import { codebreakerTranslations } from '../../features/games/codebreaker/i18n/codebreaker.translations';
// Game translation registry — add new game translations here
const gameTranslations = [
    minesweeperTranslations,
    sudokuTranslations,
    slidingTranslations,
    hexaTranslations,
    tetrisTranslations,
    gomokuTranslations,
    codebreakerTranslations,
];
// Auto-merge core + all game translations
export const TRANSLATIONS = {
    en: Object.assign({}, coreTranslations['en'], ...gameTranslations.map(t => t['en'])),
    zh: Object.assign({}, coreTranslations['zh'], ...gameTranslations.map(t => t['zh'])),
};
