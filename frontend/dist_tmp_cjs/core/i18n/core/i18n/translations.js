"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSLATIONS = void 0;
var core_translations_1 = require("./core.translations");
var minesweeper_translations_1 = require("../../features/games/minesweeper/i18n/minesweeper.translations");
var sudoku_translations_1 = require("../../features/games/sudoku/i18n/sudoku.translations");
var sliding_translations_1 = require("../../features/games/sliding/i18n/sliding.translations");
var hexa_translations_1 = require("../../features/games/hexa/i18n/hexa.translations");
var tetris_translations_1 = require("../../features/games/tetris/i18n/tetris.translations");
var gomoku_translations_1 = require("../../features/games/gomoku/i18n/gomoku.translations");
var codebreaker_translations_1 = require("../../features/games/codebreaker/i18n/codebreaker.translations");
var block_translations_1 = require("../../features/games/block/i18n/block.translations");
var watersort_translations_1 = require("../../features/games/watersort/i18n/watersort.translations");
// Game translation registry — add new game translations here
var gameTranslations = [
    minesweeper_translations_1.minesweeperTranslations,
    sudoku_translations_1.sudokuTranslations,
    sliding_translations_1.slidingTranslations,
    hexa_translations_1.hexaTranslations,
    tetris_translations_1.tetrisTranslations,
    gomoku_translations_1.gomokuTranslations,
    codebreaker_translations_1.codebreakerTranslations,
    block_translations_1.blockTranslations,
    watersort_translations_1.watersortTranslations,
];
// Auto-merge core + all game translations
exports.TRANSLATIONS = {
    en: Object.assign.apply(Object, __spreadArray([{}, core_translations_1.coreTranslations['en']], gameTranslations.map(function (t) { return t['en']; }), false)),
    zh: Object.assign.apply(Object, __spreadArray([{}, core_translations_1.coreTranslations['zh']], gameTranslations.map(function (t) { return t['zh']; }), false)),
};
