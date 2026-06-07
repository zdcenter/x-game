"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSLATIONS = void 0;
const core_translations_1 = require("./core.translations");
const minesweeper_translations_1 = require("../../features/games/minesweeper/i18n/minesweeper.translations");
const sudoku_translations_1 = require("../../features/games/sudoku/i18n/sudoku.translations");
const sliding_translations_1 = require("../../features/games/sliding/i18n/sliding.translations");
const hexa_translations_1 = require("../../features/games/hexa/i18n/hexa.translations");
const tetris_translations_1 = require("../../features/games/tetris/i18n/tetris.translations");
const gomoku_translations_1 = require("../../features/games/gomoku/i18n/gomoku.translations");
const codebreaker_translations_1 = require("../../features/games/codebreaker/i18n/codebreaker.translations");
// Game translation registry — add new game translations here
const gameTranslations = [
    minesweeper_translations_1.minesweeperTranslations,
    sudoku_translations_1.sudokuTranslations,
    sliding_translations_1.slidingTranslations,
    hexa_translations_1.hexaTranslations,
    tetris_translations_1.tetrisTranslations,
    gomoku_translations_1.gomokuTranslations,
    codebreaker_translations_1.codebreakerTranslations,
];
// Auto-merge core + all game translations
exports.TRANSLATIONS = {
    en: Object.assign({}, core_translations_1.coreTranslations['en'], ...gameTranslations.map(t => t['en'])),
    zh: Object.assign({}, core_translations_1.coreTranslations['zh'], ...gameTranslations.map(t => t['zh'])),
};
