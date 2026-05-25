import { coreTranslations } from './core.translations';
import { minesweeperTranslations } from '../../features/games/minesweeper/i18n/minesweeper.translations';

export type Lang = 'en' | 'zh';

// Central Registry: Merge core and feature translations
export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    ...coreTranslations['en'],
    ...minesweeperTranslations['en'],
  },
  zh: {
    ...coreTranslations['zh'],
    ...minesweeperTranslations['zh'],
  }
};
